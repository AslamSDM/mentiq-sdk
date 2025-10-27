# MentiQ Analytics SDK - Complete Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [React Integration](#react-integration)
8. [Next.js Integration](#nextjs-integration)
9. [Advanced Features](#advanced-features)
10. [Backend Integration](#backend-integration)
11. [Privacy & Compliance](#privacy--compliance)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

MentiQ Analytics SDK is a powerful, lightweight analytics solution designed specifically for React and Next.js applications. It provides comprehensive event tracking, user behavior analysis, heatmap generation, and session monitoring capabilities.

### Key Features

- 📊 **Event Tracking**: Track custom events with rich metadata
- 📄 **Page View Tracking**: Automatic page view tracking for SPAs and Next.js
- 👤 **User Identification**: Associate events with user identities
- 🔄 **Event Batching**: Efficient network usage with automatic event batching
- 🎯 **Heatmap Tracking**: Visual representation of user interactions
- ⏱️ **Session Monitoring**: Track user sessions and engagement metrics
- ⚡ **Performance Monitoring**: Track page load times and performance
- 🔒 **Privacy-First**: Built-in PII masking and privacy controls
- 📱 **Offline Support**: Queue events when offline
- 🎨 **TypeScript**: Full TypeScript support

---

## Installation

```bash
npm install mentiq-sdk
# or
yarn add mentiq-sdk
# or
pnpm add mentiq-sdk
```

### Peer Dependencies

The SDK requires React 16.8+ (for hooks support):

```json
{
  "react": "^16.8.0 || ^17.0.0 || ^18.0.0"
}
```

---

## Quick Start

### React Application

```tsx
import { AnalyticsProvider } from "mentiq-sdk";

function App() {
  return (
    <AnalyticsProvider
      config={{
        projectId: "your-project-id",
        apiKey: "your-api-key",
        endpoint: "https://api.yourbackend.com",
        debug: true,
      }}
    >
      <YourApp />
    </AnalyticsProvider>
  );
}
```

### Using Hooks

```tsx
import { useAnalytics } from "mentiq-sdk";

function Button() {
  const { track } = useAnalytics();

  const handleClick = () => {
    track("button_clicked", {
      button_name: "signup",
      location: "homepage",
    });
  };

  return <button onClick={handleClick}>Sign Up</button>;
}
```

---

## Core Concepts

### Events

Events are the fundamental unit of tracking. Every user interaction, page view, or custom action is tracked as an event.

**Event Structure:**

```typescript
{
  event: string;              // Event name
  properties?: {              // Custom properties
    [key: string]: any;
  };
  timestamp: number;          // When the event occurred
  sessionId: string;          // Associated session
  userId?: string;            // User identifier (if identified)
  anonymousId: string;        // Anonymous identifier
}
```

### Sessions

Sessions represent a user's continuous interaction with your application. A session includes:

- Start and end times
- Total duration
- Pages visited
- Events triggered
- Engagement metrics

### Users

Users can be:

- **Anonymous**: Tracked with an anonymous ID (generated automatically)
- **Identified**: After calling `identify()` with a user ID

---

## Configuration

### AnalyticsConfig

```typescript
interface AnalyticsConfig {
  // Required
  projectId: string; // Your project identifier
  apiKey: string; // Authentication API key

  // Optional
  endpoint?: string; // Backend API endpoint (default: production URL)
  debug?: boolean; // Enable debug logging
  disabled?: boolean; // Disable tracking

  // Batching
  batchSize?: number; // Events per batch (default: 10)
  flushInterval?: number; // Auto-flush interval in ms (default: 10000)
  maxQueueSize?: number; // Max queued events (default: 100)

  // Heatmap
  enableHeatmap?: boolean; // Enable heatmap tracking
  heatmapSampleRate?: number; // Sample rate 0-1 (default: 0.1)

  // Session
  sessionTimeout?: number; // Session timeout in ms (default: 30 min)

  // Privacy
  maskEmails?: boolean; // Mask email addresses
  maskPasswords?: boolean; // Mask password fields
  respectDoNotTrack?: boolean; // Respect DNT header
}
```

### Configuration Examples

**Development:**

```typescript
{
  projectId: 'dev-project',
  apiKey: 'dev-key',
  endpoint: 'http://localhost:3000/api',
  debug: true,
  batchSize: 1, // Send immediately for testing
}
```

**Production:**

```typescript
{
  projectId: 'prod-project',
  apiKey: 'prod-key',
  endpoint: 'https://api.yourbackend.com',
  debug: false,
  batchSize: 20,
  flushInterval: 30000,
  enableHeatmap: true,
  heatmapSampleRate: 0.2,
  respectDoNotTrack: true,
}
```

---

## API Reference

### Analytics Class

#### Core Methods

##### `track(event: string, properties?: EventProperties): void`

Track a custom event.

```typescript
analytics.track("product_viewed", {
  product_id: "12345",
  product_name: "Blue Sneakers",
  price: 79.99,
  category: "footwear",
});
```

##### `page(properties?: EventProperties): void`

Track a page view.

```typescript
analytics.page({
  path: "/products",
  title: "Product Catalog",
  referrer: document.referrer,
});
```

##### `identify(userId: string, properties?: UserProperties): void`

Identify a user.

```typescript
analytics.identify("user-123", {
  email: "user@example.com",
  name: "John Doe",
  plan: "premium",
  signupDate: "2025-01-01",
});
```

##### `reset(): void`

Reset user identification and start a new anonymous session.

```typescript
analytics.reset();
```

#### Advanced Methods

##### `flush(): Promise<void>`

Immediately send all queued events to the backend.

```typescript
await analytics.flush();
```

##### `getSessionId(): string`

Get the current session ID.

```typescript
const sessionId = analytics.getSessionId();
```

##### `getAnonymousId(): string`

Get the anonymous user ID.

```typescript
const anonId = analytics.getAnonymousId();
```

##### `destroy(): void`

Clean up the analytics instance and remove all listeners.

```typescript
analytics.destroy();
```

---

## React Integration

### AnalyticsProvider

Wrap your app with the provider to enable analytics throughout your component tree.

```tsx
import { AnalyticsProvider } from "mentiq-sdk";

function App() {
  return (
    <AnalyticsProvider
      config={
        {
          /* config */
        }
      }
    >
      <YourApp />
    </AnalyticsProvider>
  );
}
```

### Hooks

#### `useAnalytics()`

Access the analytics instance and tracking methods.

```tsx
import { useAnalytics } from "mentiq-sdk";

function Component() {
  const { track, page, identify, reset } = useAnalytics();

  useEffect(() => {
    track("component_mounted");
  }, []);

  return <div>...</div>;
}
```

#### `usePageTracking(properties?: EventProperties)`

Automatically track page views when a component mounts.

```tsx
import { usePageTracking } from "mentiq-sdk";

function HomePage() {
  usePageTracking({ page: "home", section: "hero" });
  return <div>...</div>;
}
```

#### `useInteractionTracking()`

Track common user interactions.

```tsx
import { useInteractionTracking } from "mentiq-sdk";

function Button() {
  const { trackClick } = useInteractionTracking();

  return (
    <button onClick={() => trackClick("signup_button", { location: "nav" })}>
      Sign Up
    </button>
  );
}
```

#### `useElementTracking(ref, event, properties, options)`

Track when an element comes into view.

```tsx
import { useRef } from "react";
import { useElementTracking } from "mentiq-sdk";

function ProductCard({ product }) {
  const ref = useRef(null);

  useElementTracking(
    ref,
    "product_viewed",
    { product_id: product.id },
    { threshold: 0.5, delay: 1000 }
  );

  return <div ref={ref}>...</div>;
}
```

#### `useSessionInfo()`

Access current session information.

```tsx
import { useSessionInfo } from "mentiq-sdk";

function SessionDebugger() {
  const session = useSessionInfo();

  return (
    <div>
      <p>Session ID: {session.sessionId}</p>
      <p>Duration: {session.duration}ms</p>
      <p>Page Count: {session.pageCount}</p>
    </div>
  );
}
```

#### `useHeatmapTracking(options)`

Enable heatmap tracking for a component.

```tsx
import { useHeatmapTracking } from "mentiq-sdk";

function InteractivePage() {
  useHeatmapTracking({
    trackClicks: true,
    trackScrolls: true,
    trackMouseMovement: true,
  });

  return <div>...</div>;
}
```

### Components

#### `<TrackView />`

Track when children come into view.

```tsx
import { TrackView } from "mentiq-sdk";

function Feature() {
  return (
    <TrackView
      event="feature_viewed"
      properties={{ feature_name: "analytics" }}
      threshold={0.7}
      delay={500}
    >
      <div>Feature content...</div>
    </TrackView>
  );
}
```

#### `<TrackClick />`

Track clicks on children.

```tsx
import { TrackClick } from "mentiq-sdk";

function Card() {
  return (
    <TrackClick event="card_clicked" properties={{ card_type: "product" }}>
      <div>Card content...</div>
    </TrackClick>
  );
}
```

#### `<HeatmapTracker />`

Enable heatmap tracking for a section.

```tsx
import { HeatmapTracker } from "mentiq-sdk";

function Dashboard() {
  return (
    <HeatmapTracker
      trackClicks
      trackScrolls
      trackMouseMovement
      sampleRate={0.3}
    >
      <div>Dashboard content...</div>
    </HeatmapTracker>
  );
}
```

#### `<SessionMonitor />`

Monitor and display session information.

```tsx
import { SessionMonitor } from "mentiq-sdk";

function DebugPanel() {
  return <SessionMonitor />;
}
```

---

## Next.js Integration

### App Router (app/ directory)

#### Layout Component

```tsx
// app/layout.tsx
import { AnalyticsProvider } from "mentiq-sdk";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider
          config={{
            projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
            apiKey: process.env.NEXT_PUBLIC_API_KEY,
          }}
        >
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

#### Page Component

```tsx
// app/page.tsx
"use client";

import { usePageTracking } from "mentiq-sdk";

export default function HomePage() {
  usePageTracking({ page: "home" });

  return <div>Home Page</div>;
}
```

### Pages Router (pages/ directory)

#### \_app.tsx

```tsx
// pages/_app.tsx
import { AnalyticsProvider } from "mentiq-sdk";
import { useNextAnalytics } from "mentiq-sdk/nextjs";

function MyApp({ Component, pageProps }) {
  useNextAnalytics();

  return (
    <AnalyticsProvider
      config={{
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        apiKey: process.env.NEXT_PUBLIC_API_KEY,
      }}
    >
      <Component {...pageProps} />
    </AnalyticsProvider>
  );
}
```

### Next.js Utilities

#### `useNextAnalytics()`

Automatically track route changes in Next.js.

```tsx
import { useNextAnalytics } from "mentiq-sdk/nextjs";

function MyApp({ Component, pageProps }) {
  useNextAnalytics(); // Tracks route changes automatically

  return <Component {...pageProps} />;
}
```

#### `trackNextPageView(router, properties?)`

Manually track Next.js page views.

```tsx
import { useRouter } from "next/router";
import { trackNextPageView } from "mentiq-sdk/nextjs";

function Page() {
  const router = useRouter();

  useEffect(() => {
    trackNextPageView(router, { section: "products" });
  }, [router]);

  return <div>...</div>;
}
```

---

## Advanced Features

### Event Batching

Events are automatically queued and sent in batches to reduce network overhead.

**Configuration:**

```typescript
{
  batchSize: 20,        // Send after 20 events
  flushInterval: 30000, // Or after 30 seconds
  maxQueueSize: 100,    // Max 100 events in queue
}
```

**Manual Flushing:**

```typescript
// Force send all queued events immediately
await analytics.flush();
```

**Automatic Flushing:**

- When queue reaches `batchSize`
- Every `flushInterval` milliseconds
- Before page unload
- When going offline (attempts to send)

### Heatmap Tracking

Heatmap tracking captures user interactions for visual analysis.

**What's Tracked:**

- Click positions (x, y coordinates)
- Scroll depth
- Mouse movement patterns
- Element interactions

**Configuration:**

```typescript
{
  enableHeatmap: true,
  heatmapSampleRate: 0.1, // Track 10% of users
}
```

**Usage:**

```tsx
// Enable for entire app
<AnalyticsProvider config={{ enableHeatmap: true }}>
  <App />
</AnalyticsProvider>;

// Enable for specific component
function Dashboard() {
  useHeatmapTracking({
    trackClicks: true,
    trackScrolls: true,
    trackMouseMovement: true,
  });

  return <div>...</div>;
}
```

**Event Format:**

```typescript
{
  event: 'heatmap_click',
  properties: {
    x: 450,
    y: 320,
    element: 'button',
    path: '/dashboard',
    viewport_width: 1920,
    viewport_height: 1080,
  }
}
```

### Session Monitoring

Sessions track continuous user engagement with your application.

**Session Properties:**

- `sessionId`: Unique session identifier
- `startTime`: When session started
- `lastActivityTime`: Last user interaction
- `duration`: Total session duration (ms)
- `pageCount`: Number of pages viewed
- `eventCount`: Number of events triggered

**Session Timeout:**
Sessions end after 30 minutes of inactivity (configurable).

```typescript
{
  sessionTimeout: 1800000, // 30 minutes in ms
}
```

**Accessing Session Data:**

```tsx
const { getSessionId } = useAnalytics();
const sessionId = getSessionId();

// Or use the hook
const session = useSessionInfo();
console.log(session.duration, session.pageCount);
```

**Session Events:**

- `session_start`: When a new session begins
- `session_end`: When a session expires or user leaves

### Error Tracking

Automatically capture JavaScript errors.

**Setup:**

```typescript
const analytics = new Analytics({
  projectId: "your-project",
  apiKey: "your-key",
  // Error tracking is automatic
});
```

**Error Event Format:**

```typescript
{
  event: 'error',
  properties: {
    message: 'Error message',
    stack: 'Stack trace',
    url: 'Page URL',
    line: 42,
    column: 15,
  }
}
```

### Performance Monitoring

Track page load times and performance metrics.

**Tracked Metrics:**

- Page load time
- DOM content loaded time
- First contentful paint
- Time to interactive

**Event Format:**

```typescript
{
  event: 'page_load',
  properties: {
    load_time: 1250,
    dom_content_loaded: 890,
    path: '/dashboard',
  }
}
```

### Offline Support

Events are queued when offline and sent when connection is restored.

**How It Works:**

1. SDK detects offline status
2. Events are queued locally
3. When online, queued events are sent
4. Queue is persisted in memory (not localStorage by default)

---

## Backend Integration

The SDK integrates with your custom analytics backend using JWT authentication.

### Authentication

```typescript
{
  apiKey: 'your-jwt-token',
  endpoint: 'https://api.yourbackend.com',
}
```

The SDK automatically includes the `Authorization` header in all requests:

```
Authorization: Bearer your-jwt-token
```

### API Endpoints

#### Single Event

```
POST /track
Content-Type: application/json
Authorization: Bearer <token>

{
  "projectId": "your-project",
  "event": "button_clicked",
  "properties": {
    "button_name": "signup"
  },
  "timestamp": 1698765432000,
  "sessionId": "session-123",
  "userId": "user-456",
  "anonymousId": "anon-789"
}
```

#### Batch Events

```
POST /batch
Content-Type: application/json
Authorization: Bearer <token>

{
  "projectId": "your-project",
  "events": [
    {
      "event": "page_view",
      "properties": { "path": "/home" },
      "timestamp": 1698765432000,
      ...
    },
    {
      "event": "button_clicked",
      "properties": { "button": "cta" },
      "timestamp": 1698765433000,
      ...
    }
  ]
}
```

### Event Schema

All events sent to the backend follow this schema:

```typescript
{
  projectId: string;
  event: string;
  properties: { [key: string]: string | number | boolean };
  timestamp: number;
  sessionId: string;
  userId?: string;
  anonymousId: string;
  userAgent?: string;
  ip?: string;
  referrer?: string;
  url?: string;
}
```

### Backend Requirements

Your backend should:

1. Accept JWT authentication via `Authorization` header
2. Validate `projectId` matches the authenticated project
3. Accept both `/track` (single event) and `/batch` (multiple events) endpoints
4. Return `200 OK` on success
5. Return appropriate error codes (`401`, `403`, `429`, `500`)

### Error Handling

The SDK handles various backend errors:

- **401 Unauthorized**: Invalid API key
- **403 Forbidden**: Project access denied
- **429 Too Many Requests**: Rate limited (SDK will retry)
- **500 Server Error**: Backend error (SDK will retry)

---

## Privacy & Compliance

### PII Masking

Automatically mask personally identifiable information.

```typescript
{
  maskEmails: true,      // Mask email addresses
  maskPasswords: true,   // Mask password fields
}
```

**Email Masking:**

- `user@example.com` → `u***@example.com`

**Password Masking:**

- Any input with `type="password"` is not tracked

### Do Not Track

Respect browser's Do Not Track setting.

```typescript
{
  respectDoNotTrack: true,
}
```

If enabled and user has DNT enabled, no tracking will occur.

### GDPR Compliance

To comply with GDPR:

1. **Consent Management:**

```typescript
const analytics = new Analytics({
  projectId: "your-project",
  apiKey: "your-key",
  disabled: !userHasConsented, // Disable until consent
});

// Enable after consent
if (userHasConsented) {
  analytics = new Analytics(config);
}
```

2. **Data Deletion:**

```typescript
// Reset user data
analytics.reset();
```

3. **Anonymous Tracking:**

```typescript
// Don't call identify() to keep users anonymous
analytics.track("page_view"); // Uses anonymous ID only
```

### Data Retention

The SDK does not store data locally by default. All data is sent to your backend, where you control retention policies.

---

## Troubleshooting

### Events Not Being Sent

**Check 1: Verify Configuration**

```typescript
{
  projectId: 'your-project', // Required
  apiKey: 'your-key',        // Required
  endpoint: 'https://...',   // Correct URL?
  debug: true,               // Enable logging
}
```

**Check 2: Check Browser Console**
Enable debug mode and check for errors:

```typescript
{
  debug: true;
}
```

**Check 3: Network Tab**
Check browser DevTools → Network tab for failed requests.

**Check 4: Batching**
Events might be queued. Try flushing:

```typescript
await analytics.flush();
```

### TypeScript Errors

**Error: Property 'track' does not exist**

Make sure you're using the hook inside the provider:

```tsx
function Component() {
  const { track } = useAnalytics(); // Must be inside AnalyticsProvider
  // ...
}
```

**Error: Type 'string' is not assignable**

Properties must be primitive types:

```typescript
// ❌ Wrong
track("event", { data: { nested: "object" } });

// ✅ Correct
track("event", { data: JSON.stringify({ nested: "object" }) });
```

### Events Not Batching

**Issue: Every event sends immediately**

Check batch configuration:

```typescript
{
  batchSize: 10,       // Must be > 1
  flushInterval: 30000, // Reasonable interval
}
```

### Heatmap Not Working

**Check 1: Enabled**

```typescript
{
  enableHeatmap: true;
}
```

**Check 2: Sample Rate**

```typescript
{
  heatmapSampleRate: 1.0;
} // Track all users (for testing)
```

**Check 3: User Sampled Out**
Only `sampleRate` percentage of users are tracked. Try increasing or check anonymousId.

### Next.js SSR Issues

**Error: Window is not defined**

Make sure to use 'use client' directive:

```tsx
"use client";

import { useAnalytics } from "mentiq-sdk";
```

Or lazy load the provider:

```tsx
import dynamic from "next/dynamic";

const AnalyticsProvider = dynamic(
  () => import("mentiq-sdk").then((mod) => mod.AnalyticsProvider),
  { ssr: false }
);
```

---

## Best Practices

### 1. Event Naming

Use clear, consistent naming:

```typescript
// ✅ Good
track("button_clicked", { button_name: "signup" });
track("product_viewed", { product_id: "123" });
track("checkout_completed", { order_total: 99.99 });

// ❌ Bad
track("click", { type: "button" });
track("view", { thing: "product" });
track("done", { value: 99.99 });
```

### 2. Property Structure

Keep properties flat and simple:

```typescript
// ✅ Good
track("purchase", {
  product_id: "123",
  product_name: "Shoes",
  price: 79.99,
  quantity: 2,
});

// ❌ Bad
track("purchase", {
  product: {
    id: "123",
    details: { name: "Shoes" },
  },
});
```

### 3. Error Handling

Always handle async operations:

```typescript
try {
  await analytics.flush();
} catch (error) {
  console.error("Failed to flush events:", error);
}
```

### 4. Performance

- Use batching in production
- Set appropriate sample rates for heatmaps
- Avoid tracking every mouse movement

### 5. Testing

Disable analytics in tests:

```typescript
{
  disabled: process.env.NODE_ENV === 'test',
}
```

### 6. Environment Variables

Use environment variables for configuration:

```typescript
{
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
  debug: process.env.NODE_ENV === 'development',
}
```

---

## Examples

### E-commerce Tracking

```tsx
function ProductPage({ product }) {
  const { track } = useAnalytics();

  useEffect(() => {
    track("product_viewed", {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      category: product.category,
    });
  }, [product]);

  const handleAddToCart = () => {
    track("product_added_to_cart", {
      product_id: product.id,
      quantity: 1,
      price: product.price,
    });
  };

  return (
    <div>
      <h1>{product.name}</h1>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}
```

### User Authentication

```tsx
function LoginForm() {
  const { track, identify } = useAnalytics();

  const handleLogin = async (email, password) => {
    try {
      const user = await login(email, password);

      // Identify the user
      identify(user.id, {
        email: user.email,
        name: user.name,
        plan: user.plan,
      });

      // Track successful login
      track("user_logged_in", {
        method: "email",
      });
    } catch (error) {
      track("login_failed", {
        error: error.message,
      });
    }
  };

  return <form onSubmit={handleLogin}>...</form>;
}
```

### Content Engagement

```tsx
function BlogPost({ post }) {
  const ref = useRef(null);

  useElementTracking(
    ref,
    "article_read",
    {
      article_id: post.id,
      article_title: post.title,
      word_count: post.wordCount,
    },
    { threshold: 0.8, delay: 5000 } // 80% visible for 5 seconds
  );

  return (
    <article ref={ref}>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

---

## Migration Guide

### From Google Analytics

```typescript
// Google Analytics
gtag("event", "purchase", {
  transaction_id: "12345",
  value: 99.99,
});

// MentiQ SDK
track("purchase", {
  transaction_id: "12345",
  value: 99.99,
});
```

### From Segment

```typescript
// Segment
analytics.track("Button Clicked", {
  button: "signup",
});

// MentiQ SDK
track("button_clicked", {
  button: "signup",
});
```

### From Mixpanel

```typescript
// Mixpanel
mixpanel.track("Sign Up", {
  source: "homepage",
});

// MentiQ SDK
track("sign_up", {
  source: "homepage",
});
```

---

## Support

For issues, questions, or feature requests:

- GitHub: https://github.com/AslamSDM/mentiq-sdk
- Email: support@mentiq.com
- Documentation: https://docs.mentiq.com

---

## License

MIT License - see LICENSE file for details.
