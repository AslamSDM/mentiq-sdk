# Enhanced Funnel Management & Session Analytics

This document describes the enhanced funnel management and detailed session analytics features added to the MentiQ Analytics SDK.

## Enhanced Funnel Management

### Overview

The enhanced funnel tracking provides better progression tracking, abandonment detection, and automatic timeout handling for user funnels.

### Key Features

- **Automatic abandonment detection** with configurable timeouts
- **Step progression tracking** with time-based metrics
- **Funnel state management** with complete step history
- **Abandonment reason tracking** for better insights

### API Methods

#### `startFunnel(funnelName: string, properties?: object)`

Initializes a new funnel tracking session.

```typescript
import { startFunnel } from "@mentiq/analytics";

startFunnel("purchase_funnel", {
  campaign: "holiday_sale",
  source: "homepage",
  user_segment: "premium",
});
```

**Features:**

- Clears any existing funnel state
- Sets up automatic abandonment timeout (5 minutes default)
- Tracks funnel start event
- Initializes step progression tracking

#### `advanceFunnel(funnelName: string, stepName: string, properties?: object)`

Advances the funnel to the next step.

```typescript
import { advanceFunnel } from "@mentiq/analytics";

advanceFunnel("purchase_funnel", "product_view", {
  product_id: "abc123",
  product_category: "electronics",
  price: 299.99,
});
```

**Features:**

- Automatically increments step counter
- Calculates time spent in funnel
- Tracks previous step for dropout analysis
- Resets abandonment timer
- Records step completion percentage

#### `abandonFunnel(funnelName: string, reason?: string, properties?: object)`

Manually abandons a funnel with optional reason tracking.

```typescript
import { abandonFunnel } from "@mentiq/analytics";

abandonFunnel("purchase_funnel", "high_shipping_cost", {
  abandon_page: "/checkout",
  cart_value: 299.99,
  shipping_cost: 50.0,
});
```

**Tracked Data:**

- Step where abandonment occurred
- Time before abandonment
- Completion percentage
- Custom abandonment reason
- Steps completed before abandonment

#### `completeFunnel(funnelName: string, properties?: object)`

Marks a funnel as successfully completed.

```typescript
import { completeFunnel } from "@mentiq/analytics";

completeFunnel("purchase_funnel", {
  order_id: "order_12345",
  total_amount: 299.99,
  conversion_time: 180000, // 3 minutes
});
```

#### `getFunnelState(funnelName: string)`

Retrieves the current state of an active funnel.

```typescript
import { getFunnelState } from "@mentiq/analytics";

const state = getFunnelState("purchase_funnel");
console.log(state);
// {
//   funnelName: 'purchase_funnel',
//   currentStep: 2,
//   startTime: 1699123456789,
//   steps: ['start', 'product_view'],
//   isActive: true,
//   timeInFunnel: 45000
// }
```

### Automatic Features

#### Timeout-based Abandonment

- Funnels automatically abandon after 5 minutes of inactivity
- Timer resets with each `advanceFunnel()` call
- Abandonment reason set to 'timeout'

#### Step History Tracking

- Complete progression history maintained
- Previous step tracking for dropout analysis
- Time spent at each step calculation

## Enhanced Session Analytics

### Overview

Enhanced session tracking provides richer engagement scoring, bounce likelihood prediction, and detailed interaction metrics.

### Key Metrics

#### Engagement Score (0-100)

A weighted score based on user interactions:

- **Click engagement (25 points max)**: 2 points per click event
- **Scroll engagement (20 points max)**: Points equal to scroll depth percentage
- **Time engagement (30 points max)**: 3 points per minute (diminishing returns after 10 min)
- **Page engagement (20 points max)**: 4 points per page view
- **Scroll event engagement (5 points max)**: 0.5 points per scroll event

#### Bounce Likelihood (0-100%)

Predicts likelihood of user bouncing based on:

- Multiple page views (-30%)
- Active clicking (-20%)
- Active scrolling (-15%)
- Deep scroll engagement (-15%)
- Session duration thresholds (-20% total)

### API Methods

#### `getActiveSession()`

Returns enhanced session data with calculated metrics.

