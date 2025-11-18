import React, { ReactNode, ComponentType, createContext } from "react";
import { AnalyticsConfig, AnalyticsInstance } from "./types";

// Analytics Context for hooks - only create on client side
let MentiqAnalyticsContext: React.Context<AnalyticsInstance | null> | null = null;

function getContext() {
  if (typeof window !== "undefined" && !MentiqAnalyticsContext) {
    MentiqAnalyticsContext = createContext<AnalyticsInstance | null>(null);
  }
  return MentiqAnalyticsContext;
}

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

          const Context = getContext();
          if (!Context) {
            return <>{children}</>;
          }

          return (
            <Context.Provider value={analytics}>
              {children}
            </Context.Provider>
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
 * Hook for accessing MentiQ analytics from context
 */
export function useMentiqAnalytics() {
  const Context = getContext();
  
  if (!Context) {
    throw new Error("useMentiqAnalytics must be used within a MentiqAnalyticsProvider and on the client side");
  }

  const analytics = React.useContext(Context);

  if (!analytics) {
    throw new Error("useMentiqAnalytics must be used within a MentiqAnalyticsProvider");
  }

  const track = React.useCallback(
    (event: string, properties?: any) => {
      analytics.track(event, properties);
    },
    [analytics]
  );

  const page = React.useCallback(
    (properties?: any) => {
      analytics.page(properties);
    },
    [analytics]
  );

  const identify = React.useCallback(
    (userId: string, properties?: any) => {
      analytics.identify(userId, properties);
    },
    [analytics]
  );

  const reset = React.useCallback(() => {
    analytics.reset();
  }, [analytics]);

  const flush = React.useCallback(async () => {
    await analytics.flush();
  }, [analytics]);

  return {
    track,
    page,
    identify,
    reset,
    flush,
    analytics,
  };
}

/**
 * Hook for lazy loading analytics (alternative pattern)
 */
export function useLazyMentiqAnalytics(config: AnalyticsConfig) {
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadAnalytics = React.useCallback(async () => {
    if (analytics || isLoading || typeof window === "undefined") return;

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
