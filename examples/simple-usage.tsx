import React from "react";
import { MentiqAnalyticsProvider, useMentiqAnalytics } from "mentiq-sdk";

// Your component that uses analytics
function MyComponent() {
  const { track, page, identify } = useMentiqAnalytics();

  React.useEffect(() => {
    // Track page view
    page({ page: "home" });
  }, [page]);

  const handleButtonClick = () => {
    track("button_clicked", { button: "cta", location: "header" });
  };

  const handleUserSignup = () => {
    identify("user-123", {
      email: "user@example.com",
      plan: "pro",
    });
    track("user_signed_up", { method: "email" });
  };

  return (
    <div>
      <h1>My App</h1>
      <button onClick={handleButtonClick}>Click me (tracked)</button>
      <button onClick={handleUserSignup}>Sign Up (tracked)</button>
    </div>
  );
}

// Root App with MentiQ Analytics
function App() {
  return (
    <MentiqAnalyticsProvider
      config={{
        apiKey: "your-api-key",
        projectId: "your-project-id",
        endpoint: "https://analytics.yourapp.com/v1/events",
      }}
      loading={<div>Loading analytics...</div>}
    >
      <MyComponent />
    </MentiqAnalyticsProvider>
  );
}

export default App;
