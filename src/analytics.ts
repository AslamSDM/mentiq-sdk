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
  detectChannel,
  getChannelFromUrl,
  getUserEmail,
} from "./utils";
import { SessionRecorder } from "./session-recording";

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
  private sessionRecorder?: SessionRecorder;
  private funnelState: Map<
    string,
    { currentStep: number; startTime: number; steps: string[] }
  > = new Map();
  private funnelAbandonmentTimer: Map<string, NodeJS.Timeout> = new Map();

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
    const channel = typeof window !== "undefined" ? detectChannel() : "direct";
    return {
      startTime: Date.now(),
      pageViews: 0,
      clicks: 0,
      scrollDepth: 0,
      maxScrollDepth: 0,
      isActive: true,
      events: [],
      scrollEvents: 0,
      clickEvents: 0,
      pageChanges: 0,
      engagementScore: 0,
      bounceLikelihood: 0,
      channel: channel,
    };
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Set initial user ID if provided
    if (this.config.userId) {
      setUserId(this.config.userId);
    }

    // Auto-detect email from auth session if available
    if (typeof window !== "undefined") {
      const detectedEmail = getUserEmail();
      if (detectedEmail && !localStorage.getItem("mentiq_user_email")) {
        // Store detected email for future use
        try {
          localStorage.setItem("mentiq_user_email", detectedEmail);
          if (this.config.debug) {
            console.log(
              "MentiQ: Auto-detected user email from auth session:",
              detectedEmail
            );
          }
        } catch (e) {
          console.warn("Failed to store auto-detected email", e);
        }
      }
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

    // Setup session recording
    if (this.config.enableSessionRecording && typeof window !== "undefined") {
      this.setupSessionRecording();
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

    // Track scroll depth and scroll events
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

      // Increment scroll events counter
      this.sessionData.scrollEvents = (this.sessionData.scrollEvents || 0) + 1;
    }, 1000);

    // Track click events for detailed metrics
    const trackClicks = (event: MouseEvent) => {
      this.sessionData.clickEvents = (this.sessionData.clickEvents || 0) + 1;
      this.sessionData.clicks = this.sessionData.clickEvents;
    };

    window.addEventListener("scroll", trackScrollDepth, { passive: true });
    window.addEventListener("click", trackClicks, { passive: true });

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

    // Update session page tracking
    this.sessionData.pageViews++;
    this.sessionData.pageChanges = (this.sessionData.pageChanges || 0) + 1;
  }

  public identify(
    userId: string,
    traits?: UserProperties & { email?: string }
  ): void {
    setUserId(userId);

    // Store email if provided
    if (traits?.email && typeof window !== "undefined") {
      try {
        localStorage.setItem("mentiq_user_email", traits.email);
      } catch (e) {
        console.warn("Failed to store user email", e);
      }
    }

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
        batches?.map((batch) =>
          Promise.all(
            this.providers?.map((provider) => this.sendBatch(provider, batch))
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

  public getActiveSession(): SessionData {
    return this.calculateDetailedSessionMetrics();
  }

  public calculateEngagementScore(): number {
    const {
      clicks,
      scrollDepth,
      duration,
      pageViews,
      clickEvents,
      scrollEvents,
    } = this.sessionData;

    // Calculate session duration in minutes
    const sessionDuration = duration
      ? duration / 1000 / 60
      : (Date.now() - this.sessionData.startTime) / 1000 / 60;

    // Weighted engagement score calculation
    let score = 0;

    // Click engagement (up to 25 points)
    const clickScore = Math.min((clickEvents || clicks) * 2, 25);
    score += clickScore;

    // Scroll engagement (up to 20 points)
    const scrollScore = Math.min(scrollDepth || 0, 20);
    score += scrollScore;

    // Time engagement (up to 30 points) - diminishing returns after 10 minutes
    const timeScore = Math.min(sessionDuration * 3, 30);
    score += timeScore;

    // Page view engagement (up to 20 points)
    const pageScore = Math.min((pageViews || 0) * 4, 20);
    score += pageScore;

    // Scroll event engagement (up to 5 points)
    const scrollEventScore = Math.min((scrollEvents || 0) * 0.5, 5);
    score += scrollEventScore;

    // Normalize to 0-100 scale
    const finalScore = Math.min(score, 100);

    // Update session data
    this.sessionData.engagementScore = finalScore;

    return finalScore;
  }

  private calculateDetailedSessionMetrics(): SessionData {
    const currentTime = Date.now();
    const duration = currentTime - this.sessionData.startTime;

    // Update detailed metrics
    const updatedSessionData = {
      ...this.sessionData,
      duration,
      endTime: this.sessionData.isActive ? undefined : currentTime,
      engagementScore: this.calculateEngagementScore(),
      bounceLikelihood: this.calculateBounceLikelihood(),
    };

    return updatedSessionData;
  }

  private calculateBounceLikelihood(): number {
    const { pageViews, clickEvents, scrollEvents, scrollDepth } =
      this.sessionData;
    const sessionDuration = (Date.now() - this.sessionData.startTime) / 1000; // in seconds

    // Factors that reduce bounce likelihood
    let bounceScore = 100; // Start with 100% bounce likelihood

    // Reduce bounce likelihood based on engagement
    if (pageViews > 1) bounceScore -= 30; // Multiple pages viewed
    if ((clickEvents || 0) > 3) bounceScore -= 20; // Multiple clicks
    if ((scrollEvents || 0) > 5) bounceScore -= 15; // Active scrolling
    if ((scrollDepth || 0) > 50) bounceScore -= 15; // Scrolled past 50%
    if (sessionDuration > 30) bounceScore -= 10; // Stayed more than 30 seconds
    if (sessionDuration > 120) bounceScore -= 10; // Stayed more than 2 minutes

    // Ensure bounce score is between 0 and 100
    bounceScore = Math.max(0, Math.min(100, bounceScore));

    // Update session data
    this.sessionData.bounceLikelihood = bounceScore;

    return bounceScore;
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

  public trackFeatureUsage(
    featureName: string,
    properties?: EventProperties
  ): void {
    this.track("feature_used", {
      feature_name: featureName,
      ...properties,
    });
  }

  public trackFunnelStep(
    funnelName: string,
    stepName: string,
    stepIndex: number,
    properties?: EventProperties
  ): void {
    this.track("funnel_step", {
      funnel_name: funnelName,
      step_name: stepName,
      step_index: stepIndex,
      ...properties,
    });
  }

  public completeFunnel(
    funnelName: string,
    properties?: EventProperties
  ): void {
    this.track("funnel_completed", {
      funnel_name: funnelName,
      ...properties,
    });

    // Clear funnel state on completion
    this.funnelState.delete(funnelName);
    const timer = this.funnelAbandonmentTimer.get(funnelName);
    if (timer) {
      clearTimeout(timer);
      this.funnelAbandonmentTimer.delete(funnelName);
    }
  }

  public startFunnel(funnelName: string, properties?: EventProperties): void {
    // Clear any existing funnel state
    this.clearFunnelState(funnelName);

    this.funnelState.set(funnelName, {
      currentStep: 0,
      startTime: Date.now(),
      steps: [],
    });

    this.trackFunnelStep(funnelName, "start", 0, properties);

    // Set abandonment timer (5 minutes default)
    const abandonmentTimeout = setTimeout(() => {
      this.abandonFunnel(funnelName, "timeout");
    }, 5 * 60 * 1000);

    this.funnelAbandonmentTimer.set(funnelName, abandonmentTimeout);

    if (this.config.debug) {
      console.log(`MentiQ Analytics: Funnel "${funnelName}" started`);
    }
  }

  public advanceFunnel(
    funnelName: string,
    stepName: string,
    properties?: EventProperties
  ): void {
    const state = this.funnelState.get(funnelName);
    if (!state) {
      if (this.config.debug) {
        console.warn(`Funnel ${funnelName} not started`);
      }
      return;
    }

    state.currentStep++;
    const timeInFunnel = Date.now() - state.startTime;

    // Add step to history
    state.steps.push(stepName);

    this.trackFunnelStep(funnelName, stepName, state.currentStep, {
      time_in_funnel: timeInFunnel,
      previous_step: state.steps[state.steps.length - 2] || "start",
      total_steps_completed: state.currentStep,
      ...properties,
    });

    // Reset abandonment timer
    this.resetAbandonmentTimer(funnelName);

    if (this.config.debug) {
      console.log(
        `MentiQ Analytics: Funnel "${funnelName}" advanced to step ${state.currentStep}: ${stepName}`
      );
    }
  }

  public abandonFunnel(
    funnelName: string,
    reason?: string,
    properties?: EventProperties
  ): void {
    const state = this.funnelState.get(funnelName);
    if (!state) return;

    const timeBeforeAbandon = Date.now() - state.startTime;

    this.track("funnel_abandoned", {
      funnel_name: funnelName,
      abandoned_at_step: state.currentStep,
      abandoned_step_name: state.steps[state.steps.length - 1] || "start",
      time_before_abandon: timeBeforeAbandon,
      abandon_reason: reason || "unknown",
      steps_completed_count: state.steps.length,
      steps_completed_names: state.steps.join(","),
      completion_percentage: this.calculateFunnelCompletion(
        funnelName,
        state.currentStep
      ),
      ...properties,
    });

    this.clearFunnelState(funnelName);

    if (this.config.debug) {
      console.log(
        `MentiQ Analytics: Funnel "${funnelName}" abandoned at step ${state.currentStep}, reason: ${reason}`
      );
    }
  }

  public getFunnelState(funnelName: string): any {
    const state = this.funnelState.get(funnelName);
    if (!state) return undefined;

    return {
      funnelName,
      currentStep: state.currentStep,
      startTime: state.startTime,
      steps: [...state.steps],
      isActive: true,
      timeInFunnel: Date.now() - state.startTime,
    };
  }

  private clearFunnelState(funnelName: string): void {
    this.funnelState.delete(funnelName);
    const timer = this.funnelAbandonmentTimer.get(funnelName);
    if (timer) {
      clearTimeout(timer);
      this.funnelAbandonmentTimer.delete(funnelName);
    }
  }

  private resetAbandonmentTimer(funnelName: string): void {
    const timer = this.funnelAbandonmentTimer.get(funnelName);
    if (timer) {
      clearTimeout(timer);
    }

    const newTimer = setTimeout(() => {
      this.abandonFunnel(funnelName, "timeout");
    }, 5 * 60 * 1000);

    this.funnelAbandonmentTimer.set(funnelName, newTimer);
  }

  private calculateFunnelCompletion(
    funnelName: string,
    currentStep: number
  ): number {
    // This could be enhanced to use predefined funnel definitions
    // For now, assume a typical funnel has 5 steps
    const typicalFunnelSteps = 5;
    return Math.min(100, (currentStep / typicalFunnelSteps) * 100);
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
      const backendEvents = batch?.map((queuedEvent) =>
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

  private setupSessionRecording(): void {
    if (typeof window === "undefined") return;

    try {
      this.sessionRecorder = new SessionRecorder(
        this.config,
        this.getSessionId()
      );

      // Auto-start recording if enabled
      this.sessionRecorder.start();

      if (this.config.debug) {
        console.log("Session recording initialized");
      }
    } catch (error) {
      if (this.config.debug) {
        console.error("Failed to initialize session recording:", error);
      }
    }
  }

  public startRecording(): void {
    if (!this.sessionRecorder) {
      if (typeof window !== "undefined") {
        this.sessionRecorder = new SessionRecorder(
          this.config,
          this.getSessionId()
        );
      } else {
        if (this.config.debug) {
          console.warn(
            "Session recording is only available in browser environments"
          );
        }
        return;
      }
    }
    this.sessionRecorder.start();
  }

  public stopRecording(): void {
    if (this.sessionRecorder) {
      this.sessionRecorder.stop();
    }
  }

  public pauseRecording(): void {
    if (this.sessionRecorder) {
      this.sessionRecorder.pause();
    }
  }

  public resumeRecording(): void {
    if (this.sessionRecorder) {
      this.sessionRecorder.resume();
    }
  }

  public isRecordingActive(): boolean {
    return this.sessionRecorder?.isActive() || false;
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

    // Stop session recording
    if (this.sessionRecorder) {
      this.sessionRecorder.stop();
    }

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
