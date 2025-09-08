# MentiQ Analytics SDK

A powerful, lightweight analytics SDK for React and Next.js applications with advanced features like event queuing, batching, heatmap tracking, session monitoring, and performance analytics.

## 🌟 Features

### Core Analytics
- 🎯 Event tracking with custom properties
- 📄 Page view tracking with auto-tracking
- 👤 User identification and management
- 🔄 Event batching and queuing with retry logic
- 📱 Session management and monitoring

### Advanced Features
- 🔥 **Heatmap Tracking**: Click, hover, and scroll tracking
- 📊 **Session Monitoring**: User activity, scroll depth, engagement metrics
- ⚡ **Performance Tracking**: Core Web Vitals, custom performance metrics
- 🚨 **Error Tracking**: JavaScript errors, unhandled rejections, React errors
- 🎭 **React Components**: Pre-built tracking components and HOCs

### Technical Features
- 📦 Event queuing with configurable batch sizes
- 🔄 Automatic retry with exponential backoff
- 🏪 Local storage for offline support
- 🎣 React hooks for easy integration
- 📱 TypeScript support with full type safety
- 🚀 Next.js optimized utilities

## 📦 Installation

```bash
npm install mentiq-sdk
# or
yarn add mentiq-sdk
```

## 🚀 Quick Start

### Basic Setup

```tsx
import React from 'react';
import { AnalyticsProvider } from 'mentiq-sdk';

function App() {
  return (
    <AnalyticsProvider 
      config={{
        apiKey: 'your-api-key',
        endpoint: 'https://your-endpoint.com/events',
        enableHeatmapTracking: true,
        enableSessionRecording: true,
        enableErrorTracking: true,
        batchSize: 10,
        flushInterval: 5000,
      }}
    >
      <YourApp />
    </AnalyticsProvider>
  );
}
```

### Using Hooks

```tsx
import React from 'react';
import { useAnalytics, useSessionTracking } from 'mentiq-sdk';

function MyComponent() {
  const { track, trackError } = useAnalytics();
  const { sessionData } = useSessionTracking();

  const handleButtonClick = () => {
    track('button_clicked', {
      button_id: 'hero-cta',
      user_plan: 'premium'
    });
  };

  return (
    <div>
      <button onClick={handleButtonClick}>Track Me!</button>
      <p>Session duration: {sessionData?.duration}ms</p>
    </div>
  );
}
```

## ⚙️ Configuration

```tsx
interface AnalyticsConfig {
  apiKey: string;
  endpoint?: string;
  debug?: boolean;
  userId?: string;
  sessionTimeout?: number;           // Default: 30 minutes
  batchSize?: number;               // Default: 20 events
  flushInterval?: number;           // Default: 10 seconds
  enableAutoPageTracking?: boolean; // Default: true
  enablePerformanceTracking?: boolean;
  enableHeatmapTracking?: boolean;
  enableSessionRecording?: boolean;
  enableErrorTracking?: boolean;
  maxQueueSize?: number;            // Default: 1000
  retryAttempts?: number;           // Default: 3
  retryDelay?: number;              // Default: 1000ms
}
```

## 🎣 Core Hooks

### useAnalytics()

Main hook for tracking events and managing users.

```tsx
const {
  track,                    // Track custom events
  page,                     // Track page views
  identify,                 // Identify users
  reset,                    // Reset analytics state
  flush,                    // Force flush events
  trackError,               // Track custom errors
  trackPerformance,         // Track performance metrics
  getSessionData,           // Get current session data
  getQueueSize,             // Get current queue size
} = useAnalytics();
```

### useSessionTracking()

Monitor user session data in real-time.

```tsx
const {
  sessionData,              // Full session object
  sessionId,               // Current session ID
  isActive,                // Is session active
  duration,                // Session duration in ms
  pageViews,               // Number of page views
  clicks,                  // Number of clicks
  scrollDepth,             // Current scroll depth %
} = useSessionTracking();
```

### useErrorTracking()

Automatic and manual error tracking.

```tsx
const {
  trackJavaScriptError,     // Track JS errors
  trackCustomError,         // Track custom errors
} = useErrorTracking();
```

### usePerformanceTracking()

Track performance metrics and Core Web Vitals.

```tsx
const {
  measureCustomPerformance, // Create custom performance measurements
} = usePerformanceTracking();
```

## 🧩 Components

### TrackView - Element Visibility Tracking

```tsx
<TrackView 
  event="hero_viewed" 
  properties={{ section: 'homepage' }}
  threshold={0.5}
  delay={1000}
>
  <div>Tracked when 50% visible for 1 second</div>
</TrackView>
```

### HeatmapTracker - User Interaction Tracking

```tsx
<HeatmapTracker 
  trackClicks={true}
  trackHovers={true}
  element="product-grid"
>
  <div>All interactions tracked for heatmap</div>
</HeatmapTracker>
```

