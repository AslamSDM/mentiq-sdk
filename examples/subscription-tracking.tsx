/**
 * Complete Subscription Tracking Examples for MentiQ SDK
 *
 * This file demonstrates:
 * - Basic setup and initialization
 * - User identification with subscription data
 * - Subscription event tracking
 * - React hooks usage
 * - React components usage
 * - Churn risk monitoring
 * - Payment webhook handling
 * - Real-world retention strategies
 */

import React, { useEffect, useState } from 'react';
import {
  init,
  identify,
  track,
  trackSubscriptionStarted,
  trackSubscriptionCanceled,
  trackSubscriptionUpgraded,
  trackPaymentFailed,
  trackTrialStarted,
  useChurnRisk,
  useSubscriptionData,
  useSubscriptionTracking,
  useSubscriptionAutoDetect,
  useSyncSubscription,
  ChurnRiskMonitor,
  ConditionalRender,
  SubscriptionMetric,
  ChurnRiskBadge,
  SubscriptionStatus,
} from 'mentiq-sdk';

// ============================================================================
// EXAMPLE 1: Basic Setup & Initialization
// ============================================================================

function App() {
  useEffect(() => {
    // Initialize MentiQ SDK
    init({
      apiKey: 'your-api-key',
      projectId: 'your-project-id',
      debug: true, // See subscription auto-detection logs
      enableSessionRecording: true,
    });

    // Identify user with subscription data
    identify('user_123', {
      email: 'user@example.com',
      name: 'John Doe',
      subscription: {
        status: 'active',
        plan_id: 'plan_abc123',
        plan_name: 'Pro Plan',
        plan_tier: 'pro',
        mrr: 9900, // $99.00 in cents
        billing_interval: 'month',
        current_period_start: '2024-01-01T00:00:00Z',
        current_period_end: '2024-02-01T00:00:00Z',
        provider: 'stripe',
        provider_customer_id: 'cus_abc123',
        provider_subscription_id: 'sub_xyz789',
      },
    });

    // All subsequent events are now automatically enriched with subscription data!
    track('feature_used', { feature: 'analytics_dashboard' });
    // Event will include: subscription_status, subscription_plan, subscription_mrr, is_paid_user
  }, []);

  return (
    <ChurnRiskMonitor
      showWarning={true}
      refreshInterval={60000}
      onCriticalRisk={(risk) => {
        console.log('User at critical risk!', risk);
        // Show retention modal
      }}
    >
      <Dashboard />
    </ChurnRiskMonitor>
  );
}

// ============================================================================
// EXAMPLE 2: Checkout Success - Track Subscription Started
// ============================================================================

