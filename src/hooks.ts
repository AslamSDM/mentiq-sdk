import { useContext, useEffect, useRef, useCallback } from "react";
import { MentiqAnalyticsContext } from "./dynamic-provider";
import {
  EventProperties,
  UserProperties,
  PerformanceData,
  SessionData,
} from "./types";

export function useMentiqAnalytics() {
  const analytics = useContext(MentiqAnalyticsContext);

  if (!analytics) {
    throw new Error(
      "useMentiqAnalytics must be used within a MentiqAnalyticsProvider"
    );
  }

  const track = useCallback(
    (event: string, properties?: EventProperties) => {
      analytics.track(event, properties);
    },
    [analytics]
  );

  const page = useCallback(
    (properties?: EventProperties) => {
      analytics.page(properties);
    },
    [analytics]
  );

  const identify = useCallback(
    (userId: string, properties?: UserProperties) => {
      analytics.identify(userId, properties);
    },
    [analytics]
  );

  const reset = useCallback(() => {
    analytics.reset();
  }, [analytics]);

  const flush = useCallback(async () => {
    await analytics.flush();
  }, [analytics]);

  const trackError = useCallback(
    (error: string | Error, properties?: EventProperties) => {
      analytics.trackCustomError(error, properties);
    },
    [analytics]
  );

  const trackPerformance = useCallback(
    (performanceData: PerformanceData) => {
      analytics.trackPerformance(performanceData);
    },
    [analytics]
  );

  const getSessionData = useCallback((): SessionData => {
    return analytics.getSessionData();
  }, [analytics]);

  const getQueueSize = useCallback((): number => {
    return analytics.getQueueSize();
  }, [analytics]);

  const trackSubscriptionCancellation = useCallback(
    (properties?: EventProperties) => {
      analytics.track("subscription_cancelled", properties);
    },
    [analytics]
  );

  return {
    track,
    page,
    identify,
    reset,
    flush,
    trackError,
    trackPerformance,
    getSessionData,
    getQueueSize,
    trackSubscriptionCancellation,
    analytics,
  };
}

export function usePageTracking(properties?: EventProperties) {
  const { page } = useMentiqAnalytics();

  useEffect(() => {
    page(properties);
  }, [page, properties]);
}

export function useInteractionTracking() {
  const { track } = useMentiqAnalytics();

  const trackClick = useCallback(
    (element: string, properties?: EventProperties) => {
      track("element_clicked", { element, ...properties });
    },
    [track]
  );

  const trackHover = useCallback(
    (element: string, properties?: EventProperties) => {
      track("element_hovered", { element, ...properties });
    },
    [track]
  );

  const trackView = useCallback(
    (element: string, properties?: EventProperties) => {
      track("element_viewed", { element, ...properties });
    },
    [track]
  );

  return {
    trackClick,
    trackHover,
    trackView,
  };
}

export function useElementTracking(
  elementRef: React.RefObject<HTMLElement>,
  event: string = "element_viewed",
  properties?: EventProperties,
  options: {
    threshold?: number;
    delay?: number;
    once?: boolean;
  } = {}
) {
  const { track } = useMentiqAnalytics();
  const { threshold = 0.5, delay = 1000, once = true } = options;
  const hasTriggered = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            if (once && hasTriggered.current) return;

            setTimeout(() => {
              if (element && entry.isIntersecting) {
                track(event, properties);
                hasTriggered.current = true;
              }
            }, delay);
          }
        });
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, event, properties, threshold, delay, once, track]);
}

export function useSessionTracking() {
  const { getSessionData, analytics } = useMentiqAnalytics();

  const sessionData = getSessionData();

  return {
    sessionData,
    sessionId: analytics.getSessionId(),
    isActive: sessionData?.isActive || false,
    duration: sessionData?.duration || 0,
    pageViews: sessionData?.pageViews || 0,
    clicks: sessionData?.clicks || 0,
    scrollDepth: sessionData?.scrollDepth || 0,
  };
}

