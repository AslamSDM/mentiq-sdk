import { useEffect, useRef, useCallback } from "react";
import {
  EventProperties,
  UserProperties,
  PerformanceData,
  SessionData,
} from "./types";
import { useMentiqAnalytics } from "./dynamic-provider";

export function usePageTracking(properties?: EventProperties) {
  const { page } = useMentiqAnalytics();

  useEffect(() => {
    if (typeof window !== "undefined") {
      page(properties);
    }
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
    if (typeof window === "undefined") return;

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
  const { analytics } = useMentiqAnalytics();

  const getSessionData = useCallback(() => {
    return analytics?.getSessionData?.() || {};
  }, [analytics]);

  const sessionData = getSessionData();

  return {
    sessionData,
    sessionId: analytics?.getSessionId?.(),
    isActive: sessionData?.isActive || false,
    duration: sessionData?.duration || 0,
    pageViews: sessionData?.pageViews || 0,
    clicks: sessionData?.clicks || 0,
    scrollDepth: sessionData?.scrollDepth || 0,
  };
}

export function useErrorTracking() {
  const { track } = useMentiqAnalytics();

  const trackJavaScriptError = useCallback(
    (error: Error, properties?: EventProperties) => {
      track("javascript_error", {
        message: error.message,
        stack: error.stack,
        ...properties,
      });
    },
    [track]
  );

  const trackCustomError = useCallback(
    (message: string, properties?: EventProperties) => {
      track("custom_error", { message, ...properties });
    },
    [track]
  );

  // Auto-track React errors
  useEffect(() => {
    if (typeof window === "undefined") return;

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

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, [trackJavaScriptError, trackCustomError]);

  return {
    trackJavaScriptError,
    trackCustomError,
  };
}

export function usePerformanceTracking() {
  const { track } = useMentiqAnalytics();

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

        track("performance_metrics", performanceData);
      }
    };

    // Measure performance after page load
    if (document.readyState === "complete") {
      measurePerformance();
    } else {
      window.addEventListener("load", measurePerformance);
      return () => window.removeEventListener("load", measurePerformance);
    }
  }, [track]);

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
            track("custom_performance", { [label]: measure.duration });
          }
          performance.clearMarks(`${label}-start`);
          performance.clearMarks(`${label}-end`);
          performance.clearMeasures(label);
        },
      };
    },
    [track]
  );

  return {
    measureCustomPerformance,
  };
}

// Re-export for convenience
export { useMentiqAnalytics };

// Backward compatibility alias
export const useAnalytics = useMentiqAnalytics;
