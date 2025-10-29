// Core
export { Analytics } from "./analytics";
export * from "./types";
export * from "./utils";

// React
export { AnalyticsProvider } from "./provider";
export * from "./hooks";
export * from "./components";

// A/B Testing
// export { ABTestingService } from "./ab-testing";
export * from "./hooks-ab-testing";
// export * from "./components-ab-testing";

// Next.js
export * from "./nextjs";

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
