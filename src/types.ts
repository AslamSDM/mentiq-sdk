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

// Subscription tracking types
export interface SubscriptionProperties {
  // Status & Plan
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "paused"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid";
  plan_id?: string;
  plan_name?: string;
  plan_tier?: string; // e.g., "free", "starter", "pro", "enterprise"

  // Pricing (in cents)
  mrr?: number; // Monthly Recurring Revenue
  arr?: number; // Annual Recurring Revenue
  ltv?: number; // Lifetime Value
  currency?: string; // e.g., "usd", "eur"

  // Billing Cycle
  billing_interval?: "day" | "week" | "month" | "year";
  billing_cycle_anchor?: string; // ISO date
  current_period_start?: string; // ISO date
  current_period_end?: string; // ISO date

  // Trial
  trial_start?: string; // ISO date
  trial_end?: string; // ISO date
  is_trial?: boolean;

  // Payment (PCI-safe - last 4 digits only)
  payment_method_type?: string; // e.g., "card", "bank_account", "paypal"
  payment_method_last4?: string; // Last 4 digits only
  payment_method_brand?: string; // e.g., "visa", "mastercard"

  // Cancellation
  cancel_at_period_end?: boolean;
  canceled_at?: string; // ISO date
  cancellation_reason?: string;

  // Provider Info
  provider?: "stripe" | "paddle" | "chargebee" | "manual" | string;
  provider_customer_id?: string;
  provider_subscription_id?: string;

  // Metadata
  created_at?: string; // ISO date
  updated_at?: string; // ISO date

  // Custom fields
  [key: string]: string | number | boolean | null | undefined;
}

export interface PaymentEventProperties extends EventProperties {
  // Payment-specific event data
  amount?: number;
  currency?: string;
  payment_status?: "succeeded" | "failed" | "pending" | "refunded";
  failure_reason?: string;
  invoice_id?: string;
  charge_id?: string;
}

export interface ChurnRiskMetrics {
  risk_score: number; // 0-100
  risk_category: "low" | "medium" | "high" | "critical";
  factors: {
    engagement_score?: number;
    days_since_last_active?: number;
    feature_adoption_rate?: number;
    support_tickets?: number;
    negative_feedback_count?: number;
    payment_failures?: number;
  };
  predicted_churn_date?: string; // ISO date
  intervention_recommended?: boolean;
}

export interface UserProperties {
  subscription?: SubscriptionProperties;
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | SubscriptionProperties;
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
    | "error"
    | "subscription"
    | "payment";
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
  identify: (
    userId: string,
    traits?: UserProperties & {
      email?: string;
      subscription?: SubscriptionProperties;
    }
  ) => void;
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

  // Subscription tracking methods
  trackSubscription: (
    eventName: string,
    properties?: SubscriptionProperties & EventProperties
  ) => void;
  trackSubscriptionStarted: (properties: SubscriptionProperties) => void;
  trackSubscriptionUpgraded: (
    properties: SubscriptionProperties & { previous_plan?: string }
  ) => void;
  trackSubscriptionDowngraded: (
    properties: SubscriptionProperties & { previous_plan?: string }
  ) => void;
  trackSubscriptionCanceled: (
    properties: SubscriptionProperties & { cancellation_reason?: string }
  ) => void;
  trackSubscriptionPaused: (properties: SubscriptionProperties) => void;
  trackSubscriptionReactivated: (properties: SubscriptionProperties) => void;
  trackTrialStarted: (properties: SubscriptionProperties) => void;
  trackTrialConverted: (properties: SubscriptionProperties) => void;
  trackTrialExpired: (properties: SubscriptionProperties) => void;
  trackPaymentFailed: (properties: PaymentEventProperties) => void;
  trackPaymentSucceeded: (properties: PaymentEventProperties) => void;

  // Churn analysis methods
  calculateChurnRisk: () => ChurnRiskMetrics;
  getSubscriptionData: () => SubscriptionProperties | null;
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
