# Session Recording Examples

Complete examples for implementing session recording with the MentiQ SDK.

## Basic React Example

```tsx
import React from 'react';
import { AnalyticsProvider, useAnalytics } from 'mentiq-sdk';

// Configure the provider with session recording enabled
function App() {
  return (
    <AnalyticsProvider
      config={{
        apiKey: 'your-api-key',
        projectId: 'your-project-id',
        enableSessionRecording: true, // Auto-start recording
        debug: true,
      }}
    >
      <Dashboard />
    </AnalyticsProvider>
  );
}

// Component with recording controls
function Dashboard() {
  const analytics = useAnalytics();
  const isRecording = analytics.isRecordingActive();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Recording status indicator */}
      {isRecording && (
        <div style={{ color: 'red', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔴</span>
          <span>Session Recording Active</span>
        </div>
      )}

      {/* Recording controls */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => analytics.startRecording()}>
          Start Recording
        </button>
        <button onClick={() => analytics.stopRecording()}>
          Stop Recording
        </button>
        <button onClick={() => analytics.pauseRecording()}>
          Pause
        </button>
        <button onClick={() => analytics.resumeRecording()}>
          Resume
        </button>
      </div>

      {/* Your app content */}
      <YourContent />
    </div>
  );
}
```

## Conditional Recording

```tsx
import { useAnalytics, useAuth } from 'your-hooks';

function ConditionalRecording() {
  const analytics = useAnalytics();
  const { user, isAuthenticated } = useAuth();

  React.useEffect(() => {
    // Only record authenticated users
    if (isAuthenticated) {
      analytics.startRecording();
    } else {
      analytics.stopRecording();
    }

    return () => {
      analytics.stopRecording();
    };
  }, [isAuthenticated, analytics]);

  return <YourApp />;
}

// Record only on specific pages
function PageSpecificRecording() {
  const analytics = useAnalytics();
  const location = useLocation();

  React.useEffect(() => {
    const recordingPages = ['/checkout', '/payment', '/dashboard'];
    
    if (recordingPages.includes(location.pathname)) {
      analytics.startRecording();
    } else {
      analytics.stopRecording();
    }
  }, [location.pathname, analytics]);

  return <YourApp />;
}

// Record only for specific user segments
function SegmentedRecording() {
  const analytics = useAnalytics();
  const { user } = useAuth();

  React.useEffect(() => {
    // Record premium users or users in specific cohorts
    if (user?.plan === 'premium' || user?.cohort === 'beta-testers') {
      analytics.startRecording();
    }
  }, [user, analytics]);

  return <YourApp />;
}
```

## Privacy-Focused Implementation

```tsx
import React from 'react';

function PrivacyFocusedApp() {
  return (
    <div>
      {/* Block sensitive elements from recording */}
      <input
        type="password"
        className="mentiq-block" // Won't be recorded at all
        placeholder="Password"
      />

      {/* Mask sensitive text */}
      <div className="mentiq-mask">
        User's credit card: **** **** **** 1234
      </div>

      {/* Ignore entire sections */}
      <div className="mentiq-ignore">
        <p>Private conversation</p>
        <textarea placeholder="Private notes" />
      </div>

      {/* Normal content - will be recorded */}
      <button>Submit Form</button>
    </div>
  );
}
```

## Custom Recording Configuration

```tsx
import { SessionRecorder, RecordingConfig } from 'mentiq-sdk';

function CustomRecorderExample() {
  const analytics = useAnalytics();

  React.useEffect(() => {
    // Create a custom recorder with specific settings
    const customConfig: RecordingConfig = {
      maxDuration: 10 * 60 * 1000, // 10 minutes max
      checkoutEveryNms: 60 * 1000, // Full snapshot every minute
      blockClass: /sensitive-data/, // Block elements matching regex
      ignoreClass: 'no-record',
      maskAllInputs: true, // Mask all form inputs
      maskTextClass: /pii/, // Mask text with "pii" in class name
      inlineStylesheet: true,
      collectFonts: true,
      sampling: {
        mousemove: 100, // Sample mouse movement every 100ms
        mouseInteraction: true, // Record all clicks
        scroll: 200, // Sample scroll every 200ms
        input: 'last', // Only record final input values
      },
    };

    const recorder = new SessionRecorder(
      analytics.config,
      analytics.getSessionId(),
      customConfig
    );

    recorder.start();

    return () => {
      recorder.stop();
    };
  }, [analytics]);

  return <YourApp />;
}
```

## Recording with User Consent

```tsx
function RecordingWithConsent() {
  const analytics = useAnalytics();
  const [hasConsent, setHasConsent] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(true);

  React.useEffect(() => {
    // Check for stored consent
    const consent = localStorage.getItem('recording-consent');
    if (consent === 'true') {
      setHasConsent(true);
      setShowBanner(false);
    }
  }, []);

  React.useEffect(() => {
    if (hasConsent) {
      analytics.startRecording();
    } else {
      analytics.stopRecording();
    }
  }, [hasConsent, analytics]);

  const handleAccept = () => {
    localStorage.setItem('recording-consent', 'true');
    setHasConsent(true);
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('recording-consent', 'false');
    setHasConsent(false);
    setShowBanner(false);
  };

  return (
    <>
      {showBanner && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#333',
          color: 'white',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p>
            We use session recording to improve your experience.
            Your privacy is important to us.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleAccept}>Accept</button>
            <button onClick={handleDecline}>Decline</button>
          </div>
        </div>
      )}
      <YourApp />
    </>
  );
}
```

