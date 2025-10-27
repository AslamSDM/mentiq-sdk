import React from "react";
import { AnalyticsProvider, useAnalytics, TrackView, TrackClick } from "../src";

// Example usage with MentiQ Analytics Backend
function App() {
  return (
    <AnalyticsProvider
      config={{
        apiKey: "your-api-key-here", // Get this from your MentiQ dashboard
        projectId: "your-project-id", // Get this from your MentiQ dashboard
        endpoint: "https://api.mentiq.io", // Your backend endpoint
        debug: true, // Enable for development
        enableAutoPageTracking: true,
        enableHeatmapTracking: true,
        batchSize: 10,
        flushInterval: 5000, // Send events every 5 seconds
      }}
    >
      <HomePage />
    </AnalyticsProvider>
  );
}

function HomePage() {
  const { track, page, identify } = useAnalytics();

  React.useEffect(() => {
    // Track page view (automatically sent as 'page_view' to backend)
    page({
      title: "Home Page",
      path: "/home",
      url: window.location.href,
    });

    // Identify user (sent as 'user_identify' to backend)
    identify("user-123", {
      email: "user@example.com",
      plan: "premium",
    });
  }, [page, identify]);

  const handleSignup = () => {
    // This will be sent as 'user_signup' to backend
    track("signup", {
      source: "homepage",
      plan: "free",
    });
  };

  const handlePurchase = () => {
    // This will be sent as 'purchase' to backend
    track("purchase", {
      product_id: "prod-123",
      amount: 29.99,
      currency: "USD",
    });
  };

  const handleDownload = () => {
    // This will be sent as 'file_download' to backend
    track("download", {
      file_name: "user-guide.pdf",
      file_size: "2.5MB",
    });
  };

  return (
    <div>
      <h1>Welcome to Our App</h1>

      {/* Automatic click tracking - sent as 'click' to backend */}
      <TrackClick event="button_clicked" properties={{ element: "signup" }}>
        <button onClick={handleSignup}>Sign Up</button>
      </TrackClick>

      {/* Automatic view tracking - sent as 'view' to backend */}
      <TrackView
        event="element_viewed"
        properties={{ element: "hero-section" }}
      >
        <section>
          <h2>Our Amazing Features</h2>
          <p>This section view will be tracked automatically</p>
        </section>
      </TrackView>

      <TrackClick event="purchase" properties={{ source: "homepage" }}>
        <button onClick={handlePurchase}>Buy Now - $29.99</button>
      </TrackClick>

      <TrackClick event="download" properties={{ type: "guide" }}>
        <button onClick={handleDownload}>Download User Guide</button>
      </TrackClick>
    </div>
  );
}

export default App;
