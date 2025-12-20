/**
 * React Components for Subscription Tracking and Churn Management
 */

import React, { useEffect, ReactNode } from "react";
import {
  useSubscriptionTracking,
  useChurnRisk,
  useSubscriptionData,
  useSyncSubscription,
} from "./hooks-subscription";
import { SubscriptionProperties, ChurnRiskMetrics } from "./types";

/**
 * SubscriptionTracker Component
 * Automatically tracks subscription changes
 */
export interface SubscriptionTrackerProps {
  subscription: SubscriptionProperties;
  trackChanges?: boolean; // Auto-track upgrade/downgrade/cancellation
  children?: ReactNode;
}

export function SubscriptionTracker({
  subscription,
  trackChanges = true,
  children,
}: SubscriptionTrackerProps) {
  useSyncSubscription(subscription, { trackChanges });
  return <>{children}</>;
}

/**
 * ChurnRiskMonitor Component
 * Monitors churn risk and displays warnings
 */
export interface ChurnRiskMonitorProps {
  refreshInterval?: number; // Milliseconds
  showWarning?: boolean; // Show built-in warning UI
  onHighRisk?: (risk: ChurnRiskMetrics) => void;
  onCriticalRisk?: (risk: ChurnRiskMetrics) => void;
  warningComponent?: (risk: ChurnRiskMetrics) => ReactNode;
  children?: ReactNode;
}

export function ChurnRiskMonitor({
  refreshInterval = 60000,
  showWarning = false,
  onHighRisk,
  onCriticalRisk,
  warningComponent,
  children,
}: ChurnRiskMonitorProps) {
  const { churnRisk, isHighRisk, isCriticalRisk } = useChurnRisk({
    refreshInterval,
    onHighRisk,
    onCriticalRisk,
  });

  // Default warning UI
  const DefaultWarning = ({ risk }: { risk: ChurnRiskMetrics }) => (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "8px",
        marginBottom: "16px",
        backgroundColor:
          risk.risk_category === "critical"
            ? "#fee2e2"
            : risk.risk_category === "high"
            ? "#fef3c7"
            : "#dbeafe",
        border: `1px solid ${
          risk.risk_category === "critical"
            ? "#ef4444"
            : risk.risk_category === "high"
            ? "#f59e0b"
            : "#3b82f6"
        }`,
        color: "#1f2937",
      }}
    >
      <div style={{ fontWeight: "600", marginBottom: "4px" }}>
        {risk.risk_category === "critical"
          ? "⚠️ Critical: High Churn Risk"
          : risk.risk_category === "high"
          ? "⚠️ Warning: Elevated Churn Risk"
          : "ℹ️ Churn Risk Detected"}
      </div>
      <div style={{ fontSize: "14px" }}>
        Risk Score: {risk.risk_score}/100
        {risk.predicted_churn_date && (
          <span>
            {" "}
            • Predicted Churn: {new Date(risk.predicted_churn_date).toLocaleDateString()}
          </span>
        )}
      </div>
      {risk.intervention_recommended && (
        <div
          style={{
            marginTop: "8px",
            fontSize: "14px",
            fontStyle: "italic",
          }}
        >
          Recommended: Reach out to prevent churn
        </div>
      )}
    </div>
  );

  return (
    <>
      {showWarning && churnRisk && (isHighRisk || isCriticalRisk) && (
        <>
          {warningComponent
            ? warningComponent(churnRisk)
            : <DefaultWarning risk={churnRisk} />}
        </>
      )}
      {children}
    </>
  );
}

/**
 * SubscriptionStatus Component
 * Displays current subscription status
 */
export interface SubscriptionStatusProps {
  render?: (data: {
    subscription: SubscriptionProperties | null;
    isPaidUser: boolean;
    isTrialing: boolean;
    isCanceled: boolean;
  }) => ReactNode;
  children?: ReactNode;
}

export function SubscriptionStatus({
  render,
  children,
}: SubscriptionStatusProps) {
  const { subscription, isPaidUser, isTrialing, isCanceled } =
    useSubscriptionData();

  if (render) {
    return <>{render({ subscription, isPaidUser, isTrialing, isCanceled })}</>;
  }

  return <>{children}</>;
}

/**
 * TrackSubscriptionEvent Component
 * Tracks a subscription event when mounted or on trigger
 */
export interface TrackSubscriptionEventProps {
  event:
    | "started"
    | "upgraded"
    | "downgraded"
    | "canceled"
    | "paused"
    | "reactivated"
    | "trial_started"
    | "trial_converted"
    | "trial_expired";
  properties: SubscriptionProperties & {
    previous_plan?: string;
    cancellation_reason?: string;
  };
  trackOnMount?: boolean; // Track immediately when component mounts
  children?: ReactNode;
}

