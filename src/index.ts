// Core
export { Analytics } from "./analytics";
export * from "./types";
export * from "./utils";
export { SessionRecorder } from "./session-recording";
export type { RecordingConfig } from "./session-recording";

// React Provider (Dynamic Loading for SSR & Performance)
export {
  MentiqAnalyticsProvider,
  withMentiqAnalytics,
  useMentiqAnalytics,
} from "./dynamic-provider";

// React Hooks & Components
export * from "./hooks";
export * from "./components";

// Subscription Hooks & Components
export * from "./hooks-subscription";
export * from "./components-subscription";

// A/B Testing
export * from "./hooks-ab-testing";

// Onboarding Tracking
export { OnboardingTracker, useOnboardingTracker } from "./onboarding-tracker";
export type { OnboardingStep, OnboardingConfig } from "./onboarding-tracker";

// Default instance for quick setup
import { Analytics } from "./analytics";
import { AnalyticsConfig } from "./types";

let defaultInstance: Analytics | null = null;

export function init(config: AnalyticsConfig): Analytics {
  defaultInstance = new Analytics(config);
  return defaultInstance;
}

export function track(event: string, properties?: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.track(event, properties);
}

export function page(properties?: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.page(properties);
}

export function identify(userId: string, traits?: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.identify(userId, traits);
}

export function alias(newId: string, previousId?: string): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.alias(newId, previousId);
}

export function reset(): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.reset();
}

export function flush(): Promise<void> {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return Promise.resolve();
  }
  return defaultInstance.flush();
}

export function getInstance(): Analytics | null {
  return defaultInstance;
}

export function startRecording(): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.startRecording();
}

export function stopRecording(): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.stopRecording();
}

export function pauseRecording(): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.pauseRecording();
}

export function resumeRecording(): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.resumeRecording();
}

export function isRecordingActive(): boolean {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return false;
  }
  return defaultInstance.isRecordingActive();
}

export function trackFeatureUsage(featureName: string, properties?: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackFeatureUsage(featureName, properties);
}

export function trackFunnelStep(
  funnelName: string,
  stepName: string,
  stepIndex: number,
  properties?: any
): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackFunnelStep(funnelName, stepName, stepIndex, properties);
}

export function completeFunnel(funnelName: string, properties?: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.completeFunnel(funnelName, properties);
}

export function startFunnel(funnelName: string, properties?: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.startFunnel(funnelName, properties);
}

export function advanceFunnel(
  funnelName: string,
  stepName: string,
  properties?: any
): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.advanceFunnel(funnelName, stepName, properties);
}

export function abandonFunnel(
  funnelName: string,
  reason?: string,
  properties?: any
): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.abandonFunnel(funnelName, reason, properties);
}

export function getFunnelState(funnelName: string): any {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return null;
  }
  return defaultInstance.getFunnelState(funnelName);
}

export function getActiveSession(): any {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return null;
  }
  return defaultInstance.getActiveSession();
}

export function calculateEngagementScore(): number {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return 0;
  }
  return defaultInstance.calculateEngagementScore();
}

// Subscription tracking methods
export function trackSubscriptionStarted(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackSubscriptionStarted(properties);
}

export function trackSubscriptionUpgraded(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackSubscriptionUpgraded(properties);
}

export function trackSubscriptionDowngraded(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackSubscriptionDowngraded(properties);
}

export function trackSubscriptionCanceled(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackSubscriptionCanceled(properties);
}

export function trackSubscriptionPaused(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackSubscriptionPaused(properties);
}

export function trackSubscriptionReactivated(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackSubscriptionReactivated(properties);
}

export function trackTrialStarted(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackTrialStarted(properties);
}

export function trackTrialConverted(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackTrialConverted(properties);
}

export function trackTrialExpired(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackTrialExpired(properties);
}

export function trackPaymentFailed(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackPaymentFailed(properties);
}

export function trackPaymentSucceeded(properties: any): void {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return;
  }
  defaultInstance.trackPaymentSucceeded(properties);
}

export function getSubscriptionData(): any {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return null;
  }
  return defaultInstance.getSubscriptionData();
}

export function calculateChurnRisk(): any {
  if (!defaultInstance) {
    console.warn("MentiQ Analytics not initialized. Call init() first.");
    return null;
  }
  return defaultInstance.calculateChurnRisk();
}
