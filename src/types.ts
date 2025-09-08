export interface AnalyticsConfig {
  apiKey: string;
  endpoint?: string;
  debug?: boolean;
  userId?: string;
  sessionTimeout?: number;
  batchSize?: number;
  flushInterval?: number;
  enableAutoPageTracking?: boolean;
  enablePerformanceTracking?: boolean;
  enableHeatmapTracking?: boolean;
  enableSessionRecording?: boolean;
  enableErrorTracking?: boolean;
  maxQueueSize?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface PageProperties {
  title?: string;
  url?: string;
  path?: string;
  referrer?: string;
  search?: string;
}

export interface UserProperties {
  [key: string]: string | number | boolean | null | undefined;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  type: "track" | "page" | "identify" | "alias" | "heatmap" | "session" | "error";
  event?: string;
  properties?: EventProperties;
  userId?: string;
  anonymousId: string;
  sessionId: string;
  context: {
    page?: PageProperties;
    userAgent?: string;
    timezone?: string;
    locale?: string;
    screen?: {
      width: number;
      height: number;
    };
    library: {
      name: string;
      version: string;
    };
    performance?: PerformanceData;
    heatmap?: HeatmapData;
    session?: SessionData;
    error?: ErrorData;
  };
}

export interface AnalyticsInstance {
  track: (event: string, properties?: EventProperties) => void;
  page: (properties?: PageProperties) => void;
  identify: (userId: string, traits?: UserProperties) => void;
  alias: (newId: string, previousId?: string) => void;
  reset: () => void;
  flush: () => Promise<void>;
  setUserId: (userId: string) => void;
  getUserId: () => string | null;
  getAnonymousId: () => string;
  getSessionId: () => string;
  getSessionData: () => SessionData;
  trackCustomError: (error: string | Error, properties?: EventProperties) => void;
  trackPerformance: (performanceData: PerformanceData) => void;
  getQueueSize: () => number;
  clearQueue: () => void;
}

export interface AnalyticsProvider {
  name: string;
  track: (event: AnalyticsEvent) => Promise<void>;
}

export interface HeatmapData {
  x: number;
  y: number;
  element?: string;
  selector?: string;
  action: 'click' | 'move' | 'scroll';
  viewport: {
    width: number;
    height: number;
  };
}

export interface SessionData {
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  clicks: number;
  scrollDepth: number;
  maxScrollDepth: number;
  isActive: boolean;
  events: string[];
}

export interface PerformanceData {
  loadTime?: number;
  domReady?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

export interface ErrorData {
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  type: 'javascript' | 'unhandledrejection' | 'network' | 'custom';
}

export interface QueuedEvent {
  event: AnalyticsEvent;
  retries: number;
  timestamp: number;
}
