/**
 * React Hooks for Subscription Tracking and Churn Management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useMentiqAnalytics } from "./dynamic-provider";
import {
  SubscriptionProperties,
  PaymentEventProperties,
  ChurnRiskMetrics,
} from "./types";

/**
 * Hook to access subscription tracking methods
 */
export function useSubscriptionTracking() {
  const { analytics } = useMentiqAnalytics();

  const trackSubscriptionStarted = useCallback(
    (properties: SubscriptionProperties) => {
      analytics?.trackSubscriptionStarted(properties);
    },
    [analytics]
  );

  const trackSubscriptionUpgraded = useCallback(
    (properties: SubscriptionProperties & { previous_plan?: string }) => {
      analytics?.trackSubscriptionUpgraded(properties);
    },
    [analytics]
  );

  const trackSubscriptionDowngraded = useCallback(
    (properties: SubscriptionProperties & { previous_plan?: string }) => {
      analytics?.trackSubscriptionDowngraded(properties);
    },
    [analytics]
  );

  const trackSubscriptionCanceled = useCallback(
    (properties: SubscriptionProperties & { cancellation_reason?: string }) => {
      analytics?.trackSubscriptionCanceled(properties);
    },
    [analytics]
  );

  const trackSubscriptionPaused = useCallback(
    (properties: SubscriptionProperties) => {
      analytics?.trackSubscriptionPaused(properties);
    },
    [analytics]
  );

  const trackSubscriptionReactivated = useCallback(
    (properties: SubscriptionProperties) => {
      analytics?.trackSubscriptionReactivated(properties);
    },
    [analytics]
  );

  const trackTrialStarted = useCallback(
    (properties: SubscriptionProperties) => {
      analytics?.trackTrialStarted(properties);
    },
    [analytics]
  );

  const trackTrialConverted = useCallback(
    (properties: SubscriptionProperties) => {
      analytics?.trackTrialConverted(properties);
    },
    [analytics]
  );

  const trackTrialExpired = useCallback(
    (properties: SubscriptionProperties) => {
      analytics?.trackTrialExpired(properties);
    },
    [analytics]
  );

  const trackPaymentFailed = useCallback(
    (properties: PaymentEventProperties) => {
      analytics?.trackPaymentFailed(properties);
    },
    [analytics]
  );

  const trackPaymentSucceeded = useCallback(
    (properties: PaymentEventProperties) => {
      analytics?.trackPaymentSucceeded(properties);
    },
    [analytics]
  );

  const getSubscriptionData = useCallback(() => {
    return analytics?.getSubscriptionData() || null;
  }, [analytics]);

  return {
    trackSubscriptionStarted,
    trackSubscriptionUpgraded,
    trackSubscriptionDowngraded,
    trackSubscriptionCanceled,
    trackSubscriptionPaused,
    trackSubscriptionReactivated,
    trackTrialStarted,
    trackTrialConverted,
    trackTrialExpired,
    trackPaymentFailed,
    trackPaymentSucceeded,
    getSubscriptionData,
  };
}

/**
 * Hook to monitor churn risk in real-time
 */
