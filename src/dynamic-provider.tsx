import React, { ReactNode, ComponentType, createContext } from "react";
import { AnalyticsConfig, AnalyticsInstance } from "./types";

// Analytics Context for hooks
export const MentiqAnalyticsContext = createContext<AnalyticsInstance | null>(
  null
);

interface MentiqAnalyticsProviderProps {
  config: AnalyticsConfig;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

/**
 * MentiQ Analytics Provider with dynamic loading for optimal performance
 * Features:
 * - Server-side rendering support
 * - Code splitting and lazy loading
 * - Better bundle optimization
 * - Graceful error handling
 */
export function MentiqAnalyticsProvider({
  config,
  children,
  fallback = null,
  loading = null,
}: MentiqAnalyticsProviderProps) {
  const [Provider, setProvider] = React.useState<ComponentType<{
    config: AnalyticsConfig;
    children: ReactNode;
  }> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    // Only load on client side
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    // Dynamic import of the analytics class
    import("./analytics")
      .then((module) => {
        // Create a provider component
        const AnalyticsProvider = ({
          config,
          children,
        }: {
          config: AnalyticsConfig;
          children: ReactNode;
        }) => {
          const [analytics] = React.useState(
            () => new module.Analytics(config)
          );

          React.useEffect(() => {
            return () => {
              analytics.destroy?.();
            };
          }, [analytics]);

          return (
            <MentiqAnalyticsContext.Provider value={analytics}>
              {children}
            </MentiqAnalyticsContext.Provider>
          );
        };

        setProvider(() => AnalyticsProvider);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Analytics:", err);
        setError(err);
        setIsLoading(false);
      });
  }, []);

  // Server-side rendering - return children without analytics
  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return <>{loading || fallback || children}</>;
  }

  // Error state
  if (error || !Provider) {
    console.warn(
      "Analytics provider failed to load, rendering children without analytics"
    );
    return <>{fallback || children}</>;
  }

  // Client-side with loaded provider
  return <Provider config={config}>{children}</Provider>;
}

/**
 * Higher-Order Component for wrapping components with MentiQ analytics
 */
export function withMentiqAnalytics<P extends object>(
  WrappedComponent: ComponentType<P>,
  config: AnalyticsConfig
) {
  const WithMentiqAnalyticsComponent = (props: P) => {
    return (
      <MentiqAnalyticsProvider config={config}>
        <WrappedComponent {...props} />
      </MentiqAnalyticsProvider>
    );
  };

  WithMentiqAnalyticsComponent.displayName = `withMentiqAnalytics(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithMentiqAnalyticsComponent;
}

/**
 * Hook for lazy loading MentiQ analytics in components
 */
export function useMentiqAnalytics(config: AnalyticsConfig) {
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadAnalytics = React.useCallback(async () => {
    if (analytics || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const { Analytics } = await import("./analytics");
      const instance = new Analytics(config);
      setAnalytics(instance);
    } catch (err) {
      console.error("Failed to load Analytics:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [config, analytics, isLoading]);

  React.useEffect(() => {
    return () => {
      if (analytics?.destroy) {
        analytics.destroy();
      }
    };
  }, [analytics]);

  return {
    analytics,
    loadAnalytics,
    isLoading,
    error,
  };
}
