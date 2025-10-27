# MentiQ Analytics SDK - Quick Reference

## Installation

```bash
npm install mentiq-sdk
```

## Basic Setup

### React

```tsx
import { AnalyticsProvider } from "mentiq-sdk";

<AnalyticsProvider config={{ projectId: "xxx", apiKey: "xxx" }}>
  <App />
</AnalyticsProvider>;
```

### Next.js (App Router)

```tsx
// app/layout.tsx
import { AnalyticsProvider } from "mentiq-sdk";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider config={{ projectId: "xxx", apiKey: "xxx" }}>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

## Core API

### Track Events

```tsx
const { track } = useAnalytics();

track("event_name", {
  property1: "value1",
  property2: 123,
});
```

### Track Page Views

```tsx
const { page } = useAnalytics();

page({
  path: "/products",
  title: "Products Page",
});
```

### Identify Users

```tsx
const { identify } = useAnalytics();

identify("user-123", {
  email: "user@example.com",
  name: "John Doe",
  plan: "premium",
});
```

### Reset User

```tsx
const { reset } = useAnalytics();

reset(); // Clears user ID and starts new session
```

## React Hooks

### useAnalytics()

```tsx
const { track, page, identify, reset, analytics } = useAnalytics();
```

### usePageTracking()

```tsx
usePageTracking({ page: "home" }); // Auto-track on mount
```

### useInteractionTracking()

```tsx
const { trackClick, trackHover, trackView } = useInteractionTracking();

trackClick("signup_button", { location: "nav" });
```

### useElementTracking()

```tsx
const ref = useRef(null);

useElementTracking(
  ref,
  "element_viewed",
  { element_id: "123" },
  { threshold: 0.5, delay: 1000 }
);

<div ref={ref}>Content</div>;
```

### useSessionInfo()

```tsx
const { sessionId, duration, pageCount, eventCount } = useSessionInfo();
```

### useHeatmapTracking()

```tsx
useHeatmapTracking({
  trackClicks: true,
  trackScrolls: true,
  trackMouseMovement: true,
});
```

## Components

### TrackView

```tsx
<TrackView
  event="feature_viewed"
  properties={{ feature: "analytics" }}
  threshold={0.7}
  delay={500}
>
  <div>Content</div>
</TrackView>
```

### TrackClick

```tsx
<TrackClick event="card_clicked" properties={{ card_type: "product" }}>
  <div>Card</div>
</TrackClick>
```

### HeatmapTracker

```tsx
<HeatmapTracker trackClicks trackScrolls trackMouseMovement sampleRate={0.3}>
  <div>Tracked section</div>
</HeatmapTracker>
```

### SessionMonitor

```tsx
<SessionMonitor /> // Displays session info for debugging
```

## Configuration

```typescript
{
  // Required
  projectId: string;
  apiKey: string;

  // Optional
  endpoint?: string;                // Default: production URL
  debug?: boolean;                  // Default: false
  disabled?: boolean;               // Default: false
  batchSize?: number;               // Default: 10
  flushInterval?: number;           // Default: 10000 (10s)
  maxQueueSize?: number;            // Default: 100
  enableHeatmap?: boolean;          // Default: false
  heatmapSampleRate?: number;       // Default: 0.1 (10%)
  sessionTimeout?: number;          // Default: 1800000 (30min)
  maskEmails?: boolean;             // Default: false
  maskPasswords?: boolean;          // Default: true
  respectDoNotTrack?: boolean;      // Default: false
}
```

## Common Patterns

### Button Click

```tsx
<button onClick={() => track("button_clicked", { button: "signup" })}>
  Sign Up
</button>
```

### Form Submit

```tsx
const handleSubmit = (data) => {
  track("form_submitted", {
    form_name: "contact",
    fields: data.length,
  });
};
```

### Product View

```tsx
useEffect(() => {
  track("product_viewed", {
    product_id: product.id,
    product_name: product.name,
    price: product.price,
  });
}, [product]);
```

### User Login

```tsx
const handleLogin = async (user) => {
  identify(user.id, {
    email: user.email,
    name: user.name,
  });

  track("user_logged_in", {
    method: "email",
  });
};
```

### User Logout

```tsx
const handleLogout = () => {
  track("user_logged_out");
  reset();
};
```

## Next.js Specific

### Auto Track Route Changes

```tsx
// pages/_app.tsx
import { useNextAnalytics } from "mentiq-sdk/nextjs";

