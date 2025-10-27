# MentiQ Analytics SDK - Overview

## What is MentiQ Analytics SDK?

MentiQ Analytics SDK is a **comprehensive, production-ready analytics solution** built specifically for React and Next.js applications. It provides everything you need to understand user behavior, track events, monitor sessions, and visualize interactions through heatmaps.

## Key Capabilities

### 1. **Event Tracking System**

- Track any user action (clicks, form submissions, navigation, etc.)
- Attach custom properties to events for rich context
- Automatic event batching for efficient network usage
- Queue events offline and send when reconnected

### 2. **User Identification & Segmentation**

- Track anonymous users automatically
- Identify users with custom IDs and properties
- Associate all events with user sessions
- Reset user identity on logout

### 3. **Session Monitoring**

- Automatic session management with configurable timeouts
- Track session duration, page views, and event counts
- Monitor user engagement metrics
- Session-based analytics and cohort analysis

### 4. **Heatmap Tracking**

- Visual representation of user interactions
- Track clicks, scrolls, and mouse movements
- Configurable sampling rate to control data volume
- Element-level interaction tracking

### 5. **Performance Monitoring**

- Track page load times
- Monitor DOM content loaded time
- First contentful paint metrics
- Time to interactive measurements

### 6. **Privacy & Compliance**

- Built-in PII masking (emails, passwords)
- Respect Do Not Track browser settings
- GDPR-compliant architecture
- No persistent local storage by default

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your React/Next.js App                  │
├─────────────────────────────────────────────────────────────┤
│                    AnalyticsProvider                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  React Context                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │         Analytics Core Engine                  │ │  │
│  │  │                                                 │ │  │
│  │  │  • Event Queue (in-memory)                    │ │  │
│  │  │  • Batching Logic                             │ │  │
│  │  │  • Session Manager                            │ │  │
│  │  │  • Heatmap Tracker                            │ │  │
│  │  │  • Error Handler                              │ │  │
│  │  │  • Performance Monitor                        │ │  │
│  │  └────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS with JWT Auth
                           ▼
            ┌──────────────────────────────┐
            │    Your Analytics Backend    │
            │                              │
            │  POST /track  (single event) │
            │  POST /batch  (multiple)     │
            └──────────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │    Database     │
                  │  (Your choice)  │
                  └─────────────────┘
```

## How It Works

### 1. **Initialization**

When you wrap your app with `<AnalyticsProvider>`, the SDK:

- Creates an Analytics instance
- Generates an anonymous user ID
- Starts a new session
- Sets up event listeners for errors and page unload
- Initializes the event queue

### 2. **Event Tracking**

When you call `track()`:

```typescript
track("button_clicked", { button_name: "signup" });
```

The SDK:

1. Creates an event object with timestamp, session ID, user ID
2. Adds it to the in-memory queue
3. Checks if batch size is reached
4. If yes, sends the batch to your backend via HTTPS
5. If no, waits for the next flush interval

### 3. **Batching & Sending**

Events are sent in batches to reduce network overhead:

- **By size**: When queue reaches `batchSize` (default: 10 events)
- **By time**: Every `flushInterval` (default: 10 seconds)
- **On unload**: Before user leaves the page
- **Manual**: When you call `flush()`

### 4. **Session Management**

Sessions are automatically managed:

- **Start**: When user first interacts with your app
- **Continue**: As long as user is active
- **Timeout**: After 30 minutes of inactivity (configurable)
- **End**: When session times out or user explicitly resets

### 5. **Heatmap Tracking**

When enabled, the SDK tracks:

- **Clicks**: X/Y coordinates relative to viewport
- **Scrolls**: Scroll depth percentage
- **Mouse movements**: Sample of movement coordinates
- **Element interactions**: Which elements users engage with

All tracked with respect to `heatmapSampleRate` to control data volume.

## Data Flow

```
User Action
    │
    ▼
Component calls track()
    │
    ▼
Event created with metadata
    │
    ▼
Added to queue (in-memory)
    │
    ▼
Queue size checked
    │
    ├─► If >= batchSize ──────┐
    │                         │
    └─► If < batchSize ────►  │
            │                 │
            ▼                 ▼
    Wait for interval    Send batch immediately
            │                 │
            └─────────────────┘
                    │
                    ▼
        POST /batch to backend
        (with JWT auth header)
                    │
                    ▼
            Backend validates
                    │
                    ├─► Success (200) ──► Clear queue
                    │
                    └─► Error (4xx/5xx) ──► Retry or log
```

## Integration Examples

### Basic React App

```tsx
// index.tsx
import { AnalyticsProvider } from "mentiq-sdk";

root.render(
  <AnalyticsProvider
    config={{
      projectId: "my-project",
      apiKey: "my-api-key",
      endpoint: "https://analytics.myapp.com",
    }}
  >
    <App />
  </AnalyticsProvider>
);

// Component.tsx
import { useAnalytics } from "mentiq-sdk";

function Button() {
  const { track } = useAnalytics();

  return <button onClick={() => track("clicked")}>Click me</button>;
}
```

### Next.js App Router

```tsx
// app/layout.tsx
import { AnalyticsProvider } from "mentiq-sdk";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider
          config={
            {
              /* ... */
            }
          }
        >
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}

// app/page.tsx
("use client");

import { usePageTracking } from "mentiq-sdk";

