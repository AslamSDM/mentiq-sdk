import { Analytics } from "./analytics";
import { AnalyticsConfig } from "./types";

// Next.js App Router integration
export function withAnalytics(config: AnalyticsConfig) {
  return function AnalyticsWrapper({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const analytics = new Analytics(config);

    // Auto-track page views for App Router
    if (typeof window !== "undefined") {
      // Track initial page load
      analytics.page();

      // Listen for route changes in App Router
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = function (...args) {
        originalPushState.apply(this, args);
        setTimeout(() => analytics.page(), 0);
      };

      window.history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        setTimeout(() => analytics.page(), 0);
      };
    }

    return children;
  };
}

// Next.js Pages Router integration
export function trackPageView(analytics: Analytics, url: string) {
  analytics.page({
    url,
    path: new URL(url, window.location.origin).pathname,
    title: document.title,
  });
}

// Next.js API route helper
export function createAnalyticsApiHandler(config: AnalyticsConfig) {
  const analytics = new Analytics(config);

  return {
    track: (event: string, properties?: any, userId?: string) => {
      if (userId) {
        analytics.identify(userId);
      }
      analytics.track(event, properties);
    },
    identify: (userId: string, traits?: any) => {
      analytics.identify(userId, traits);
    },
    flush: () => analytics.flush(),
  };
}

// Server-side analytics for API routes
export async function trackServerEvent(
  config: AnalyticsConfig,
  event: string,
  properties?: any,
  context?: {
    userId?: string;
    userAgent?: string;
    ip?: string;
  }
) {
  try {
    const payload = {
      event,
      properties: properties || {},
      timestamp: Date.now(),
      context: {
        library: {
          name: "mentiq-sdk",
          version: "1.0.0",
        },
        userAgent: context?.userAgent,
        ip: context?.ip,
      },
      userId: context?.userId,
    };

    const response = await fetch(
      config.endpoint || "https://api.mentiq.io/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    if (config.debug) {
      console.error("Server-side analytics error:", error);
    }
    throw error;
  }
}

// Middleware for automatic request tracking
export function createAnalyticsMiddleware(config: AnalyticsConfig) {
  return async (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Track request start
    await trackServerEvent(
      config,
      "api_request_start",
      {
        method: req.method,
        url: req.url,
        userAgent: req.headers["user-agent"],
      },
      {
        userAgent: req.headers["user-agent"],
        ip: req.ip || req.connection.remoteAddress,
      }
    );

    // Override res.end to track completion
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime;

      trackServerEvent(
        config,
        "api_request_complete",
        {
          method: req.method,
          url: req.url,
          status_code: res.statusCode,
          duration,
        },
        {
          userAgent: req.headers["user-agent"],
          ip: req.ip || req.connection.remoteAddress,
        }
      ).catch(() => {
        // Ignore errors in tracking
      });

      originalEnd.apply(this, args);
    };

    if (next) next();
  };
}