function MyApp({ Component, pageProps }) {
  useNextAnalytics(); // Automatically tracks route changes

  return (
    <AnalyticsProvider
      config={
        {
          /* ... */
        }
      }
    >
      <Component {...pageProps} />
    </AnalyticsProvider>
  );
}
```

### Manual Page Tracking

```tsx
import { trackNextPageView } from "mentiq-sdk/nextjs";
import { useRouter } from "next/router";

const router = useRouter();
trackNextPageView(router, { section: "products" });
```

## Advanced Features

### Manual Flush

```tsx
await analytics.flush(); // Send all queued events immediately
```

### Get Session ID

```tsx
const sessionId = analytics.getSessionId();
```

### Get Anonymous ID

```tsx
const anonymousId = analytics.getAnonymousId();
```

### Destroy Instance

```tsx
analytics.destroy(); // Clean up listeners
```

## Event Types

### Standard Events

- `page_view` - Page viewed
- `button_clicked` - Button clicked
- `link_clicked` - Link clicked
- `form_submitted` - Form submitted
- `element_viewed` - Element came into view
- `user_logged_in` - User authentication
- `user_logged_out` - User logout
- `error` - JavaScript error occurred

### Heatmap Events

- `heatmap_click` - User clicked (with x/y coordinates)
- `heatmap_scroll` - User scrolled (with depth)
- `heatmap_move` - Mouse movement (sampled)

### Session Events

- `session_start` - New session started
- `session_end` - Session ended/timed out

### Performance Events

- `page_load` - Page loaded with timing

## Property Best Practices

### ✅ Good

```tsx
track("purchase", {
  product_id: "123",
  product_name: "Shoes",
  price: 79.99,
  quantity: 2,
  category: "footwear",
});
```

### ❌ Bad

```tsx
track("purchase", {
  product: { id: "123", details: { name: "Shoes" } }, // Nested
  metadata: JSON.stringify(data), // Already stringified
});
```

## Environment Setup

```env
# .env.local (Next.js)
NEXT_PUBLIC_PROJECT_ID=your-project-id
NEXT_PUBLIC_API_KEY=your-api-key
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://api.yourbackend.com
```

```tsx
// Use in config
{
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
}
```

## Debugging

### Enable Debug Mode

```tsx
{
  debug: true;
}
```

### Check Browser Console

Look for `[Analytics]` prefixed logs

### Check Network Tab

Look for POST requests to `/track` or `/batch`

### Flush Manually

```tsx
await analytics.flush(); // Force send queued events
```

## TypeScript Types

```typescript
import type {
  AnalyticsConfig,
  AnalyticsInstance,
  EventProperties,
  UserProperties,
  SessionData,
  HeatmapEvent,
} from "mentiq-sdk";
```

## Backend Endpoints

### POST /track

Single event endpoint

```json
{
  "projectId": "xxx",
  "event": "button_clicked",
  "properties": { "button": "signup" },
  "timestamp": 1698765432000,
  "sessionId": "session-123",
  "userId": "user-456",
  "anonymousId": "anon-789"
}
```

### POST /batch

Batch events endpoint

```json
{
  "projectId": "xxx",
  "events": [
    { "event": "page_view", ... },
    { "event": "button_clicked", ... }
  ]
}
```

### Authentication Header

```
Authorization: Bearer your-jwt-token
```

## Common Issues

### Events not sending?

1. Check `debug: true` in config
2. Verify `projectId` and `apiKey`
3. Check network tab for failed requests
4. Try `await analytics.flush()`

### TypeScript errors?

1. Use hooks inside `<AnalyticsProvider>`
2. Import types: `import type { ... } from 'mentiq-sdk'`
3. Ensure properties are primitives (string, number, boolean)

### Next.js SSR errors?

1. Add `'use client'` directive
2. Or use dynamic import with `ssr: false`

### Heatmap not working?

1. Set `enableHeatmap: true`
2. Increase `heatmapSampleRate: 1.0` for testing
3. Check if user is sampled in/out

## Links

- 📖 Full Documentation: `DOCUMENTATION.md`
- 🎯 Overview: `SDK-OVERVIEW.md`
- 💻 Examples: `examples/`
- 🐛 Issues: GitHub Issues
- 💬 Support: support@mentiq.com

---

**License**: MIT