```typescript
import { getActiveSession } from "@mentiq/analytics";

const session = getActiveSession();
console.log(session);
// {
//   startTime: 1699123456789,
//   duration: 120000,
//   pageViews: 3,
//   clicks: 8,
//   scrollDepth: 75,
//   maxScrollDepth: 85,
//   scrollEvents: 12,
//   clickEvents: 8,
//   pageChanges: 3,
//   engagementScore: 67.5,
//   bounceLikelihood: 25.0,
//   isActive: true
// }
```

#### `calculateEngagementScore()`

Calculates and returns the current engagement score.

```typescript
import { calculateEngagementScore } from "@mentiq/analytics";

const score = calculateEngagementScore();
console.log(`Current engagement: ${score}/100`);
```

### Enhanced Data Collection

#### Automatic Event Counting

- **Click Events**: Automatically counted on all click interactions
- **Scroll Events**: Debounced scroll event counting (1-second intervals)
- **Page Changes**: Tracked on every page navigation

#### Real-time Metrics Updates

- Engagement scores calculated in real-time
- Bounce likelihood updated with each interaction
- Session duration tracked continuously

## Usage Patterns

### E-commerce Funnel Tracking

```typescript
// Start purchase funnel
startFunnel("purchase", { source: "search" });

// Track product interactions
advanceFunnel("purchase", "product_view", { product_id: "123" });
advanceFunnel("purchase", "add_to_cart", { quantity: 2 });

// Handle checkout process
advanceFunnel("purchase", "checkout_start");
advanceFunnel("purchase", "payment_info");

// Complete or abandon
if (purchaseSuccess) {
  completeFunnel("purchase", { order_id: "abc123", value: 299.99 });
} else {
  abandonFunnel("purchase", "payment_failed", { error_code: "card_declined" });
}
```

### Content Engagement Tracking

```typescript
// Monitor reading engagement
setInterval(() => {
  const engagement = calculateEngagementScore();
  const session = getActiveSession();

  if (engagement > 70) {
    // High engagement - show related content
    showRecommendations();
  } else if (session.bounceLikelihood > 80) {
    // High bounce risk - show retention popup
    showRetentionOffer();
  }
}, 10000); // Check every 10 seconds
```

### A/B Test Integration

```typescript
// Enhanced funnel tracking for A/B testing
startFunnel("signup_v2", {
  variant: "simplified_form",
  test_id: "signup_optimization_001",
});

advanceFunnel("signup_v2", "form_start", {
  form_fields: ["email", "password"], // Track simplified vs full form
});

// Track engagement during form completion
const checkEngagement = setInterval(() => {
  const engagement = calculateEngagementScore();
  if (engagement < 30) {
    // Low engagement on signup form
    abandonFunnel("signup_v2", "low_engagement", {
      engagement_score: engagement,
      form_completion: getFormCompletionPercentage(),
    });
    clearInterval(checkEngagement);
  }
}, 5000);
```

## Best Practices

### Funnel Management

1. **Always start funnels explicitly** - Don't rely on implicit funnel starts
2. **Use descriptive step names** - Makes analysis easier
3. **Track abandonment reasons** - Helps identify optimization opportunities
4. **Set meaningful properties** - Include context for better analysis

### Session Analytics

1. **Monitor engagement trends** - Use for real-time personalization
2. **Set engagement thresholds** - Trigger actions based on scores
3. **Combine with funnel data** - Correlate engagement with conversion
4. **Track bounce likelihood** - Implement retention strategies

### Performance Considerations

1. **Debounced event tracking** - Prevents excessive event generation
2. **Efficient calculation methods** - Metrics calculated on-demand
3. **Automatic cleanup** - Funnel states cleared on completion/abandonment
4. **Memory management** - Event queues and timers properly cleared

## Migration from Basic Tracking

### Before (Basic Funnel Tracking)

```typescript
trackFunnelStep("purchase", "cart", 1);
trackFunnelStep("purchase", "checkout", 2);
trackFunnelStep("purchase", "payment", 3);
completeFunnel("purchase");
```

### After (Enhanced Funnel Tracking)

```typescript
startFunnel("purchase", { source: "homepage" });
advanceFunnel("purchase", "cart");
advanceFunnel("purchase", "checkout");
advanceFunnel("purchase", "payment");
completeFunnel("purchase", { order_value: 299.99 });
```

The enhanced version provides:

- Automatic step numbering
- Time-based metrics
- Abandonment detection
- Better analytics data structure
