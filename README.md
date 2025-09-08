# MentiQ Analytics SDK

A lightweight, type-safe analytics SDK for React and Next.js applications. Track user events, page views, and user behavior with ease.

## Features

- 🚀 **Lightweight** - Minimal bundle size
- 🎯 **Type-safe** - Full TypeScript support
- ⚛️ **React-first** - Built-in hooks and components
- 🔄 **Next.js ready** - App Router and Pages Router support
- 📦 **Auto-batching** - Efficient event queuing and sending
- 🛡️ **Privacy-focused** - GDPR compliant, local storage only
- 🎛️ **Flexible** - Multiple providers, custom events
- 📊 **Rich context** - Automatic page, user, and session tracking

## Installation

```bash
npm install mentiq-sdk
# or
yarn add mentiq-sdk
# or
pnpm add mentiq-sdk
```

## Quick Start

### Basic Usage

```typescript
import { init, track, page, identify } from "mentiq-sdk";

// Initialize the SDK
init({
  apiKey: "your-api-key",
  debug: true, // Enable debug mode in development
});

// Track events
track("button_clicked", {
  button_id: "signup",
  location: "header",
});

// Track page views
page({
  title: "Home Page",
  category: "marketing",
});

// Identify users
identify("user-123", {
  email: "user@example.com",
  plan: "premium",
});
```

### React Integration

```tsx
import React from "react";
import { AnalyticsProvider, useAnalytics } from "mentiq-sdk";

// Wrap your app with AnalyticsProvider
function App() {
  return (
    <AnalyticsProvider
      config={{
        apiKey: "your-api-key",
        debug: process.env.NODE_ENV === "development",
      }}
    >
      <MyComponent />
    </AnalyticsProvider>
  );
}

// Use analytics in components
function MyComponent() {
  const { track, page, identify } = useAnalytics();

  const handleClick = () => {
    track("cta_clicked", {
      cta_text: "Get Started",
      page_section: "hero",
    });
  };

  return <button onClick={handleClick}>Get Started</button>;
}
```

### Next.js Integration

#### App Router

```tsx
// app/layout.tsx
import { AnalyticsProvider } from "mentiq-sdk";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider
          config={{
            apiKey: process.env.NEXT_PUBLIC_ANALYTICS_API_KEY!,
            enableAutoPageTracking: true,
          }}
        >
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

#### Pages Router

```tsx
// pages/_app.tsx
import type { AppProps } from "next/app";
import { AnalyticsProvider } from "mentiq-sdk";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AnalyticsProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_ANALYTICS_API_KEY!,
        enableAutoPageTracking: true,
      }}
    >
      <Component {...pageProps} />
    </AnalyticsProvider>
  );
}
```

## Advanced Usage

### Custom Hooks

```tsx
import {
  usePageTracking,
  useComponentTracking,
  useInteractionTracking,
  useABTest,
} from "mentiq-sdk";

function MyComponent() {
  // Automatic page tracking
  usePageTracking({ category: "product" });

  // Component lifecycle tracking
  useComponentTracking("ProductCard");

  // Interaction tracking
  const { trackClick, trackHover } = useInteractionTracking();

  // A/B testing
  const { variant, trackConversion } = useABTest("checkout_button", [
    "blue",
    "green",
    "red",
  ]);

  return (
    <div>
      <button
        className={`btn-${variant}`}
        onClick={() => trackConversion({ revenue: 99.99 })}
      >
        Buy Now
      </button>
    </div>
  );
}
```

### Tracking Components

```tsx
import {
  TrackView,
  TrackClick,
  TrackForm,
  TrackScroll,
  TrackTime,
} from "mentiq-sdk";

function MyPage() {
  return (
    <TrackTime intervals={[30, 60, 120]}>
      <TrackScroll milestones={[25, 50, 75, 100]}>
        <TrackView
          event="hero_viewed"
          properties={{ section: "hero" }}
          threshold={0.7}
        >
          <div>Hero Section</div>
        </TrackView>

        <TrackClick event="cta_clicked" properties={{ location: "sidebar" }}>
          <button>Click me</button>
        </TrackClick>

        <TrackForm
          formName="newsletter_signup"
          trackSubmit={true}
          trackFieldChanges={true}
        >
          <input name="email" type="email" />
          <button type="submit">Subscribe</button>
        </TrackForm>
      </TrackScroll>
    </TrackTime>
  );
}
```

### Server-side Tracking (Next.js API Routes)

```typescript
// pages/api/track.ts or app/api/track/route.ts
import { trackServerEvent } from "mentiq-sdk";

export default async function handler(req: any, res: any) {
  await trackServerEvent(
    {
      apiKey: process.env.ANALYTICS_API_KEY!,
    },
    "api_endpoint_called",
    {
      endpoint: req.url,
      method: req.method,
    },
    {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    }
  );

  res.status(200).json({ success: true });
}
```

## Configuration

```typescript
interface AnalyticsConfig {
  apiKey: string; // Your API key (required)
  endpoint?: string; // Custom endpoint URL
  debug?: boolean; // Enable debug logging
  userId?: string; // Initial user ID
  sessionTimeout?: number; // Session timeout in ms (default: 30min)
  batchSize?: number; // Events per batch (default: 20)
  flushInterval?: number; // Auto-flush interval in ms (default: 10s)
  enableAutoPageTracking?: boolean; // Auto-track page views (default: true)
  enablePerformanceTracking?: boolean; // Track page performance (default: false)
}
```

## Event Types

### Track Events

Custom events with properties:

```typescript
track("purchase_completed", {
  product_id: "prod_123",
  revenue: 29.99,
  currency: "USD",
  category: "electronics",
});
```

### Page Views

Automatic or manual page tracking:

```typescript
page({
  title: "Product Detail",
  category: "ecommerce",
  product_id: "prod_123",
});
```

### User Identification

Link events to specific users:

```typescript
identify("user_123", {
  email: "user@example.com",
  name: "John Doe",
  plan: "premium",
  signup_date: "2024-01-15",
});
```

### User Aliasing

Connect anonymous and identified users:

```typescript
alias("user_123", "anonymous_456");
```

## Privacy & GDPR

The SDK is designed with privacy in mind:

- **Local storage only** - User data stored locally, not transmitted unless explicitly tracked
- **Anonymous by default** - Generates anonymous IDs, no PII collected automatically
- **Opt-in tracking** - All tracking is explicit via API calls
- **Data control** - Users can reset/clear all data with `reset()`
- **Configurable** - Disable auto-tracking features as needed

## API Reference

### Core Methods

- `init(config)` - Initialize the SDK
- `track(event, properties?)` - Track custom events
- `page(properties?)` - Track page views
- `identify(userId, traits?)` - Identify users
- `alias(newId, previousId?)` - Alias users
- `reset()` - Reset all user data
- `flush()` - Force send queued events

### React Hooks

- `useAnalytics()` - Get analytics instance
- `useTrack()` - Get track function
- `usePage()` - Get page function
- `useIdentify()` - Get identify function
- `usePageTracking()` - Auto-track page views
- `useComponentTracking()` - Track component lifecycle
- `useInteractionTracking()` - Track user interactions
- `useABTest()` - A/B testing utilities

### Components

- `<AnalyticsProvider>` - Context provider
- `<TrackView>` - Track element visibility
- `<TrackClick>` - Track click events
- `<TrackForm>` - Track form interactions
- `<TrackScroll>` - Track scroll milestones
- `<TrackTime>` - Track time spent

## License

MIT

## Support

For questions, issues, or feature requests, please open an issue on GitHub.
