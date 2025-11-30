# Example Usage

This directory contains example implementations of the MentiQ Analytics SDK.

## Files

- `basic-react.tsx` - Basic React app integration
- `backend-integration.tsx` - Backend integration examples
- `nextjs-backend-integration.tsx` - Next.js backend integration
- `onboarding-tracking.tsx` - **NEW!** Comprehensive onboarding tracking examples
- `session-recording-examples.md` - Session recording implementation guide
- `enhanced-funnel-tracking.tsx` - Advanced tracking patterns and e-commerce examples

## Featured: Onboarding Tracking

The `onboarding-tracking.tsx` file contains 6 complete examples showing how to track user onboarding flows:

### Examples Included:

1. **Basic Onboarding Flow** - Simple step-by-step onboarding
2. **Multi-Step Form** - Track form completion with timing
3. **Product Tour** - Interactive tutorial with skip/abandon tracking
4. **SaaS Onboarding** - Conditional steps based on user tier
5. **Progress Monitor** - Visual progress bar component
6. **Vanilla JavaScript** - Non-React implementation

### Key Concepts:

⚠️ **Important:** OnboardingTracker is NOT automatic! You must manually call tracker methods:

```tsx
// ❌ Won't track automatically
<button onClick={createProfile}>Create Profile</button>;

// ✅ Must explicitly track
const handleCreateProfile = async () => {
  await createProfile();
  tracker.completeStep("profile_created"); // Manual tracking
};
```

### How It Works:

```
┌─────────────────┐
│   Your App      │
│                 │
│  tracker.start()│──┐
│  tracker.       │  │  Events sent via analytics.track()
│  completeStep() │──┤
│                 │  │  • onboarding_started
└─────────────────┘  │  • onboarding_step_completed
                     │  • onboarding_completed
                     ▼
              ┌──────────────┐
              │   Backend    │
              │   Events DB  │  Stores events with:
              │              │  • step_name, step_index
              │              │  • user_id, timestamp
              └──────┬───────┘  • properties
                     │
                     ▼
              ┌──────────────┐
              │  Analytics   │  Aggregates:
              │   Engine     │  • Completion rates
              │              │  • Dropoff points
              └──────┬───────┘  • Time metrics
                     │
                     ▼
              ┌──────────────┐
              │  Dashboard   │  Displays:
              │              │  • Funnel visualization
              │              │  • Step-by-step stats
              └──────────────┘  • User journeys
```

**Flow:**

1. **SDK Side**: You call `tracker.completeStep()` → Sends formatted events
2. **Backend**: Events stored in database with metadata
3. **Analytics**: Backend aggregates events into funnel statistics
4. **Dashboard**: Displays completion rates, dropoff points, time metrics

### Quick Start:

```tsx
import { useOnboardingTracker } from "mentiq-sdk";

const tracker = useOnboardingTracker(analytics, {
  steps: [
    { name: "signup", index: 0, required: true },
    { name: "profile", index: 1, required: true },
    { name: "tutorial", index: 2, required: false },
  ],
});

tracker?.start();
tracker?.completeStep("signup");
tracker?.skipStep("tutorial", "user_choice");
tracker?.complete();
```

## Running Examples

Each example is self-contained and shows different integration patterns. Copy the relevant code into your project and modify as needed.