export function TrackSubscriptionEvent({
  event,
  properties,
  trackOnMount = false,
  children,
}: TrackSubscriptionEventProps) {
  const tracking = useSubscriptionTracking();

  useEffect(() => {
    if (!trackOnMount) return;

    switch (event) {
      case "started":
        tracking.trackSubscriptionStarted(properties);
        break;
      case "upgraded":
        tracking.trackSubscriptionUpgraded(properties);
        break;
      case "downgraded":
        tracking.trackSubscriptionDowngraded(properties);
        break;
      case "canceled":
        tracking.trackSubscriptionCanceled(properties);
        break;
      case "paused":
        tracking.trackSubscriptionPaused(properties);
        break;
      case "reactivated":
        tracking.trackSubscriptionReactivated(properties);
        break;
      case "trial_started":
        tracking.trackTrialStarted(properties);
        break;
      case "trial_converted":
        tracking.trackTrialConverted(properties);
        break;
      case "trial_expired":
        tracking.trackTrialExpired(properties);
        break;
    }
  }, [event, properties, trackOnMount, tracking]);

  return <>{children}</>;
}

/**
 * ConditionalRender Component
 * Conditionally renders children based on subscription status
 */
export interface ConditionalRenderProps {
  showFor?: "paid" | "trial" | "canceled" | "free" | "any";
  children: ReactNode;
  fallback?: ReactNode;
}

export function ConditionalRender({
  showFor = "paid",
  children,
  fallback,
}: ConditionalRenderProps) {
  const { subscription, isPaidUser, isTrialing, isCanceled } =
    useSubscriptionData();

  let shouldShow = false;

  switch (showFor) {
    case "paid":
      shouldShow = isPaidUser && !isTrialing;
      break;
    case "trial":
      shouldShow = isTrialing;
      break;
    case "canceled":
      shouldShow = isCanceled;
      break;
    case "free":
      shouldShow = !isPaidUser && !isTrialing;
      break;
    case "any":
      shouldShow = true;
      break;
  }

  return <>{shouldShow ? children : fallback}</>;
}

/**
 * ChurnRiskBadge Component
 * Displays a badge with the current churn risk level
 */
export interface ChurnRiskBadgeProps {
  refreshInterval?: number;
  style?: React.CSSProperties;
  className?: string;
}

export function ChurnRiskBadge({
  refreshInterval = 60000,
  style,
  className,
}: ChurnRiskBadgeProps) {
  const { churnRisk, isLoading } = useChurnRisk({ refreshInterval });

  if (isLoading || !churnRisk) {
    return null;
  }

  const colors = {
    low: { bg: "#d1fae5", text: "#065f46", border: "#10b981" },
    medium: { bg: "#fef3c7", text: "#92400e", border: "#f59e0b" },
    high: { bg: "#fee2e2", text: "#991b1b", border: "#ef4444" },
    critical: { bg: "#fecaca", text: "#7f1d1d", border: "#dc2626" },
  };

  const color = colors[churnRisk.risk_category];

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: "600",
        backgroundColor: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
        ...style,
      }}
    >
      {churnRisk.risk_category.toUpperCase()} RISK ({churnRisk.risk_score}/100)
    </div>
  );
}

/**
 * SubscriptionMetric Component
 * Displays a specific subscription metric
 */
export interface SubscriptionMetricProps {
  metric:
    | "mrr"
    | "arr"
    | "plan"
    | "status"
    | "trial_end"
    | "billing_interval"
    | "provider";
  format?: (value: any) => string;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
  className?: string;
}

export function SubscriptionMetric({
  metric,
  format,
  prefix = "",
  suffix = "",
  style,
  className,
}: SubscriptionMetricProps) {
  const { subscription, isLoading } = useSubscriptionData();

  if (isLoading || !subscription) {
    return <span className={className} style={style}>—</span>;
  }

  let value: any;

  switch (metric) {
    case "mrr":
      value = subscription.mrr
        ? format
          ? format(subscription.mrr)
          : `$${(subscription.mrr / 100).toFixed(2)}`
        : "—";
      break;
    case "arr":
      value = subscription.arr
        ? format
          ? format(subscription.arr)
          : `$${(subscription.arr / 100).toFixed(2)}`
        : "—";
      break;
    case "plan":
      value = subscription.plan_name || subscription.plan_tier || "—";
      break;
    case "status":
      value = subscription.status || "—";
      break;
    case "trial_end":
      value = subscription.trial_end
        ? format
          ? format(subscription.trial_end)
          : new Date(subscription.trial_end).toLocaleDateString()
        : "—";
      break;
    case "billing_interval":
      value = subscription.billing_interval || "—";
      break;
    case "provider":
      value = subscription.provider || "—";
      break;
    default:
      value = "—";
  }

  return (
    <span className={className} style={style}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
