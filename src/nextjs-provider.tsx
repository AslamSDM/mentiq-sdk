import React, { ReactNode } from "react";
import dynamic from "next/dynamic";
import { AnalyticsConfig } from "./types";

interface NextAnalyticsProviderProps {
  config: AnalyticsConfig;
  children: ReactNode;
  loading?: ReactNode;
}

/**
 * Next.js optimized Analytics Provider with proper SSR handling
 * Use this in Next.js applications for better performance and SSR support
 */
const DynamicProvider = dynamic(
  () =>
    import("./provider").then((mod) => ({ default: mod.AnalyticsProvider })),
  {
    ssr: false,
    loading: () => null,
  }
);

export function NextAnalyticsProvider({
  config,
  children,
  loading,
}: NextAnalyticsProviderProps) {
  return <DynamicProvider config={config}>{children}</DynamicProvider>;
}

/**
 * Client-only wrapper for analytics components
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook for Next.js to safely use analytics on client-side only
 */
export function useClientAnalytics() {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return { isClient };
}