### PerformanceMonitor - Component Performance

```tsx
<PerformanceMonitor 
  measureRender={true}
  componentName="ProductList"
>
  <ProductList products={products} />
</PerformanceMonitor>
```

### AnalyticsErrorBoundary - Error Tracking

```tsx
<AnalyticsErrorBoundary fallback={<ErrorFallback />}>
  <App />
</AnalyticsErrorBoundary>
```

### TrackForm - Form Analytics

```tsx
<TrackForm 
  formName="contact-form"
  trackSubmit={true}
  trackFieldChanges={true}
>
  <input name="email" type="email" />
  <textarea name="message" />
  <button type="submit">Submit</button>
</TrackForm>
```

## 🔄 Event Queuing & Batching

The SDK automatically queues events and sends them in batches:

- **Batch Size**: Configure events per batch
- **Flush Interval**: Automatic sending frequency
- **Retry Logic**: Exponential backoff for failed requests
- **Offline Support**: Queue events when offline

```tsx
const { flush, getQueueSize } = useAnalytics();

console.log(`${getQueueSize()} events queued`);
await flush(); // Send all events immediately
```

## 🚨 Error Handling

### Automatic Error Tracking
- JavaScript errors
- Unhandled Promise rejections  
- React component errors

### Manual Error Tracking
```tsx
const { trackError } = useAnalytics();

try {
  // risky operation
} catch (error) {
  trackError(error, {
    context: 'user-action',
    user_id: userId
  });
}
```

## ⚡ Performance Monitoring

### Core Web Vitals
Automatically tracks when `enablePerformanceTracking: true`:
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **FCP** (First Contentful Paint)

### Custom Performance Metrics
```tsx
const { measureCustomPerformance } = usePerformanceTracking();

const measurement = measureCustomPerformance('api-call');
measurement.start();
await fetchData();
measurement.end(); // Automatically tracked
```

## 📱 Session Management

Rich session tracking includes:
- Session duration and activity
- Page views and navigation
- User interactions (clicks, scrolls)
- Scroll depth and engagement
- Activity/inactivity periods

## 🚀 Next.js Integration

### App Router (app/)
```tsx
// app/layout.tsx
import { AnalyticsProvider } from 'mentiq-sdk';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsProvider config={{ apiKey: 'your-key' }}>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

### Pages Router (pages/)
```tsx
// pages/_app.tsx
import { AnalyticsProvider } from 'mentiq-sdk';

export default function App({ Component, pageProps }) {
  return (
    <AnalyticsProvider config={{ apiKey: 'your-key' }}>
      <Component {...pageProps} />
    </AnalyticsProvider>
  );
}
```

## 📊 Example Use Cases

### E-commerce Tracking
```tsx
function ProductPage({ product }) {
  const { track } = useAnalytics();

  return (
    <TrackView 
      event="product_viewed"
      properties={{ 
        product_id: product.id,
        category: product.category,
        price: product.price
      }}
    >
      <ProductDetails product={product} />
      
      <TrackClick
        event="add_to_cart"
        properties={{ product_id: product.id }}
      >
        <button>Add to Cart</button>
      </TrackClick>
    </TrackView>
  );
}
```

### Content Engagement
```tsx
function BlogPost({ post }) {
  return (
    <TrackScroll milestones={[25, 50, 75, 100]}>
      <TrackTime intervals={[30, 60, 180]}>
        <article>
          <h1>{post.title}</h1>
          <div>{post.content}</div>
        </article>
      </TrackTime>
    </TrackScroll>
  );
}
```

## 📚 TypeScript Support

Full TypeScript support with comprehensive types:

```tsx
import type { 
  AnalyticsConfig,
  EventProperties,
  SessionData,
  PerformanceData 
} from 'mentiq-sdk';

const config: AnalyticsConfig = {
  apiKey: 'key',
  enableHeatmapTracking: true
};
```

## 📋 API Reference

### Analytics Class Methods
```tsx
// Core tracking
analytics.track(event: string, properties?: EventProperties)
analytics.page(properties?: PageProperties)
analytics.identify(userId: string, traits?: UserProperties)

// Queue management
analytics.flush(): Promise<void>
analytics.getQueueSize(): number
analytics.clearQueue(): void

// Advanced tracking
analytics.trackCustomError(error: string | Error, properties?: EventProperties)
analytics.trackPerformance(data: PerformanceData)
```

## 🚀 Publishing

To publish the SDK:

```bash
npm run build
npm run test
npm publish
```

## 📄 License

MIT License - Free for personal and commercial use.

## 🆘 Support

- 📝 [Documentation](https://docs.mentiq.io)
- 🐛 [Issues](https://github.com/your-org/mentiq-sdk/issues)
- 💬 [Discussions](https://github.com/your-org/mentiq-sdk/discussions)