export function useErrorTracking() {
  const { trackError } = useMentiqAnalytics();

  const trackJavaScriptError = useCallback(
    (error: Error, properties?: EventProperties) => {
      trackError(error, properties);
    },
    [trackError]
  );

  const trackCustomError = useCallback(
    (message: string, properties?: EventProperties) => {
      trackError(message, properties);
    },
    [trackError]
  );

  // Auto-track React errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackJavaScriptError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackCustomError(`Unhandled Promise Rejection: ${event.reason}`, {
        type: "unhandledrejection",
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("error", handleError);
      window.addEventListener("unhandledrejection", handleUnhandledRejection);

      return () => {
        window.removeEventListener("error", handleError);
        window.removeEventListener(
          "unhandledrejection",
          handleUnhandledRejection
        );
      };
    }
  }, [trackJavaScriptError, trackCustomError]);

  return {
    trackJavaScriptError,
    trackCustomError,
  };
}

export function usePerformanceTracking() {
  const { trackPerformance } = useMentiqAnalytics();

  useEffect(() => {
    if (typeof window === "undefined" || !("performance" in window)) return;

    const measurePerformance = () => {
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType("paint");

      if (navigation) {
        const performanceData: PerformanceData = {
          loadTime: navigation.loadEventEnd - navigation.fetchStart,
          domReady: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstPaint: paint.find((p) => p.name === "first-paint")?.startTime,
          firstContentfulPaint: paint.find(
            (p) => p.name === "first-contentful-paint"
          )?.startTime,
        };

        // Get Core Web Vitals if available
        if ("PerformanceObserver" in window) {
          try {
            // Largest Contentful Paint
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lcpEntry = entries[entries.length - 1];
              if (lcpEntry) {
                performanceData.largestContentfulPaint = lcpEntry.startTime;
                trackPerformance({ ...performanceData });
              }
            }).observe({ entryTypes: ["largest-contentful-paint"] });

            // First Input Delay
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              entries.forEach((entry: any) => {
                if (entry.processingStart && entry.startTime) {
                  performanceData.firstInputDelay =
                    entry.processingStart - entry.startTime;
                  trackPerformance({ ...performanceData });
                }
              });
            }).observe({ entryTypes: ["first-input"] });

            // Cumulative Layout Shift
            new PerformanceObserver((list) => {
              let clsValue = 0;
              list.getEntries().forEach((entry: any) => {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                }
              });
              performanceData.cumulativeLayoutShift = clsValue;
              trackPerformance({ ...performanceData });
            }).observe({ entryTypes: ["layout-shift"] });
          } catch (e) {
            // Fallback if PerformanceObserver is not supported
            trackPerformance(performanceData);
          }
        } else {
          trackPerformance(performanceData);
        }
      }
    };

    // Measure performance after page load
    if (document.readyState === "complete") {
      measurePerformance();
    } else {
      window.addEventListener("load", measurePerformance);
      return () => window.removeEventListener("load", measurePerformance);
    }
  }, [trackPerformance]);

  const measureCustomPerformance = useCallback(
    (label: string) => {
      if (typeof window === "undefined" || !("performance" in window)) return;

      return {
        start: () => performance.mark(`${label}-start`),
        end: () => {
          performance.mark(`${label}-end`);
          performance.measure(label, `${label}-start`, `${label}-end`);
          const measure = performance.getEntriesByName(label)[0];
          if (measure) {
            trackPerformance({
              [label]: measure.duration,
            });
          }
          performance.clearMarks(`${label}-start`);
          performance.clearMarks(`${label}-end`);
          performance.clearMeasures(label);
        },
      };
    },
    [trackPerformance]
  );

  return {
    measureCustomPerformance,
  };
}

// Backward compatibility alias
export const useAnalytics = useMentiqAnalytics;
