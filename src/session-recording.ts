import { AnalyticsConfig } from "./types";

// rrweb types
export interface RRWebEvent {
  type: number;
  data: any;
  timestamp: number;
  delay?: number;
}

export interface RecordOptions {
  emit?: (event: RRWebEvent, isCheckout?: boolean) => void;
  checkoutEveryNms?: number;
  blockClass?: string | RegExp;
  ignoreClass?: string;
  maskAllInputs?: boolean;
  maskTextClass?: string | RegExp;
  inlineStylesheet?: boolean;
  collectFonts?: boolean;
  sampling?: {
    mousemove?: boolean | number;
    mouseInteraction?: boolean | number;
    scroll?: number;
    input?: "last" | number;
  };
}

export interface RecordingConfig {
  maxDuration?: number; // Maximum duration in milliseconds (default: 5 minutes)
  checkoutEveryNms?: number; // Take a full snapshot every N milliseconds (default: 30 seconds)
  blockClass?: string; // CSS class to block from recording
  ignoreClass?: string; // CSS class to ignore
  maskAllInputs?: boolean; // Mask all input values
  maskTextClass?: string; // CSS class to mask text
  inlineStylesheet?: boolean; // Inline stylesheet
  collectFonts?: boolean; // Collect fonts
  sampling?: {
    mousemove?: boolean | number; // Sample mousemove events
    mouseInteraction?: boolean | Record<string, boolean | undefined>; // Sample mouse interactions
    scroll?: number; // Sample scroll events (ms)
    input?: "last" | "all"; // Sample input events
  };
}

export class SessionRecorder {
  private config: AnalyticsConfig;
  private recordingConfig: RecordingConfig;
  private stopRecording?: () => void;
  private events: RRWebEvent[] = [];
  private allEvents: RRWebEvent[] = []; // Keep all events for final upload
  private uploadedEventCount: number = 0; // Track how many events we've uploaded
  private sessionId: string;
  private isRecording: boolean = false;
  private uploadInterval?: NodeJS.Timeout;
  private recordingStartTime?: number;
  private firstEventTimestamp?: number; // Track first event for duration calculation

  constructor(
    config: AnalyticsConfig,
    sessionId: string,
    recordingConfig?: RecordingConfig
  ) {
    this.config = config;
    this.sessionId = sessionId;
    this.recordingConfig = {
      maxDuration: recordingConfig?.maxDuration || 5 * 60 * 1000, // 5 minutes
      checkoutEveryNms: recordingConfig?.checkoutEveryNms || 30 * 1000, // 30 seconds
      blockClass: recordingConfig?.blockClass || "mentiq-block",
      ignoreClass: recordingConfig?.ignoreClass || "mentiq-ignore",
      maskAllInputs:
        recordingConfig?.maskAllInputs !== undefined
          ? recordingConfig.maskAllInputs
          : true,
      maskTextClass: recordingConfig?.maskTextClass || "mentiq-mask",
      inlineStylesheet:
        recordingConfig?.inlineStylesheet !== undefined
          ? recordingConfig.inlineStylesheet
          : true,
      collectFonts:
        recordingConfig?.collectFonts !== undefined
          ? recordingConfig.collectFonts
          : true,
      sampling: recordingConfig?.sampling || {
        mousemove: 50, // Sample every 50ms
        mouseInteraction: true,
        scroll: 150, // Sample every 150ms
        input: "last", // Only record last input value
      },
    };
  }