export default function Home() {
  usePageTracking(); // Auto-track page view
  return <div>Home</div>;
}
```

## Real-World Use Cases

### 1. **E-commerce Analytics**

- Track product views, add-to-cart, purchases
- Monitor checkout funnel conversion
- Analyze product page engagement with heatmaps
- Track user journey from landing to purchase

### 2. **SaaS Product Analytics**

- Track feature usage and adoption
- Monitor user onboarding completion
- Measure time-to-value metrics
- Identify power users vs. casual users

### 3. **Content Platforms**

- Track article/video views and engagement
- Measure time spent on content
- Identify popular sections with heatmaps
- Analyze reading/viewing patterns

### 4. **Mobile-First Applications**

- Track touch interactions
- Monitor scroll behavior on mobile devices
- Analyze thumb-zone engagement
- Optimize for mobile user experience

## Backend Integration

The SDK sends data to **your own backend**, giving you full control over:

- Data storage and retention
- Privacy and compliance
- Custom processing and enrichment
- Real-time vs. batch processing
- Integration with other systems

### Required Backend Endpoints

#### POST /track (Single Event)

```json
{
  "projectId": "my-project",
  "event": "button_clicked",
  "properties": {
    "button_name": "signup"
  },
  "timestamp": 1698765432000,
  "sessionId": "session-abc123",
  "userId": "user-456",
  "anonymousId": "anon-789"
}
```

#### POST /batch (Multiple Events)

```json
{
  "projectId": "my-project",
  "events": [
    { "event": "page_view", ... },
    { "event": "button_clicked", ... },
    { "event": "form_submitted", ... }
  ]
}
```

### Authentication

All requests include JWT authentication:

```
Authorization: Bearer your-jwt-token
```

## Configuration Options

```typescript
interface AnalyticsConfig {
  // Required
  projectId: string;
  apiKey: string;

  // Optional
  endpoint?: string; // Backend URL
  debug?: boolean; // Enable console logs
  disabled?: boolean; // Disable all tracking

  // Batching
  batchSize?: number; // Events per batch (default: 10)
  flushInterval?: number; // Auto-flush ms (default: 10000)
  maxQueueSize?: number; // Max queue size (default: 100)

  // Heatmap
  enableHeatmap?: boolean; // Enable heatmap tracking
  heatmapSampleRate?: number; // Sample rate 0-1 (default: 0.1)

  // Session
  sessionTimeout?: number; // Session timeout ms (default: 1800000)

  // Privacy
  maskEmails?: boolean; // Mask emails (default: false)
  maskPasswords?: boolean; // Mask passwords (default: true)
  respectDoNotTrack?: boolean; // Respect DNT (default: false)
}
```

## Performance Characteristics

### Memory Usage

- **Queue**: ~100 bytes per event × queue size
- **Session data**: ~500 bytes
- **Heatmap buffer**: ~50-200 KB (sampled)
- **Total**: < 1 MB typical usage

### Network Usage

- **Single event**: ~200-500 bytes
- **Batch (10 events)**: ~2-5 KB
- **Frequency**: Every 10 seconds or 10 events (default)
- **Daily estimate** (active user): 5-20 MB

### CPU Usage

- **Event tracking**: < 1ms per event
- **Batching**: < 5ms per batch
- **Heatmap sampling**: < 10ms per interaction (sampled)
- **Negligible impact** on app performance

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari 14+, Chrome Android 90+)

### Required Browser APIs

- `fetch` API
- `localStorage` (optional, for persistence)
- `IntersectionObserver` (for element tracking)
- `PerformanceObserver` (for performance monitoring)

## Security

### Data in Transit

- All data sent over HTTPS
- JWT authentication required
- No sensitive data in URLs or query params

### Data at Rest

- No persistent storage in browser by default
- Session data only in memory
- Optional localStorage with encryption

### Privacy

- No third-party trackers or cookies
- No data sharing with external services
- Full control over data retention
- GDPR-compliant by design

## Comparison with Other Solutions

| Feature          | MentiQ SDK | Google Analytics | Mixpanel | Segment |
| ---------------- | ---------- | ---------------- | -------- | ------- |
| Self-hosted      | ✅         | ❌               | ❌       | ❌      |
| React hooks      | ✅         | ❌               | ✅       | ✅      |
| Event batching   | ✅         | ✅               | ✅       | ✅      |
| Heatmaps         | ✅         | ❌               | ❌       | ❌      |
| Session tracking | ✅         | ✅               | ✅       | ✅      |
| TypeScript       | ✅         | Partial          | ✅       | ✅      |
| Open source      | ✅         | ❌               | ❌       | ❌      |
| Price            | Free       | Free tier        | Paid     | Paid    |

## Getting Started

1. **Install**

   ```bash
   npm install mentiq-sdk
   ```

2. **Setup Provider**

   ```tsx
   <AnalyticsProvider config={{ projectId, apiKey }}>
     <App />
   </AnalyticsProvider>
   ```

3. **Track Events**

   ```tsx
   const { track } = useAnalytics();
   track("event_name", { property: "value" });
   ```

4. **View Documentation**
   See `DOCUMENTATION.md` for complete API reference and examples.

## Next Steps

- 📖 Read full [DOCUMENTATION.md](./DOCUMENTATION.md)
- 🚀 Check [examples/](./examples/) for code samples
- 🔧 Set up your backend endpoints
- 📊 Start tracking events
- 📈 Build dashboards with your data

## Support & Contributing

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@mentiq.com
- **Contributing**: See CONTRIBUTING.md

---

Built with ❤️ for React and Next.js developers
