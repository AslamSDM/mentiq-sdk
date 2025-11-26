export interface AnalyticsConfig {
  apiKey: string;
  projectId: string;
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
  // A/B Testing
  enableABTesting?: boolean;
  abTestConfig?: ABTestConfig;
}

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

// Backend-compatible event structure
export interface BackendEvent {
  event_id?: string;
  event_type: string;
  user_id?: string;
  session_id?: string;
  timestamp?: string; // ISO string format
  properties?: EventProperties;
  user_agent?: string; // Auto-extracted by backend
  ip_address?: string; // Auto-extracted by backend
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
  type:
    | "track"
    | "page"
    | "identify"
    | "alias"
    | "heatmap"
    | "session"
    | "error";
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
  trackCustomError: (
    error: string | Error,
    properties?: EventProperties
  ) => void;
  trackPerformance: (performanceData: PerformanceData) => void;
  trackFeatureUsage: (
    featureName: string,
    properties?: EventProperties
  ) => void;
  trackFunnelStep: (
    funnelName: string,
    stepName: string,
    stepIndex: number,
    properties?: EventProperties
  ) => void;
  completeFunnel: (funnelName: string, properties?: EventProperties) => void;
  startFunnel: (funnelName: string, properties?: EventProperties) => void;
  advanceFunnel: (
    funnelName: string,
    stepName: string,
    properties?: EventProperties
  ) => void;
  abandonFunnel: (
    funnelName: string,
    reason?: string,
    properties?: EventProperties
  ) => void;
  getFunnelState: (funnelName: string) => FunnelState | undefined;
  getActiveSession: () => SessionData;
  calculateEngagementScore: () => number;
  getQueueSize: () => number;
  clearQueue: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  isRecordingActive: () => boolean;
  config: {
    apiKey: string;
    projectId: string;
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
    enableABTesting?: boolean;
  };
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
  action: "click" | "move" | "scroll";
  viewport: {
    width: number;
    height: number;
  };
}

export interface SessionData {
  sessionId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: number;
  clicks: number;
  scrollDepth: number;
  maxScrollDepth: number;
  isActive: boolean;
  events: string[];
  scrollEvents?: number;
  clickEvents?: number;
  pageChanges?: number;
  engagementScore?: number;
  bounceLikelihood?: number;
  channel?: string;
}

export interface FunnelStep {
  stepName: string;
  stepIndex: number;
  timestamp: number;
  timeInFunnel: number;
  properties?: EventProperties;
}

export interface FunnelState {
  funnelName: string;
  currentStep: number;
  startTime: number;
  steps: FunnelStep[];
  isActive: boolean;
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
  type: "javascript" | "unhandledrejection" | "network" | "custom";
}

export interface QueuedEvent {
  event: AnalyticsEvent;
  retries: number;
  timestamp: number;
}

// A/B Testing Types
export interface ABTestConfig {
  enableABTesting?: boolean;
  assignmentCacheTTL?: number; // Cache assignment for this many ms (default: 5 minutes)
  autoTrackExposures?: boolean; // Automatically track when user is exposed to variant
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  key: string;
  status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "ARCHIVED";
  trafficSplit: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  variants: Variant[];
}

export interface Variant {
  id: string;
  name: string;
  key: string;
  description?: string;
  isControl: boolean;
  trafficSplit: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  variantKey: string;
  variantName: string;
  isControl: boolean;
  assignedAt: string;
  experiment?: Experiment;
}

export interface ConversionEvent {
  experimentId: string;
  eventName: string;
  eventValue?: number;
  properties?: EventProperties;
}

export interface ABTestAnalytics {
  getExperiment: (experimentKey: string) => Promise<Experiment | null>;
  getAssignment: (
    experimentKey: string,
    options?: AssignmentOptions
  ) => Promise<ExperimentAssignment | null>;
  trackConversion: (conversion: ConversionEvent) => Promise<void>;
  getAllExperiments: () => Promise<Experiment[]>;
  isVariantEnabled: (
    experimentKey: string,
    variantKey: string
  ) => Promise<boolean>;
  getActiveVariants: () => Promise<Record<string, ExperimentAssignment>>;
}

export interface AssignmentOptions {
  userId?: string;
  anonymousId?: string;
  forceRefresh?: boolean; // Ignore cache and fetch fresh assignment
}

export interface ABTestContext {
  assignments: Record<string, ExperimentAssignment>; // experimentKey -> assignment
  experiments: Record<string, Experiment>; // experimentKey -> experiment
  lastFetch: number; // timestamp of last fetch
}

// Extend AnalyticsConfig to include AB testing
export interface AnalyticsConfig {
  apiKey: string;
  projectId: string;
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
  // A/B Testing
  enableABTesting?: boolean;
  abTestConfig?: ABTestConfig;
}
