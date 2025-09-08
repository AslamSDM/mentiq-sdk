import React, { createContext, useEffect, ReactNode } from "react";
import { Analytics } from "./analytics";
import { AnalyticsConfig, AnalyticsInstance } from "./types";

export const AnalyticsContext = createContext<AnalyticsInstance | null>(null);

interface AnalyticsProviderProps {
  config: AnalyticsConfig;
  children: ReactNode;
}

export function AnalyticsProvider({
  config,
  children,
}: AnalyticsProviderProps) {
  const [analytics] = React.useState(() => new Analytics(config));

  useEffect(() => {
    return () => {
      analytics.destroy();
    };
  }, [analytics]);

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
}
