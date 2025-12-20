/**
 * Subscription Provider Auto-Detection
 *
 * This module detects subscription data from popular payment providers
 * (Stripe, Paddle, Chargebee) by checking browser globals and localStorage.
 */

import { SubscriptionProperties } from "./types";

export interface ProviderDetectionResult {
  detected: boolean;
  provider?: "stripe" | "paddle" | "chargebee";
  confidence: number; // 0-100, how confident we are in the detection
  subscription?: SubscriptionProperties;
  error?: string;
}

declare global {
  interface Window {
    Stripe?: any;
    Paddle?: any;
    Chargebee?: any;
  }
}

/**
 * Detect Stripe subscription data
 */
export function detectStripeSubscription(): ProviderDetectionResult {
  if (typeof window === "undefined") {
    return { detected: false, confidence: 0 };
  }

  try {
    let confidence = 0;
    const subscription: Partial<SubscriptionProperties> = {
      provider: "stripe",
    };

    // Check if Stripe.js is loaded
    if (window.Stripe) {
      confidence += 30;
    }

    // Check localStorage for Stripe-related data
    const storageKeys = Object.keys(localStorage);

    // Look for common Stripe storage patterns
    const stripeKeys = storageKeys.filter(
      (key) =>
        key.includes("stripe") ||
        key.includes("customer_id") ||
        key.includes("subscription_id") ||
        key.includes("stripe_customer") ||
        key.includes("stripe_subscription")
    );

    if (stripeKeys.length > 0) {
      confidence += 20;

      // Try to extract subscription data
      for (const key of stripeKeys) {
        try {
          const value = localStorage.getItem(key);
          if (!value) continue;

          // Try parsing as JSON
          try {
            const parsed = JSON.parse(value);

            // Look for subscription object patterns
            if (parsed.subscription || parsed.subscriptions) {
              const sub = parsed.subscription || parsed.subscriptions[0];
              if (sub) {
                confidence += 20;
                subscription.status = mapStripeStatus(sub.status);
                subscription.provider_subscription_id = sub.id;
                subscription.current_period_start = sub.current_period_start
                  ? new Date(sub.current_period_start * 1000).toISOString()
                  : undefined;
                subscription.current_period_end = sub.current_period_end
                  ? new Date(sub.current_period_end * 1000).toISOString()
                  : undefined;

                // Extract plan info
                if (sub.plan || sub.items?.data?.[0]?.plan) {
                  const plan = sub.plan || sub.items.data[0].plan;
                  subscription.plan_id = plan.id;
                  subscription.plan_name = plan.nickname || plan.product;
                  subscription.billing_interval = plan.interval;

                  // Calculate MRR
                  const amount = plan.amount || 0;
                  if (plan.interval === "month") {
                    subscription.mrr = amount;
                    subscription.arr = amount * 12;
                  } else if (plan.interval === "year") {
                    subscription.arr = amount;
                    subscription.mrr = Math.round(amount / 12);
                  }

                  subscription.currency = plan.currency;
                  confidence += 30;
                }

                // Trial info
                if (sub.trial_start || sub.trial_end) {
                  subscription.is_trial = true;
                  subscription.trial_start = sub.trial_start
                    ? new Date(sub.trial_start * 1000).toISOString()
                    : undefined;
                  subscription.trial_end = sub.trial_end
                    ? new Date(sub.trial_end * 1000).toISOString()
                    : undefined;
                }
              }
            }

            // Look for customer object
            if (parsed.customer || parsed.id?.startsWith("cus_")) {
              const customer = parsed.customer || parsed;
              subscription.provider_customer_id = customer.id;
              confidence += 10;
            }
          } catch {
            // Not JSON, might be a direct value
            if (value.startsWith("cus_")) {
              subscription.provider_customer_id = value;
              confidence += 10;
            } else if (value.startsWith("sub_")) {
              subscription.provider_subscription_id = value;
              confidence += 10;
            }
          }
        } catch (e) {
          // Skip this key
        }
      }
    }

    // Check for Stripe Elements in DOM (indicates Stripe is being used)
    const stripeElements = document.querySelectorAll(
      '[class*="stripe"], [id*="stripe"]'
    );
    if (stripeElements.length > 0) {
      confidence += 10;
    }

    if (confidence > 30) {
      return {
        detected: true,
        provider: "stripe",
        confidence: Math.min(confidence, 100),
        subscription: subscription as SubscriptionProperties,
      };
    }

    return { detected: false, confidence };
  } catch (error) {
    return {
      detected: false,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Detect Paddle subscription data
 */
export function detectPaddleSubscription(): ProviderDetectionResult {
  if (typeof window === "undefined") {
    return { detected: false, confidence: 0 };
  }

  try {
    let confidence = 0;
    const subscription: Partial<SubscriptionProperties> = {
      provider: "paddle",
    };

    // Check if Paddle.js is loaded
    if (window.Paddle) {
      confidence += 30;
    }

    // Check localStorage for Paddle-related data
    const storageKeys = Object.keys(localStorage);
    const paddleKeys = storageKeys.filter(
      (key) =>
        key.includes("paddle") ||
        key.includes("checkout_id") ||
        key.includes("paddle_subscription")
    );

    if (paddleKeys.length > 0) {
      confidence += 20;

      for (const key of paddleKeys) {
        try {
          const value = localStorage.getItem(key);
          if (!value) continue;

          try {
            const parsed = JSON.parse(value);

            // Paddle subscription structure
            if (parsed.subscription_id || parsed.subscription) {
              const sub = parsed.subscription || parsed;
              confidence += 20;

              subscription.provider_subscription_id = sub.subscription_id;
              subscription.status = mapPaddleStatus(sub.state || sub.status);

              // Paddle uses different field names
              subscription.plan_id = sub.subscription_plan_id;
              subscription.current_period_start = sub.next_payment?.date;
              subscription.cancel_at_period_end = sub.paused_at ? true : false;

              // Pricing
              if (sub.next_payment) {
                const amount = parseFloat(sub.next_payment.amount) * 100; // Convert to cents
                subscription.currency = sub.next_payment.currency;

                // Paddle typically shows per-payment amount
                if (sub.subscription_plan_id?.includes("month")) {
                  subscription.mrr = amount;
                  subscription.arr = amount * 12;
                } else if (sub.subscription_plan_id?.includes("year")) {
                  subscription.arr = amount;
                  subscription.mrr = Math.round(amount / 12);
                } else {
                  subscription.mrr = amount; // Assume monthly
                }

                confidence += 30;
              }
            }

            // Customer info
            if (parsed.user_id || parsed.email) {
              subscription.provider_customer_id = parsed.user_id;
              confidence += 10;
            }
          } catch {
            // Not JSON
          }
        } catch (e) {
          // Skip
        }
      }
    }

    // Check for Paddle checkout iframe
    const paddleIframe = document.querySelector('iframe[src*="paddle"]');
    if (paddleIframe) {
      confidence += 10;
    }

    if (confidence > 30) {
      return {
        detected: true,
        provider: "paddle",
        confidence: Math.min(confidence, 100),
        subscription: subscription as SubscriptionProperties,
      };
    }

    return { detected: false, confidence };
  } catch (error) {
    return {
      detected: false,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Detect Chargebee subscription data
 */
export function detectChargebeeSubscription(): ProviderDetectionResult {
  if (typeof window === "undefined") {
    return { detected: false, confidence: 0 };
  }

  try {
    let confidence = 0;
    const subscription: Partial<SubscriptionProperties> = {
      provider: "chargebee",
    };

    // Check if Chargebee is loaded
    if (window.Chargebee) {
      confidence += 30;
    }

    // Check localStorage
    const storageKeys = Object.keys(localStorage);
    const chargebeeKeys = storageKeys.filter(
      (key) =>
        key.includes("chargebee") ||
        key.includes("cb_") ||
        key.includes("chargebee_subscription")
    );

    if (chargebeeKeys.length > 0) {
      confidence += 20;

      for (const key of chargebeeKeys) {
        try {
          const value = localStorage.getItem(key);
          if (!value) continue;

          try {
            const parsed = JSON.parse(value);

            // Chargebee subscription structure
            if (parsed.subscription || parsed.id) {
              const sub = parsed.subscription || parsed;
              confidence += 20;

              subscription.provider_subscription_id = sub.id;
              subscription.status = mapChargebeeStatus(sub.status);
              subscription.provider_customer_id = sub.customer_id;

              // Chargebee has detailed billing info
              if (sub.plan_id) {
                subscription.plan_id = sub.plan_id;
                subscription.plan_name = sub.plan_name;
                subscription.billing_interval = mapChargebeePeriodUnit(
                  sub.billing_period_unit
                );

                confidence += 30;
              }

              // Pricing
              if (sub.plan_amount || sub.recurring_total) {
                const amount = sub.plan_amount || sub.recurring_total;
                subscription.currency = sub.currency_code;

                if (sub.billing_period_unit === "month") {
                  subscription.mrr = amount;
                  subscription.arr = amount * 12;
                } else if (sub.billing_period_unit === "year") {
                  subscription.arr = amount;
                  subscription.mrr = Math.round(amount / 12);
                }
              }

              // Trial
              if (sub.trial_end) {
                subscription.is_trial = true;
                subscription.trial_end = new Date(
                  sub.trial_end * 1000
                ).toISOString();
              }

              // Dates
              if (sub.current_term_start) {
                subscription.current_period_start = new Date(
                  sub.current_term_start * 1000
                ).toISOString();
              }
              if (sub.current_term_end) {
                subscription.current_period_end = new Date(
                  sub.current_term_end * 1000
                ).toISOString();
              }
            }
          } catch {
            // Not JSON
          }
        } catch (e) {
          // Skip
        }
      }
    }

    // Check for Chargebee portal elements
    const chargebeeElements = document.querySelectorAll(
      '[class*="chargebee"], [id*="chargebee"]'
    );
    if (chargebeeElements.length > 0) {
      confidence += 10;
    }

    if (confidence > 30) {
      return {
        detected: true,
        provider: "chargebee",
        confidence: Math.min(confidence, 100),
        subscription: subscription as SubscriptionProperties,
      };
    }

    return { detected: false, confidence };
  } catch (error) {
    return {
      detected: false,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Auto-detect subscription from all supported providers
 * Returns the highest confidence detection result
 */
export function autoDetectSubscription(): ProviderDetectionResult {
  const results = [
    detectStripeSubscription(),
    detectPaddleSubscription(),
    detectChargebeeSubscription(),
  ];

  // Filter detected results and sort by confidence
  const detected = results
    .filter((r) => r.detected)
    .sort((a, b) => b.confidence - a.confidence);

  if (detected.length > 0) {
    return detected[0];
  }

  // Return the result with highest confidence even if not detected
  const highestConfidence = results.sort((a, b) => b.confidence - a.confidence)[0];
  return highestConfidence;
}

// Helper functions to map provider-specific statuses to our standard statuses

function mapStripeStatus(
  status: string
): SubscriptionProperties["status"] {
  const statusMap: Record<string, SubscriptionProperties["status"]> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "unpaid",
    incomplete: "incomplete",
    incomplete_expired: "incomplete_expired",
    paused: "paused",
  };

  return statusMap[status] || "active";
}

function mapPaddleStatus(
  status: string
): SubscriptionProperties["status"] {
  const statusMap: Record<string, SubscriptionProperties["status"]> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    paused: "paused",
    deleted: "canceled",
    cancelled: "canceled",
  };

  return statusMap[status] || "active";
}

function mapChargebeeStatus(
  status: string
): SubscriptionProperties["status"] {
  const statusMap: Record<string, SubscriptionProperties["status"]> = {
    active: "active",
    in_trial: "trialing",
    future: "incomplete",
    non_renewing: "canceled",
    paused: "paused",
    cancelled: "canceled",
  };

  return statusMap[status] || "active";
}

function mapChargebeePeriodUnit(
  unit: string
): SubscriptionProperties["billing_interval"] {
  const unitMap: Record<string, SubscriptionProperties["billing_interval"]> = {
    day: "day",
    week: "week",
    month: "month",
    year: "year",
  };

  return unitMap[unit] || "month";
}