  start(): void {
    if (this.isRecording) {
      if (this.config.debug) {
        console.warn("Session recording is already active");
      }
      return;
    }

    if (typeof window === "undefined") {
      if (this.config.debug) {
        console.warn(
          "Session recording is only available in browser environments"
        );
      }
      return;
    }

    try {
      this.events = [];
      this.allEvents = [];
      this.uploadedEventCount = 0;
      this.firstEventTimestamp = undefined;
      this.recordingStartTime = Date.now();
      this.isRecording = true;

      // Dynamically import rrweb
      import("rrweb")
        .then(({ record }) => {
          // Start recording with rrweb
          this.stopRecording = record({
            emit: (event: RRWebEvent) => {
              this.events.push(event);
              this.allEvents.push(event);

              // Track first event timestamp for accurate duration calculation
              if (!this.firstEventTimestamp && event.timestamp) {
                this.firstEventTimestamp = event.timestamp;
              }

              // Check if we've exceeded max duration
              if (
                this.recordingStartTime &&
                Date.now() - this.recordingStartTime >
                  (this.recordingConfig.maxDuration || 300000)
              ) {
                this.stop();
              }
            },
            checkoutEveryNms: this.recordingConfig.checkoutEveryNms,
            blockClass: this.recordingConfig.blockClass,
            ignoreClass: this.recordingConfig.ignoreClass,
            maskAllInputs: this.recordingConfig.maskAllInputs,
            maskTextClass: this.recordingConfig.maskTextClass,
            inlineStylesheet: this.recordingConfig.inlineStylesheet,
            collectFonts: this.recordingConfig.collectFonts,
            sampling: this.recordingConfig.sampling,
          });

          // Setup periodic upload every 10 seconds
          this.uploadInterval = setInterval(() => {
            this.uploadRecording();
          }, 10000);

          if (this.config.debug) {
            console.log("Session recording started", {
              sessionId: this.sessionId,
            });
          }
        })
        .catch((error) => {
          this.isRecording = false;
          if (this.config.debug) {
            console.error("Failed to load rrweb:", error);
            console.warn("Please install rrweb: npm install rrweb");
          }
        });
    } catch (error) {
      this.isRecording = false;
      if (this.config.debug) {
        console.error("Failed to start session recording:", error);
      }
    }
  }

  stop(): void {
    if (!this.isRecording) {
      return;
    }

    try {
      // Stop the recording
      if (this.stopRecording) {
        this.stopRecording();
        this.stopRecording = undefined;
      }

      // Clear upload interval
      if (this.uploadInterval) {
        clearInterval(this.uploadInterval);
        this.uploadInterval = undefined;
      }

      // Upload remaining events
      this.uploadRecording(true);

      this.isRecording = false;
      this.recordingStartTime = undefined;
      // Note: Don't clear allEvents here in case upload is async

      if (this.config.debug) {
        console.log("Session recording stopped", { sessionId: this.sessionId });
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("Failed to stop session recording:", error);
      }
    }
  }

  private async uploadRecording(isFinal: boolean = false): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    // Get only new events that haven't been uploaded yet
    const eventsToUpload = [...this.events];

    try {
      const endpoint = `${
        this.config.endpoint || "https://api.mentiq.io"
      }/api/v1/sessions/${this.sessionId}/recordings`;

      // Calculate duration from actual event timestamps (in milliseconds)
      let durationMs = 0;
      if (this.allEvents.length > 0) {
        const firstTimestamp = this.firstEventTimestamp || this.allEvents[0].timestamp;
        const lastTimestamp = this.allEvents[this.allEvents.length - 1].timestamp;
        durationMs = lastTimestamp - firstTimestamp;
      }
      const duration = Math.max(1, Math.floor(durationMs / 1000)); // At least 1 second

      // Get start URL (current or initial page)
      const startUrl =
        typeof window !== "undefined" ? window.location.href : "";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `ApiKey ${this.config.apiKey}`,
          "X-Project-ID": this.config.projectId,
        },
        body: JSON.stringify({
          events: eventsToUpload,
          duration: duration,
          start_url: startUrl,
          user_id: this.config.userId || null,
          is_final: isFinal,
          event_offset: this.uploadedEventCount, // Tell backend where to append
        }),
      });

      if (!response.ok) {
        // If upload fails, keep events for retry
        if (this.config.debug) {
          console.error("Failed to upload recording:", response.statusText);
        }
      } else {
        // Upload successful - clear the pending events and update counter
        this.uploadedEventCount += eventsToUpload.length;
        this.events = [];

        if (this.config.debug) {
          console.log("Recording uploaded successfully", {
            eventCount: eventsToUpload.length,
            totalUploaded: this.uploadedEventCount,
            totalRecorded: this.allEvents.length,
            duration: duration,
            isFinal,
          });
        }
      }
    } catch (error) {
      // If upload fails, keep events for retry
      if (this.config.debug) {
        console.error("Error uploading recording:", error);
      }
    }
  }

  pause(): void {
    if (!this.isRecording) {
      return;
    }

    if (this.stopRecording) {
      this.stopRecording();
      this.stopRecording = undefined;
    }

    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = undefined;
    }

    this.isRecording = false;

    if (this.config.debug) {
      console.log("Session recording paused");
    }
  }

  resume(): void {
    if (this.isRecording) {
      return;
    }

    this.start();

    if (this.config.debug) {
      console.log("Session recording resumed");
    }
  }

  isActive(): boolean {
    return this.isRecording;
  }

  getEventCount(): number {
    return this.events.length;
  }

  clearEvents(): void {
    this.events = [];
  }
}
