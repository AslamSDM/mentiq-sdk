import {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsInstance,
  AnalyticsProvider,
  EventProperties,
  PageProperties,
  UserProperties,
  QueuedEvent,
  HeatmapData,
  SessionData,
  PerformanceData,
  ErrorData,
  BackendEvent,
} from "./types";
import {
  createEvent,
  getAnonymousId,
  getSessionId,
  getUserId,
  setUserId,
  clearUserId,
  debounce,
} from "./utils";

export class Analytics implements AnalyticsInstance {
  public config: AnalyticsConfig & {
    endpoint: string;
    debug: boolean;
    sessionTimeout: number;
    batchSize: number;
    flushInterval: number;
    enableAutoPageTracking: boolean;
    enablePerformanceTracking: boolean;
    enableHeatmapTracking: boolean;
    enableSessionRecording: boolean;
    enableErrorTracking: boolean;
    maxQueueSize: number;
    retryAttempts: number;
    retryDelay: number;
  };
  private eventQueue: QueuedEvent[] = [];
  private providers: AnalyticsProvider[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sessionTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private sessionData: SessionData;
  private heatmapListeners: (() => void)[] = [];
  private errorListeners: (() => void)[] = [];

  constructor(config: AnalyticsConfig) {
    this.config = {
      ...config,
      endpoint: config.endpoint || "https://api.mentiq.io",
      debug: config.debug || false,
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      batchSize: config.batchSize || 20,
      flushInterval: config.flushInterval || 10000, // 10 seconds
      enableAutoPageTracking: config.enableAutoPageTracking !== false,
      enablePerformanceTracking: config.enablePerformanceTracking || false,
      enableHeatmapTracking: config.enableHeatmapTracking || false,
      enableSessionRecording: config.enableSessionRecording || false,
      enableErrorTracking: config.enableErrorTracking || false,
      maxQueueSize: config.maxQueueSize || 1000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.sessionData = this.initializeSession();
    this.initialize();
  }

  private initializeSession(): SessionData {
    return {
      startTime: Date.now(),
      pageViews: 0,
      clicks: 0,
      scrollDepth: 0,
      maxScrollDepth: 0,
      isActive: true,
      events: [],
    };
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Set initial user ID if provided
    if (this.config.userId) {
      setUserId(this.config.userId);
    }

    // Add default provider
    this.addProvider({
      name: "default",
      track: this.sendEvent.bind(this),
    });

    // Setup auto flush
    this.setupAutoFlush();

    // Setup session tracking
    this.setupSessionTracking();

    // Setup auto page tracking
    if (this.config.enableAutoPageTracking && typeof window !== "undefined") {
      this.setupAutoPageTracking();
    }

    // Setup performance tracking
    if (
      this.config.enablePerformanceTracking &&
      typeof window !== "undefined"
    ) {
      this.setupPerformanceTracking();
    }

    // Setup heatmap tracking
    if (this.config.enableHeatmapTracking && typeof window !== "undefined") {
      this.setupHeatmapTracking();
    }

    // Setup error tracking
    if (this.config.enableErrorTracking && typeof window !== "undefined") {
      this.setupErrorTracking();
    }

    this.isInitialized = true;

    if (this.config.debug) {
      console.log("MentiQ Analytics initialized", this.config);
    }
  }

  private setupSessionTracking(): void {
    if (typeof window === "undefined") return;

    // Track session activity
    const updateSession = () => {
      this.sessionData.isActive = true;
      this.sessionData.endTime = Date.now();
      this.sessionData.duration =
        this.sessionData.endTime - this.sessionData.startTime;

      // Reset session timeout
      if (this.sessionTimer) {
        clearTimeout(this.sessionTimer);
      }

      this.sessionTimer = setTimeout(() => {
        this.endSession();
      }, this.config.sessionTimeout);
    };

    // Track user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => {
      window.addEventListener(event, updateSession, { passive: true });
    });

    // Track scroll depth
    const trackScrollDepth = debounce(() => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollDepth = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      this.sessionData.scrollDepth = scrollDepth;
      this.sessionData.maxScrollDepth = Math.max(
        this.sessionData.maxScrollDepth,
        scrollDepth
      );
    }, 1000);