## Error Boundary Integration

```tsx
import { AnalyticsErrorBoundary, useAnalytics } from 'mentiq-sdk';

function ErrorAwareRecording() {
  const analytics = useAnalytics();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Stop recording on critical errors
    if (error.message.includes('CRITICAL')) {
      analytics.stopRecording();
    }

    // Track the error
    analytics.trackCustomError(error, {
      componentStack: errorInfo.componentStack,
      wasRecording: analytics.isRecordingActive(),
    });
  };

  return (
    <AnalyticsErrorBoundary
      fallback={<ErrorFallback />}
      onError={handleError}
    >
      <YourApp />
    </AnalyticsErrorBoundary>
  );
}
```

## Performance-Optimized Recording

```tsx
function PerformanceOptimizedRecording() {
  const analytics = useAnalytics();
  const [isSlowDevice, setIsSlowDevice] = React.useState(false);

  React.useEffect(() => {
    // Detect device performance
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      setIsSlowDevice(true);
    }

    if (isSlowDevice) {
      // Use more aggressive sampling on slow devices
      const recorder = new SessionRecorder(
        analytics.config,
        analytics.getSessionId(),
        {
          sampling: {
            mousemove: 500, // Sample less frequently
            scroll: 500,
            input: 'last',
          },
          collectFonts: false, // Skip font collection
        }
      );
      recorder.start();
    } else {
      analytics.startRecording();
    }
  }, [isSlowDevice, analytics]);

  return <YourApp />;
}
```

## Next.js Integration

```tsx
// pages/_app.tsx
import { AnalyticsProvider } from 'mentiq-sdk';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AnalyticsProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_MENTIQ_API_KEY!,
        projectId: process.env.NEXT_PUBLIC_MENTIQ_PROJECT_ID!,
        enableSessionRecording: true,
      }}
    >
      <Component {...pageProps} />
    </AnalyticsProvider>
  );
}

// components/RecordingControl.tsx
import { useAnalytics } from 'mentiq-sdk';
import { useRouter } from 'next/router';

export function RecordingControl() {
  const analytics = useAnalytics();
  const router = useRouter();

  React.useEffect(() => {
    // Don't record on admin pages
    if (router.pathname.startsWith('/admin')) {
      analytics.stopRecording();
    } else {
      analytics.startRecording();
    }
  }, [router.pathname, analytics]);

  return null;
}
```

## Testing with Recording

```tsx
// For testing, you might want to disable recording
function TestableApp() {
  const isTestEnv = process.env.NODE_ENV === 'test';

  return (
    <AnalyticsProvider
      config={{
        apiKey: 'test-key',
        projectId: 'test-project',
        enableSessionRecording: !isTestEnv, // Disable in tests
      }}
    >
      <YourApp />
    </AnalyticsProvider>
  );
}
```

## Recording Analytics Dashboard

```tsx
function RecordingDashboard() {
  const analytics = useAnalytics();
  const [stats, setStats] = React.useState({
    isActive: false,
    eventCount: 0,
    duration: 0,
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        isActive: analytics.isRecordingActive(),
        eventCount: analytics.getQueueSize(),
        duration: analytics.getSessionData().duration || 0,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [analytics]);

  return (
    <div style={{ padding: '20px', background: '#f5f5f5' }}>
      <h3>Recording Status</h3>
      <p>Status: {stats.isActive ? '🔴 Active' : '⚫ Inactive'}</p>
      <p>Events Queued: {stats.eventCount}</p>
      <p>Session Duration: {Math.floor(stats.duration / 1000)}s</p>
    </div>
  );
}
```

## Advanced: Programmatic Control

```tsx
function AdvancedRecordingControl() {
  const analytics = useAnalytics();

  const handleUserAction = async (action: string) => {
    switch (action) {
      case 'support-request':
        // Start recording when user needs support
        analytics.startRecording();
        break;
      
      case 'payment':
        // Pause during payment for PCI compliance
        analytics.pauseRecording();
        break;
      
      case 'payment-complete':
        // Resume after payment
        analytics.resumeRecording();
        break;
      
      case 'session-end':
        // Stop recording at logout
        analytics.stopRecording();
        break;
    }
  };

  return (
    <div>
      <button onClick={() => handleUserAction('support-request')}>
        Contact Support
      </button>
      <button onClick={() => handleUserAction('payment')}>
        Go to Payment
      </button>
    </div>
  );
}
```

## CSS Classes for Privacy

```css
/* Add these to your stylesheet */

/* Completely block from recording */
.mentiq-block {
  /* Element won't appear in recording */
}

/* Mask sensitive text */
.mentiq-mask {
  /* Text will be replaced with asterisks */
}

/* Ignore element and children */
.mentiq-ignore {
  /* Entire subtree won't be recorded */
}

/* Example usage */
.credit-card-input {
  @extend .mentiq-block;
}

.user-email {
  @extend .mentiq-mask;
}

.private-notes {
  @extend .mentiq-ignore;
}
```
