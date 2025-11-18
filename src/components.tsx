import React, { useEffect, useRef, ReactNode } from "react";
import {
  useAnalytics,
  useInteractionTracking,
  useErrorTracking,
  usePerformanceTracking,
} from "./hooks";
import { useMentiqAnalytics } from "./dynamic-provider";
import { EventProperties } from "./types";

interface TrackViewProps {
  event?: string;
  properties?: EventProperties;
  children: ReactNode;
  threshold?: number; // Percentage of element that needs to be visible
  delay?: number; // Delay before tracking (in ms)
}

export function TrackView({
  event = "element_viewed",
  properties,
  children,
  threshold = 0.5,
  delay = 1000,
}: TrackViewProps) {
  const { track } = useAnalytics();
  const elementRef = useRef<HTMLDivElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            setTimeout(() => {
              if (!hasTracked.current) {
                track(event, properties);
                hasTracked.current = true;
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
  }, [track, event, properties, threshold, delay]);

  return <div ref={elementRef}>{children}</div>;
}

interface TrackClickProps {
  event?: string;
  properties?: EventProperties;
  children: ReactNode;
  element?: string;
}

export function TrackClick({
  event = "click",
  properties,
  children,
  element,
}: TrackClickProps) {
  const { trackClick } = useInteractionTracking();

  const handleClick = (e: React.MouseEvent) => {
    trackClick(element || "unknown", {
      ...properties,
      target: (e.target as HTMLElement).tagName,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return <div onClick={handleClick}>{children}</div>;
}

interface TrackFormProps {
  formName: string;
  children: ReactNode;
  trackSubmit?: boolean;
  trackFieldChanges?: boolean;
}

export function TrackForm({
  formName,
  children,
  trackSubmit = true,
  trackFieldChanges = false,
}: TrackFormProps) {
  const { track } = useAnalytics();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (trackSubmit) {
      const formData = new FormData(e.currentTarget);
      const fields = Array.from(formData.keys());

      track("form_submitted", {
        form_name: formName,
        field_count: fields.length,
        fields: fields.join(","),
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLFormElement>) => {
    if (trackFieldChanges && e.target.name) {
      track("form_field_changed", {
        form_name: formName,
        field_name: e.target.name,
        field_type: e.target.type,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} onChange={handleChange}>
      {children}
    </form>
  );
}

interface TrackScrollProps {
  children: ReactNode;
  milestones?: number[]; // Percentage milestones to track (e.g., [25, 50, 75, 100])
}

export function TrackScroll({
  children,
  milestones = [25, 50, 75, 100],
}: TrackScrollProps) {
  const { track } = useAnalytics();
  const trackedMilestones = useRef(new Set<number>());

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercentage = (scrollTop / scrollHeight) * 100;

      milestones.forEach((milestone) => {
        if (
          scrollPercentage >= milestone &&
          !trackedMilestones.current.has(milestone)
        ) {
          track("scroll_milestone", {
            milestone,
            scroll_percentage: Math.round(scrollPercentage),
          });
          trackedMilestones.current.add(milestone);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [track, milestones]);

  return <>{children}</>;
}

interface TrackTimeProps {
  children: ReactNode;
  event?: string;
  intervals?: number[]; // Time intervals in seconds
}

export function TrackTime({
  children,
  event = "time_on_page",
  intervals = [30, 60, 120, 300],
}: TrackTimeProps) {
  const { track } = useAnalytics();
  const startTime = useRef(Date.now());
  const trackedIntervals = useRef(new Set<number>());

  useEffect(() => {
    const checkIntervals = () => {
      const timeSpent = (Date.now() - startTime.current) / 1000;

      intervals.forEach((interval) => {
        if (timeSpent >= interval && !trackedIntervals.current.has(interval)) {
          track(event, {
            time_spent: interval,
            total_time: Math.round(timeSpent),
          });
          trackedIntervals.current.add(interval);
        }
      });
    };

    const timer = setInterval(checkIntervals, 1000);
    return () => clearInterval(timer);
  }, [track, event, intervals]);

  useEffect(() => {
    return () => {
      // Track final time on unmount
      const finalTime = (Date.now() - startTime.current) / 1000;
      track("page_time_final", {
        total_time: Math.round(finalTime),
      });
    };
  }, [track]);

  return <>{children}</>;
}

// Higher-order component for automatic component tracking
export function withTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  trackProps?: (props: P) => EventProperties
) {
  return function TrackedComponent(props: P) {
    const { track } = useAnalytics();

    useEffect(() => {
      track("component_viewed", {
        component_name: componentName,
        ...(trackProps ? trackProps(props) : {}),
      });
    }, [track, props]);

    return <WrappedComponent {...props} />;
  };
}

// Error Boundary with Analytics
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export function AnalyticsErrorBoundary({
  children,
  fallback,
  onError,
}: ErrorBoundaryProps) {
  const { trackCustomError } = useMentiqAnalytics();

  return (
    <ErrorBoundaryWrapper
      onError={(error, errorInfo) => {
        // Track the error
        trackCustomError(error, {
          component_stack: errorInfo.componentStack,
          error_boundary: true,
        });

        // Call custom error handler
        if (onError) {
          onError(error, errorInfo);
        }
      }}
      fallback={fallback}
    >
      {children}
    </ErrorBoundaryWrapper>
  );
}

// Internal class component for error boundary functionality
class ErrorBoundaryWrapper extends React.Component<
  {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  },
  ErrorBoundaryState
> {
  constructor(props: {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call the error handler passed from the functional component
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }

    return this.props.children;
  }
}

// Performance monitoring component
interface PerformanceMonitorProps {
  children: ReactNode;
  measureRender?: boolean;
  componentName?: string;
}

export function PerformanceMonitor({
  children,
  measureRender = true,
  componentName = "unknown",
}: PerformanceMonitorProps) {
  const { measureCustomPerformance } = usePerformanceTracking();
  const renderStartRef = useRef<number>();

  useEffect(() => {
    if (measureRender) {
      const measurement = measureCustomPerformance(`${componentName}-render`);
      renderStartRef.current = performance.now();

      if (measurement) {
        measurement.start();

        return () => {
          measurement.end();
        };
      }
    }
  }, [measureRender, componentName, measureCustomPerformance]);

  return <>{children}</>;
}

// Heatmap tracking component
interface HeatmapTrackerProps {
  children: ReactNode;
  trackClicks?: boolean;
  trackHovers?: boolean;
  trackScrolls?: boolean;
  element?: string;
}

export function HeatmapTracker({
  children,
  trackClicks = true,
  trackHovers = false,
  trackScrolls = false,
  element = "heatmap-element",
}: HeatmapTrackerProps) {
  const { track } = useAnalytics();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elementNode = elementRef.current;
    if (!elementNode) return;

    const cleanup: (() => void)[] = [];

    if (trackClicks) {
      const handleClick = (e: MouseEvent) => {
        const rect = elementNode.getBoundingClientRect();
        track("heatmap_click", {
          element,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          page_x: e.clientX,
          page_y: e.clientY,
          element_width: rect.width,
          element_height: rect.height,
        });
      };

      elementNode.addEventListener("click", handleClick);
      cleanup.push(() => elementNode.removeEventListener("click", handleClick));
    }

    if (trackHovers) {
      const handleMouseEnter = (e: MouseEvent) => {
        track("heatmap_hover_start", { element });
      };

      const handleMouseLeave = (e: MouseEvent) => {
        track("heatmap_hover_end", { element });
      };

      elementNode.addEventListener("mouseenter", handleMouseEnter);
      elementNode.addEventListener("mouseleave", handleMouseLeave);
      cleanup.push(
        () => elementNode.removeEventListener("mouseenter", handleMouseEnter),
        () => elementNode.removeEventListener("mouseleave", handleMouseLeave)
      );
    }

    if (trackScrolls) {
      const handleScroll = () => {
        const rect = elementNode.getBoundingClientRect();
        track("heatmap_scroll", {
          element,
          scroll_top: window.pageYOffset,
          element_top: rect.top + window.pageYOffset,
          element_visible: rect.top < window.innerHeight && rect.bottom > 0,
        });
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      cleanup.push(() => window.removeEventListener("scroll", handleScroll));
    }

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [track, trackClicks, trackHovers, trackScrolls, element]);

  return <div ref={elementRef}>{children}</div>;
}

// Session monitoring component
interface SessionMonitorProps {
  children: ReactNode;
  trackInactivity?: boolean;
  inactivityThreshold?: number; // in milliseconds
}

export function SessionMonitor({
  children,
  trackInactivity = true,
  inactivityThreshold = 60000, // 1 minute
}: SessionMonitorProps) {
  const { track } = useAnalytics();
  const lastActivityRef = useRef(Date.now());
  const inactivityTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!trackInactivity) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        track("session_inactive", {
          inactive_duration: inactivityThreshold,
          last_activity: lastActivityRef.current,
        });
      }, inactivityThreshold);
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Initial activity
    updateActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [track, trackInactivity, inactivityThreshold]);

  return <>{children}</>;
}