    window.addEventListener("scroll", trackScrollDepth, { passive: true });

    // Initialize session timer
    updateSession();
  }

  private setupHeatmapTracking(): void {
    if (typeof window === "undefined") return;

    const trackClick = (event: MouseEvent) => {
      const heatmapData: HeatmapData = {
        x: event.clientX,
        y: event.clientY,
        element: (event.target as HTMLElement)?.tagName?.toLowerCase(),
        selector: this.getElementSelector(event.target as HTMLElement),
        action: "click",
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };

      const analyticsEvent = createEvent("heatmap", "click", {
        heatmap: heatmapData,
      });
      this.enqueueEvent(analyticsEvent);
      this.sessionData.clicks++;
    };

    const trackMouseMove = debounce((event: MouseEvent) => {
      const heatmapData: HeatmapData = {
        x: event.clientX,
        y: event.clientY,
        element: (event.target as HTMLElement)?.tagName?.toLowerCase(),
        selector: this.getElementSelector(event.target as HTMLElement),
        action: "move",
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };

      const analyticsEvent = createEvent("heatmap", "mouse_move", {
        heatmap: heatmapData,
      });
      this.enqueueEvent(analyticsEvent);
    }, 500);

    const trackScroll = debounce(() => {
      const heatmapData: HeatmapData = {
        x: window.pageXOffset,
        y: window.pageYOffset,
        action: "scroll",
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };

      const analyticsEvent = createEvent("heatmap", "scroll", {
        heatmap: heatmapData,
      });
      this.enqueueEvent(analyticsEvent);
    }, 1000);

    window.addEventListener("click", trackClick);
    window.addEventListener("mousemove", trackMouseMove, { passive: true });
    window.addEventListener("scroll", trackScroll, { passive: true });

    // Store listeners for cleanup
    this.heatmapListeners.push(
      () => window.removeEventListener("click", trackClick),
      () => window.removeEventListener("mousemove", trackMouseMove),
      () => window.removeEventListener("scroll", trackScroll)
    );
  }

  private setupErrorTracking(): void {
    if (typeof window === "undefined") return;

    const trackJavaScriptError = (event: ErrorEvent) => {
      const errorData: ErrorData = {
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: "javascript",
      };

      const analyticsEvent = createEvent("error", "javascript_error", {
        error: errorData,
      });
      this.enqueueEvent(analyticsEvent);
    };

    const trackUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorData: ErrorData = {
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        type: "unhandledrejection",
      };

      const analyticsEvent = createEvent("error", "unhandled_rejection", {
        error: errorData,
      });
      this.enqueueEvent(analyticsEvent);
    };

    window.addEventListener("error", trackJavaScriptError);
    window.addEventListener("unhandledrejection", trackUnhandledRejection);

    // Store listeners for cleanup
    this.errorListeners.push(
      () => window.removeEventListener("error", trackJavaScriptError),
      () =>
        window.removeEventListener(
          "unhandledrejection",
          trackUnhandledRejection
        )
    );
  }

  private getElementSelector(element: HTMLElement): string {
    if (!element) return "";

    const id = element.id ? `#${element.id}` : "";
    const className = element.className
      ? `.${element.className.split(" ").join(".")}`
      : "";
    const tagName = element.tagName.toLowerCase();

    return `${tagName}${id}${className}`;
  }

  private endSession(): void {
    this.sessionData.isActive = false;
    this.sessionData.endTime = Date.now();
    this.sessionData.duration =
      this.sessionData.endTime - this.sessionData.startTime;

    // Send session data
    const analyticsEvent = createEvent("session", "session_end", {
      session: this.sessionData,
    });
    this.enqueueEvent(analyticsEvent);

    // Start new session
    this.sessionData = this.initializeSession();
  }

  private setupAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  private setupAutoPageTracking(): void {
    // Track initial page load
    this.page();

    // Track pushState/replaceState navigation (SPA)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      setTimeout(() => this.page(), 0);
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      setTimeout(() => this.page(), 0);
    };

    // Track popstate (back/forward navigation)
    window.addEventListener("popstate", () => {
      setTimeout(() => this.page(), 0);
    });
  }

  private setupPerformanceTracking(): void {
    if ("performance" in window && "getEntriesByType" in performance) {
      window.addEventListener("load", () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType(
            "navigation"
          )[0] as PerformanceNavigationTiming;
          if (navigation) {
            this.track("page_performance", {
              load_time: navigation.loadEventEnd - navigation.fetchStart,
              dom_ready:
                navigation.domContentLoadedEventEnd - navigation.fetchStart,
              first_byte: navigation.responseStart - navigation.fetchStart,
              dns_lookup:
                navigation.domainLookupEnd - navigation.domainLookupStart,
            });
          }
        }, 0);
      });
    }
  }

  public addProvider(provider: AnalyticsProvider): void {
    this.providers.push(provider);
  }

  public track(event: string, properties?: EventProperties): void {
    const analyticsEvent = createEvent("track", event, properties);
    this.enqueueEvent(analyticsEvent);
  }

  public page(properties?: PageProperties): void {
    const analyticsEvent = createEvent("page", undefined, properties);
    this.enqueueEvent(analyticsEvent);
  }

  public identify(userId: string, traits?: UserProperties): void {
    setUserId(userId);
    const analyticsEvent = createEvent("identify", undefined, traits);
    this.enqueueEvent(analyticsEvent);
  }

  public alias(newId: string, previousId?: string): void {
    const analyticsEvent = createEvent("alias", undefined, {
      newId,
      previousId: previousId || getUserId(),
    });
    this.enqueueEvent(analyticsEvent);
  }

  public reset(): void {
    clearUserId();
    this.eventQueue = [];
    if (this.config.debug) {
      console.log("MentiQ Analytics reset");
    }
  }

  public async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    const batches = this.createBatches(events);

    try {
      await Promise.all(
        batches.map((batch) =>
          Promise.all(
            this.providers.map((provider) => this.sendBatch(provider, batch))
          )
        )
      );

      if (this.config.debug) {
        console.log("MentiQ Analytics flushed", events.length, "events");
      }
    } catch (error) {
      // Re-queue events on failure (they're already handled in sendBatch)
      if (this.config.debug) {
        console.error("MentiQ Analytics flush failed:", error);
      }

      throw error;
    }
  }

  public setUserId(userId: string): void {
    setUserId(userId);
  }

  public getUserId(): string | null {
    return getUserId();
  }

  public getAnonymousId(): string {
    return getAnonymousId();
  }

  public getSessionId(): string {
    return getSessionId();
  }

  public getSessionData(): SessionData {
    return { ...this.sessionData };
  }

  public trackCustomError(
    error: string | Error,
    properties?: EventProperties
  ): void {
    const errorData: ErrorData = {
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "object" ? error.stack : undefined,
      type: "custom",
    };

    const analyticsEvent = createEvent("error", "custom_error", {
      error: errorData,
      ...properties,
    });
    this.enqueueEvent(analyticsEvent);
  }

  public trackPerformance(performanceData: PerformanceData): void {
    const analyticsEvent = createEvent("track", "performance", {
      performance: performanceData,
    });
    this.enqueueEvent(analyticsEvent);
  }

  public getQueueSize(): number {
    return this.eventQueue.length;
  }

  public clearQueue(): void {
    this.eventQueue = [];
  }

  private enqueueEvent(event: AnalyticsEvent): void {
    // Check queue size limit
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      // Remove oldest events
      this.eventQueue.splice(
        0,
        this.eventQueue.length - this.config.maxQueueSize + 1
      );
    }

    const queuedEvent: QueuedEvent = {
      event,
      retries: 0,
      timestamp: Date.now(),
    };

    this.eventQueue.push(queuedEvent);

    if (this.config.debug) {
      console.log("MentiQ Analytics event queued:", event);
    }

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private createBatches(events: QueuedEvent[]): QueuedEvent[][] {
    const batches: QueuedEvent[][] = [];
    for (let i = 0; i < events.length; i += this.config.batchSize) {
      batches.push(events.slice(i, i + this.config.batchSize));
    }
    return batches;
  }

  private async sendBatch(
    provider: AnalyticsProvider,
    batch: QueuedEvent[]
  ): Promise<void> {
    const failedEvents: QueuedEvent[] = [];

    // For our backend, we'll send the batch as a single request instead of individual events
    try {
      const backendEvents = batch.map((queuedEvent) =>
        this.transformEventForBackend(queuedEvent.event)
      );

      const response = await fetch(
        `${this.config.endpoint}/api/v1/events/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `ApiKey ${this.config.apiKey}`,
            "X-Project-ID": this.config.projectId,
          },
          body: JSON.stringify(backendEvents),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // If batch succeeds, all events are processed
      return;
    } catch (error) {
      // If batch fails, mark all events for retry
      for (const queuedEvent of batch) {
        queuedEvent.retries++;
        if (queuedEvent.retries < this.config.retryAttempts) {
          failedEvents.push(queuedEvent);
        }
      }

      if (this.config.debug) {
        console.error("MentiQ Analytics batch send error:", error);
      }
    }

    // Re-queue failed events with exponential backoff
    if (failedEvents.length > 0) {
      setTimeout(() => {
        this.eventQueue.unshift(...failedEvents);
      }, this.config.retryDelay * Math.pow(2, failedEvents[0]?.retries || 0));
    }
  }

  private transformEventForBackend(event: AnalyticsEvent): BackendEvent {
    // Map internal event types to backend event types
    const eventTypeMap: Record<string, string> = {
      track: event.event || "custom_event",
      page: "page_view",
      identify: "user_identify",
      alias: "user_alias",
      heatmap: "heatmap_click",
      session: "session_update",
      error: "error_event",
    };

    // For track events, use common event names
    let eventType = eventTypeMap[event.type] || "custom_event";

    // Map common track event names to backend expected names
    if (event.type === "track" && event.event) {
      const trackEventMap: Record<string, string> = {
        element_clicked: "click",
        element_viewed: "view",
        element_hovered: "hover",
        button_clicked: "click",
        link_clicked: "click",
        form_submitted: "form_submit",
        video_played: "video_play",
        video_paused: "video_pause",
        download: "file_download",
        signup: "user_signup",
        login: "user_login",
        logout: "user_logout",
        purchase: "purchase",
        add_to_cart: "cart_add",
        remove_from_cart: "cart_remove",
      };

      eventType = trackEventMap[event.event] || event.event;
    }

    const backendEvent: BackendEvent = {
      event_id: event.id,
      event_type: eventType,
      user_id: event.userId,
      session_id: event.sessionId,
      timestamp: new Date(event.timestamp).toISOString(),
      properties: {
        ...event.properties,
        // Include context data in properties for the backend (serialized)
        ...(event.context.page && { page: JSON.stringify(event.context.page) }),
        ...(event.context.screen && {
          screen: JSON.stringify(event.context.screen),
        }),
        ...(event.context.performance && {
          performance: JSON.stringify(event.context.performance),
        }),
        ...(event.context.heatmap && {
          heatmap: JSON.stringify(event.context.heatmap),
        }),
        ...(event.context.session && {
          session: JSON.stringify(event.context.session),
        }),
        ...(event.context.error && {
          error: JSON.stringify(event.context.error),
        }),
        library: JSON.stringify(event.context.library),
        timezone: event.context.timezone,
        locale: event.context.locale,
      },
      user_agent: event.context.userAgent,
    };

    return backendEvent;
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const backendEvent = this.transformEventForBackend(event);
      const response = await fetch(`${this.config.endpoint}/api/v1/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `ApiKey ${this.config.apiKey}`,
          "X-Project-ID": this.config.projectId,
        },
        body: JSON.stringify(backendEvent),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("MentiQ Analytics send error:", error);
      }
      throw error;
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }

    // Clean up heatmap listeners
    this.heatmapListeners.forEach((cleanup) => cleanup());
    this.heatmapListeners = [];

    // Clean up error listeners
    this.errorListeners.forEach((cleanup) => cleanup());
    this.errorListeners = [];

    // End current session
    if (this.sessionData.isActive) {
      this.endSession();
    }

    // Flush remaining events
    this.flush().catch(() => {
      // Ignore flush errors on destroy
    });

    this.isInitialized = false;
  }
}