function CheckoutSuccess() {
  const { trackSubscriptionStarted } = useSubscriptionTracking();

  useEffect(() => {
    // User just completed checkout
    trackSubscriptionStarted({
      status: 'active',
      plan_name: 'Pro Plan',
      plan_tier: 'pro',
      mrr: 9900,
      billing_interval: 'month',
      provider: 'stripe',
      provider_subscription_id: 'sub_xyz789',
    });

    // Update user identity as well
    identify('user_123', {
      subscription: {
        status: 'active',
        plan_name: 'Pro Plan',
        mrr: 9900,
      },
    });
  }, []);

  return (
    <div>
      <h1>Welcome to Pro!</h1>
      <p>Your subscription is now active.</p>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Dashboard with Churn Risk Monitoring
// ============================================================================

function Dashboard() {
  const { churnRisk, isHighRisk, isCriticalRisk, refresh } = useChurnRisk({
    refreshInterval: 30000, // Check every 30 seconds
    onHighRisk: (risk) => {
      console.log('User is at risk of churning!', risk);
      // Trigger retention offer
      if (risk.risk_score > 70) {
        showRetentionModal();
      }
    },
  });

  const { subscription, isPaidUser, isTrialing, isCanceled } =
    useSubscriptionData();

  if (!isPaidUser) {
    return <UpgradePrompt />;
  }

  return (
    <div className="dashboard">
      <header>
        <h1>Dashboard</h1>
        <div className="subscription-info">
          <SubscriptionStatus />
          <ChurnRiskBadge />
        </div>
      </header>

      {/* Show warning for at-risk users */}
      {isHighRisk && (
        <div className="alert alert-warning">
          <h3>Your account health score is {churnRisk?.risk_score}/100</h3>
          <p>We noticed you haven't been using the product much lately.</p>
          <button onClick={showHelpModal}>Get help from our team</button>
        </div>
      )}

      {/* Show critical intervention for very at-risk users */}
      {isCriticalRisk && (
        <RetentionModal
          healthScore={churnRisk?.risk_score}
          factors={churnRisk?.factors}
          onAcceptOffer={handleRetentionOffer}
        />
      )}

      {/* Conditional features based on subscription */}
      <ConditionalRender showFor="paid">
        <PremiumFeatures />
      </ConditionalRender>

      <ConditionalRender showFor="trial">
        <TrialBanner daysLeft={calculateTrialDaysLeft(subscription)} />
      </ConditionalRender>

      {/* Account details */}
      <div className="account-details">
        <h3>
          Current Plan: <SubscriptionMetric metric="plan" />
        </h3>
        <p>
          MRR: <SubscriptionMetric metric="mrr" prefix="$" divisor={100} />
          /month
        </p>
        {isTrialing && (
          <p>
            Trial ends:{' '}
            <SubscriptionMetric metric="trial_end" format="date" />
          </p>
        )}
      </div>
    </div>
  );
}

function showRetentionModal() {
  // Implementation
}

function showHelpModal() {
  // Implementation
}

// ============================================================================
// EXAMPLE 4: Account Settings - Upgrade/Downgrade/Cancel
// ============================================================================

function AccountSettings() {
  const { subscription, isPaidUser } = useSubscriptionData();
  const {
    trackSubscriptionUpgraded,
    trackSubscriptionDowngraded,
    trackSubscriptionCanceled,
  } = useSubscriptionTracking();

  const handleUpgrade = async () => {
    // Call your backend to upgrade subscription
    const newSubscription = await upgradeToEnterprise();

    // Track upgrade event
    trackSubscriptionUpgraded({
      status: 'active',
      plan_name: 'Enterprise',
      plan_tier: 'enterprise',
      mrr: 29900,
      previous_plan: subscription.plan_name,
    });

    // Update user identity
    identify('user_123', {
      subscription: newSubscription,
    });
  };

  const handleDowngrade = async () => {
    const newSubscription = await downgradeToStarter();

    trackSubscriptionDowngraded({
      status: 'active',
      plan_name: 'Starter',
      plan_tier: 'starter',
      mrr: 2900,
      previous_plan: subscription.plan_name,
    });

    identify('user_123', {
      subscription: newSubscription,
    });
  };

  const handleCancel = async (reason: string, feedback: string) => {
    // Track cancellation with reason
    trackSubscriptionCanceled({
      status: 'canceled',
      plan_name: subscription.plan_name,
      mrr: subscription.mrr,
      cancellation_reason: reason,
      cancellation_feedback: feedback,
    });

    // Update subscription status
    identify('user_123', {
      subscription: {
        ...subscription,
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancellation_reason: reason,
      },
    });
  };

  return (
    <div className="account-settings">
      <h2>Subscription Settings</h2>

      {isPaidUser && (
        <>
          <div className="current-plan">
            <h3>Current Plan: {subscription.plan_name}</h3>
            <p>
              ${(subscription.mrr / 100).toFixed(2)}/{subscription.billing_interval}
            </p>
          </div>

          {subscription.plan_tier === 'pro' && (
            <button onClick={handleUpgrade}>Upgrade to Enterprise</button>
          )}

          {subscription.plan_tier === 'enterprise' && (
            <button onClick={handleDowngrade}>Downgrade to Pro</button>
          )}

          <CancellationFlow onCancel={handleCancel} />
        </>
      )}
    </div>
  );
}

async function upgradeToEnterprise() {
  // Your backend API call
  return {
    status: 'active',
    plan_name: 'Enterprise',
    plan_tier: 'enterprise',
    mrr: 29900,
  };
}

async function downgradeToStarter() {
  // Your backend API call
  return {
    status: 'active',
    plan_name: 'Starter',
    plan_tier: 'starter',
    mrr: 2900,
  };
}

// ============================================================================
// EXAMPLE 5: Cancellation Flow with Retention Offers
// ============================================================================

function CancellationFlow({
  onCancel,
}: {
  onCancel: (reason: string, feedback: string) => void;
}) {
  const [showFlow, setShowFlow] = useState(false);
  const [step, setStep] = useState<'reason' | 'alternatives' | 'confirm'>(
    'reason'
  );
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleReasonSubmit = () => {
    setStep('alternatives');
  };

  const handleAlternativeAccepted = (alternative: string) => {
    // User accepted an alternative (pause, discount, downgrade)
    track('retention_offer_accepted', { alternative });
    setShowFlow(false);
  };

  const handleFinalCancel = () => {
    onCancel(reason, feedback);
    setStep('confirm');
  };

  if (!showFlow) {
    return (
      <button
        onClick={() => setShowFlow(true)}
        className="btn btn-danger"
      >
        Cancel Subscription
      </button>
    );
  }

  if (step === 'reason') {
    return (
      <div className="cancellation-flow">
        <h3>We're sorry to see you go</h3>
        <p>Can you tell us why you're canceling?</p>

        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select a reason...</option>
          <option value="too_expensive">Too expensive</option>
          <option value="not_using">Not using the product</option>
          <option value="missing_features">Missing features I need</option>
          <option value="found_alternative">Found a better alternative</option>
          <option value="technical_issues">Too many technical issues</option>
          <option value="other">Other</option>
        </select>

        <textarea
          placeholder="Any additional feedback? (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
        />

        <button onClick={handleReasonSubmit} disabled={!reason}>
          Continue
        </button>
      </div>
    );
  }

  if (step === 'alternatives') {
    return (
      <div className="cancellation-alternatives">
        <h3>Before you go, would any of these help?</h3>

        {reason === 'too_expensive' && (
          <div className="alternative-card">
            <h4>Get 50% off for 3 months</h4>
            <p>Continue using all features at half price</p>
            <button onClick={() => handleAlternativeAccepted('discount_50')}>
              Accept Offer
            </button>
          </div>
        )}

        {reason === 'not_using' && (
          <div className="alternative-card">
            <h4>Pause for 1 month</h4>
            <p>Take a break and come back when you're ready. Keep all your data.</p>
            <button onClick={() => handleAlternativeAccepted('pause_1_month')}>
              Pause Subscription
            </button>
          </div>
        )}

        {reason === 'missing_features' && (
          <div className="alternative-card">
            <h4>Schedule a call with our team</h4>
            <p>Let's discuss your feature needs - we might be able to help!</p>
            <button onClick={() => handleAlternativeAccepted('schedule_call')}>
              Schedule Call
            </button>
          </div>
        )}

        <div className="alternative-card">
          <h4>Downgrade to Free Plan</h4>
          <p>Keep your account with limited features</p>
          <button onClick={() => handleAlternativeAccepted('downgrade_free')}>
            Downgrade Instead
          </button>
        </div>

        <button onClick={handleFinalCancel} className="btn-link">
          No thanks, cancel my subscription
        </button>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="cancellation-confirmed">
        <h3>Your subscription has been canceled</h3>
        <p>You'll continue to have access until the end of your billing period.</p>
        <p>We'd love to have you back in the future!</p>
      </div>
    );
  }

  return null;
}

// ============================================================================
// EXAMPLE 6: Trial Signup - Auto-sync Subscription
// ============================================================================

function TrialSignup() {
  const [user, setUser] = useState(null);

  // Automatically sync subscription changes
  useSyncSubscription(user?.subscription, {
    trackChanges: true, // Auto-track upgrades/downgrades/cancellations
  });

  const handleSignup = async (email: string, password: string) => {
    // Create user account
    const newUser = await createAccount(email, password);

    // Start trial
    const trial = await startTrial(newUser.id, 'pro');

    // Track trial started
    trackTrialStarted({
      status: 'trialing',
      plan_name: 'Pro Plan',
      plan_tier: 'pro',
      trial_start: trial.start_date,
      trial_end: trial.end_date,
      is_trial: true,
    });

    // Identify user with trial subscription
    identify(newUser.id, {
      email: newUser.email,
      subscription: {
        status: 'trialing',
        plan_name: 'Pro Plan',
        trial_start: trial.start_date,
        trial_end: trial.end_date,
        is_trial: true,
      },
    });

    setUser(newUser);
  };

  return (
    <div className="trial-signup">
      <h2>Start your 14-day free trial</h2>
      <SignupForm onSubmit={handleSignup} />
    </div>
  );
}

async function createAccount(email: string, password: string) {
  // Your API call
  return { id: 'user_123', email };
}

async function startTrial(userId: string, plan: string) {
  // Your API call
  return {
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// ============================================================================
// EXAMPLE 7: Payment Webhook Handler (Backend)
// ============================================================================

/**
 * Stripe webhook handler for subscription events
 * Use this in your backend API (Node.js/Express example)
 */

/*
import express from 'express';
import Stripe from 'stripe';
import axios from 'axios';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription events
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
  }

  res.json({ received: true });
});

async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata.user_id;

  // Track in MentiQ
  await trackToMentiQ({
    event_type: 'subscription_started',
    user_id: userId,
    properties: {
      subscription_status: subscription.status,
      subscription_plan: subscription.plan.nickname,
      subscription_mrr: subscription.plan.amount,
      subscription_provider: 'stripe',
      provider_subscription_id: subscription.id,
      billing_interval: subscription.plan.interval,
    },
  });

  // Update user in database
  await updateUserSubscription(userId, {
    status: subscription.status,
    plan_name: subscription.plan.nickname,
    mrr: subscription.plan.amount,
    provider: 'stripe',
    provider_subscription_id: subscription.id,
  });
}

async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata.user_id;
  const previousPlan = subscription.previous_attributes?.plan;

  // Detect upgrade/downgrade
  if (previousPlan && previousPlan.amount !== subscription.plan.amount) {
    const eventType =
      subscription.plan.amount > previousPlan.amount
        ? 'subscription_upgraded'
        : 'subscription_downgraded';

    await trackToMentiQ({
      event_type: eventType,
      user_id: userId,
      properties: {
        subscription_status: subscription.status,
        subscription_plan: subscription.plan.nickname,
        subscription_mrr: subscription.plan.amount,
        previous_plan: previousPlan.nickname,
      },
    });
  }

  // Handle cancellation
  if (subscription.status === 'canceled') {
    await trackToMentiQ({
      event_type: 'subscription_canceled',
      user_id: userId,
      properties: {
        subscription_status: 'canceled',
        subscription_plan: subscription.plan.nickname,
        subscription_mrr: subscription.plan.amount,
        cancellation_reason: subscription.cancellation_details?.reason,
      },
    });
  }

  await updateUserSubscription(userId, {
    status: subscription.status,
    plan_name: subscription.plan.nickname,
    mrr: subscription.plan.amount,
  });
}

async function handlePaymentFailed(invoice) {
  const userId = invoice.metadata.user_id;

  // Track payment failure in MentiQ
  await trackToMentiQ({
    event_type: 'payment_failed',
    user_id: userId,
    properties: {
      amount: invoice.amount_due,
      currency: invoice.currency,
      payment_status: 'failed',
      failure_reason: invoice.last_payment_error?.message,
      attempt_count: invoice.attempt_count,
    },
  });

  // Send notification to user
  await sendPaymentFailedEmail(userId, {
    amount: invoice.amount_due / 100,
    update_payment_url: `https://yourapp.com/billing/update-payment`,
  });
}

async function trackToMentiQ(data) {
  await axios.post('https://api.mentiq.io/api/v1/events', data, {
    headers: {
      'Authorization': `ApiKey ${process.env.MENTIQ_API_KEY}`,
      'X-Project-ID': process.env.MENTIQ_PROJECT_ID,
    },
  });
}
*/

// ============================================================================
// EXAMPLE 8: Admin Dashboard - View At-Risk Users
// ============================================================================

function AdminDashboard() {
  const [atRiskUsers, setAtRiskUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const projectId = 'your-project-id';

  useEffect(() => {
    loadAtRiskUsers();
  }, []);

  const loadAtRiskUsers = async () => {
    setLoading(true);

    // Fetch from MentiQ backend
    const response = await fetch(
      `https://api.mentiq.io/api/v1/projects/${projectId}/analytics/subscription-health?limit=50`,
      {
        headers: {
          Authorization: `ApiKey ${process.env.MENTIQ_API_KEY}`,
        },
      }
    );

    const data = await response.json();
    setAtRiskUsers(
      data.data.users.filter(
        (u) => u.risk_category === 'critical' || u.risk_category === 'at_risk'
      )
    );
    setLoading(false);
  };

  const handleOutreach = async (userId: string) => {
    // Create customer success task
    await createOutreachTask(userId);
    track('admin_outreach_initiated', { user_id: userId });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="admin-dashboard">
      <h2>At-Risk Users ({atRiskUsers.length})</h2>

      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>MRR</th>
            <th>Health Score</th>
            <th>Risk</th>
            <th>Days Inactive</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {atRiskUsers.map((user) => (
            <tr key={user.user_id}>
              <td>{user.email}</td>
              <td>{user.subscription_plan}</td>
              <td>${user.mrr.toFixed(2)}</td>
              <td>
                <span
                  className={`health-score ${getRiskClass(user.risk_category)}`}
                >
                  {user.health_score}/100
                </span>
              </td>
              <td>
                <span className={`badge ${getRiskClass(user.risk_category)}`}>
                  {user.risk_category}
                </span>
              </td>
              <td>{user.days_since_last_active} days</td>
              <td>
                <button onClick={() => handleOutreach(user.user_id)}>
                  Contact User
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getRiskClass(category: string) {
  switch (category) {
    case 'critical':
    case 'churn_imminent':
      return 'danger';
    case 'at_risk':
      return 'warning';
    default:
      return 'success';
  }
}

async function createOutreachTask(userId: string) {
  // Your internal task creation logic
  console.log('Creating outreach task for:', userId);
}

// ============================================================================
// EXAMPLE 9: Auto-Detection with Manual Override
// ============================================================================

function SubscriptionSync() {
  const { detect, isDetecting, result, confidence } =
    useSubscriptionAutoDetect();
  const [manualData, setManualData] = useState(null);

  const handleAutoDetect = async () => {
    const detected = await detect();

    if (detected && confidence > 80) {
      // High confidence - use detected data
      console.log('Auto-detected subscription:', detected);
      identify('user_123', {
        subscription: detected,
      });
    } else {
      // Low confidence - ask user to enter manually
      setShowManualForm(true);
    }
  };

  const handleManualSubmit = (data) => {
    identify('user_123', {
      subscription: {
        ...data,
        provider: 'manual',
      },
    });
    setManualData(data);
  };

  return (
    <div className="subscription-sync">
      <h3>Sync Your Subscription</h3>

      <button onClick={handleAutoDetect} disabled={isDetecting}>
        {isDetecting ? 'Detecting...' : 'Auto-Detect from Stripe/Paddle'}
      </button>

      {result && (
        <div className="detection-result">
          <p>
            Detected {result.provider} subscription with {confidence}%
            confidence
          </p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="manual-form">
        <h4>Or enter manually:</h4>
        <ManualSubscriptionForm onSubmit={handleManualSubmit} />
      </div>
    </div>
  );
}

function setShowManualForm(show: boolean) {
  // Implementation
}

// ============================================================================
// EXAMPLE 10: Retention Modal Component
// ============================================================================

function RetentionModal({
  healthScore,
  factors,
  onAcceptOffer,
}: {
  healthScore: number;
  factors: any;
  onAcceptOffer: (offer: string) => void;
}) {
  const [showModal, setShowModal] = useState(true);

  const getOffer = () => {
    if (healthScore < 25) {
      return {
        title: 'We want to make this right',
        discount: 50,
        duration: 3,
        message:
          'Get 50% off for 3 months while we help you get the most out of our product.',
      };
    } else if (healthScore < 50) {
      return {
        title: 'Let us help you succeed',
        discount: 25,
        duration: 3,
        message: 'Get 25% off and a personalized onboarding session.',
      };
    }
    return null;
  };

  const offer = getOffer();
  if (!offer || !showModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal retention-modal">
        <h2>{offer.title}</h2>

        <div className="health-score">
          <div className="score-circle">
            <span className="score">{healthScore}</span>
            <span className="label">/100</span>
          </div>
          <p>Your current account health score</p>
        </div>

        <div className="factors">
          <h4>We noticed:</h4>
          <ul>
            {factors.days_since_last_active > 14 && (
              <li>You haven't logged in for {factors.days_since_last_active} days</li>
            )}
            {factors.feature_adoption_rate < 0.3 && (
              <li>
                You're only using{' '}
                {(factors.feature_adoption_rate * 100).toFixed(0)}% of available
                features
              </li>
            )}
            {factors.payment_failures > 0 && (
              <li>{factors.payment_failures} failed payment attempts</li>
            )}
          </ul>
        </div>

        <div className="offer">
          <h3>{offer.message}</h3>
          <div className="discount-badge">
            {offer.discount}% OFF for {offer.duration} months
          </div>
        </div>

        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              onAcceptOffer(`discount_${offer.discount}`);
              track('retention_offer_accepted', {
                health_score: healthScore,
                discount: offer.discount,
              });
              setShowModal(false);
            }}
          >
            Accept Offer
          </button>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function UpgradePrompt() {
  return (
    <div className="upgrade-prompt">
      <h2>Upgrade to unlock all features</h2>
      <button>Start Free Trial</button>
    </div>
  );
}

function PremiumFeatures() {
  return <div>Premium Features Content</div>;
}

function TrialBanner({ daysLeft }: { daysLeft: number }) {
  return (
    <div className="trial-banner">
      <p>
        {daysLeft} days left in your trial. Upgrade now to continue using all
        features.
      </p>
      <button>Upgrade to Pro</button>
    </div>
  );
}

function calculateTrialDaysLeft(subscription: any) {
  if (!subscription?.trial_end) return 0;
  const end = new Date(subscription.trial_end);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function SignupForm({ onSubmit }: { onSubmit: (email: string, password: string) => void }) {
  return <div>Signup form</div>;
}

function ManualSubscriptionForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  return <div>Manual subscription form</div>;
}

// ============================================================================
// EXPORT EXAMPLES
// ============================================================================

export {
  App,
  CheckoutSuccess,
  Dashboard,
  AccountSettings,
  CancellationFlow,
  TrialSignup,
  AdminDashboard,
  SubscriptionSync,
  RetentionModal,
};