export function useChurnRisk(options?: {
  refreshInterval?: number; // Milliseconds (default: 60000 = 1 minute)
  onHighRisk?: (risk: ChurnRiskMetrics) => void;
  onCriticalRisk?: (risk: ChurnRiskMetrics) => void;
}) {
  const { analytics } = useMentiqAnalytics();
  const [churnRisk, setChurnRisk] = useState<ChurnRiskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const callbacksRef = useRef(options);

  // Update callbacks ref when options change
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const calculateChurnRisk = useCallback(() => {
    if (!analytics) {
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    try {
      const risk = analytics.calculateChurnRisk();
      setChurnRisk(risk);
      setIsLoading(false);

      // Trigger callbacks
      if (risk.risk_category === "high" || risk.risk_category === "critical") {
        callbacksRef.current?.onHighRisk?.(risk);
      }
      if (risk.risk_category === "critical") {
        callbacksRef.current?.onCriticalRisk?.(risk);
      }

      return risk;
    } catch (error) {
      console.error("Failed to calculate churn risk:", error);
      setIsLoading(false);
      return null;
    }
  }, [analytics]);

  // Initial calculation and periodic refresh
  useEffect(() => {
    calculateChurnRisk();

    const interval = setInterval(
      calculateChurnRisk,
      options?.refreshInterval || 60000
    );

    return () => clearInterval(interval);
  }, [calculateChurnRisk, options?.refreshInterval]);

  const isHighRisk =
    churnRisk?.risk_category === "high" ||
    churnRisk?.risk_category === "critical";

  const isCriticalRisk = churnRisk?.risk_category === "critical";

  return {
    churnRisk,
    isLoading,
    isHighRisk,
    isCriticalRisk,
    refresh: calculateChurnRisk,
  };
}

/**
 * Hook to get current subscription data
 */
export function useSubscriptionData() {
  const { analytics } = useMentiqAnalytics();
  const [subscription, setSubscription] =
    useState<SubscriptionProperties | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!analytics) {
      setIsLoading(false);
      return;
    }

    try {
      const data = analytics.getSubscriptionData();
      setSubscription(data);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to get subscription data:", error);
      setIsLoading(false);
    }
  }, [analytics]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isPaidUser =
    subscription?.status === "active" || subscription?.status === "trialing";

  const isTrialing = subscription?.status === "trialing";

  const isCanceled = subscription?.status === "canceled";

  const willCancelAtPeriodEnd = subscription?.cancel_at_period_end === true;

  return {
    subscription,
    isLoading,
    isPaidUser,
    isTrialing,
    isCanceled,
    willCancelAtPeriodEnd,
    refresh,
  };
}

/**
 * Hook to manually trigger subscription auto-detection
 */
export function useSubscriptionAutoDetect() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<{
    detected: boolean;
    provider?: string;
    confidence: number;
  } | null>(null);

  const detect = useCallback(async () => {
    if (typeof window === "undefined") {
      return null;
    }

    setIsDetecting(true);

    try {
      // Dynamic import to avoid bundling if not used
      const { autoDetectSubscription } = await import(
        "./subscription-detection"
      );

      const detection = autoDetectSubscription();
      setResult({
        detected: detection.detected,
        provider: detection.provider,
        confidence: detection.confidence,
      });

      // Store if detected
      if (detection.detected && detection.subscription) {
        localStorage.setItem(
          "mentiq_user_subscription",
          JSON.stringify(detection.subscription)
        );
      }

      setIsDetecting(false);
      return detection;
    } catch (error) {
      console.error("Failed to auto-detect subscription:", error);
      setIsDetecting(false);
      return null;
    }
  }, []);

  return {
    detect,
    isDetecting,
    result,
  };
}

/**
 * Hook to track subscription changes automatically
 * Useful for syncing subscription state from external sources
 */
export function useSyncSubscription(
  subscription: SubscriptionProperties | null | undefined,
  options?: {
    trackChanges?: boolean; // Track upgrade/downgrade events automatically
  }
) {
  const { analytics } = useMentiqAnalytics();
  const previousSubscription = useRef<SubscriptionProperties | null>(null);

  useEffect(() => {
    if (!subscription || !analytics) return;

    // Update subscription in analytics
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "mentiq_user_subscription",
        JSON.stringify(subscription)
      );
    }

    // Track changes if enabled
    if (options?.trackChanges && previousSubscription.current) {
      const prev = previousSubscription.current;
      const current = subscription;

      // Detect subscription changes
      if (prev.plan_id !== current.plan_id || prev.mrr !== current.mrr) {
        // Determine if upgrade or downgrade
        const prevMrr = prev.mrr || 0;
        const currentMrr = current.mrr || 0;

        if (currentMrr > prevMrr) {
          analytics.trackSubscriptionUpgraded({
            ...current,
            previous_plan: prev.plan_name || prev.plan_id,
          });
        } else if (currentMrr < prevMrr) {
          analytics.trackSubscriptionDowngraded({
            ...current,
            previous_plan: prev.plan_name || prev.plan_id,
          });
        }
      }

      // Detect cancellation
      if (prev.status !== "canceled" && current.status === "canceled") {
        analytics.trackSubscriptionCanceled({
          ...current,
          cancellation_reason: current.cancellation_reason,
        });
      }

      // Detect reactivation
      if (prev.status === "canceled" && current.status === "active") {
        analytics.trackSubscriptionReactivated(current);
      }

      // Detect trial conversion
      if (prev.status === "trialing" && current.status === "active") {
        analytics.trackTrialConverted(current);
      }
    }

    previousSubscription.current = subscription;
  }, [subscription, analytics, options?.trackChanges]);
}
