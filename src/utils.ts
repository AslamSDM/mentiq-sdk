import { AnalyticsEvent } from "./types";

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getSessionId(): string {
  const sessionKey = "mentiq_session_id";
  const sessionTimeout = 30 * 60 * 1000; // 30 minutes

  if (typeof window === "undefined") {
    return generateId();
  }

  const stored = sessionStorage.getItem(sessionKey);
  const lastActivity = localStorage.getItem("mentiq_last_activity");

  const now = Date.now();
  const isExpired =
    lastActivity && now - parseInt(lastActivity, 10) > sessionTimeout;

  if (!stored || isExpired) {
    const newSessionId = generateId();
    sessionStorage.setItem(sessionKey, newSessionId);
    localStorage.setItem("mentiq_last_activity", now.toString());
    return newSessionId;
  }

  localStorage.setItem("mentiq_last_activity", now.toString());
  return stored;
}

export function getAnonymousId(): string {
  const key = "mentiq_anonymous_id";

  if (typeof window === "undefined") {
    return generateId();
  }

  let anonymousId = localStorage.getItem(key);
  if (!anonymousId) {
    anonymousId = generateId();
    localStorage.setItem(key, anonymousId);
  }

  return anonymousId;
}

export function getUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("mentiq_user_id");
}

export function setUserId(userId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("mentiq_user_id", userId);
}

export function clearUserId(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem("mentiq_user_id");
}

export function getContext() {
  const context: AnalyticsEvent["context"] = {
    library: {
      name: "mentiq-sdk",
      version: "1.0.0",
    },
  };

  if (typeof window !== "undefined") {
    context.page = {
      title: document.title,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      search: window.location.search || undefined,
    };

    context.userAgent = navigator.userAgent;
    context.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    context.locale = navigator.language;
    context.screen = {
      width: window.screen.width,
      height: window.screen.height,
    };
  }

  return context;
}

export function createEvent(
  type: AnalyticsEvent["type"],
  event?: string,
  properties?: any
): AnalyticsEvent {
  return {
    id: generateId(),
    timestamp: Date.now(),
    type,
    event,
    properties: properties || {},
    userId: getUserId() || undefined,
    anonymousId: getAnonymousId(),
    sessionId: getSessionId(),
    context: getContext(),
  };
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;

  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;

  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}
