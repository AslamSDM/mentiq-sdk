import React, { useState } from "react";
import {
  MentiqAnalyticsProvider,
  useMentiqAnalytics,
  TrackClick,
  TrackView,
} from "mentiq-sdk";

// Main App Component
function App() {
  return (
    <MentiqAnalyticsProvider
      config={{
        apiKey: "your-api-key-here",
        debug: true,
        enableAutoPageTracking: true,
      }}
      loading={<div>Loading analytics...</div>}
    >
      <Dashboard />
    </MentiqAnalyticsProvider>
  );
}

// Dashboard Component
function Dashboard() {
  const { track, identify } = useMentiqAnalytics();
  const [user, setUser] = useState<string | null>(null);

  const handleLogin = () => {
    const userId = "user_" + Math.random().toString(36).substr(2, 9);
    setUser(userId);

    // Identify the user
    identify(userId, {
      signup_date: new Date().toISOString(),
      plan: "free",
    });

    track("user_logged_in", {
      method: "demo",
    });
  };

  const handleFeatureClick = (feature: string) => {
    track("feature_clicked", {
      feature_name: feature,
      user_type: user ? "authenticated" : "anonymous",
    });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>MentiQ Analytics Demo</h1>

      {!user ? (
        <div>
          <h2>Welcome! Please log in to continue.</h2>
          <button
            onClick={handleLogin}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Demo Login
          </button>
        </div>
      ) : (
        <div>
          <h2>Welcome back, {user}!</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            <TrackView
              event="feature_card_viewed"
              properties={{ feature: "analytics" }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: "20px",
                  borderRadius: "8px",
                }}
              >
                <h3>Analytics Dashboard</h3>
                <p>View your analytics data and insights.</p>
                <TrackClick
                  event="feature_accessed"
                  properties={{ feature: "analytics" }}
                >
                  <button
                    onClick={() => handleFeatureClick("analytics")}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    View Analytics
                  </button>
                </TrackClick>
              </div>
            </TrackView>

            <TrackView
              event="feature_card_viewed"
              properties={{ feature: "reports" }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: "20px",
                  borderRadius: "8px",
                }}
              >
                <h3>Reports</h3>
                <p>Generate and download reports.</p>
                <TrackClick
                  event="feature_accessed"
                  properties={{ feature: "reports" }}
                >
                  <button
                    onClick={() => handleFeatureClick("reports")}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#6f42c1",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    View Reports
                  </button>
                </TrackClick>
              </div>
            </TrackView>

            <TrackView
              event="feature_card_viewed"
              properties={{ feature: "settings" }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: "20px",
                  borderRadius: "8px",
                }}
              >
                <h3>Settings</h3>
                <p>Configure your account settings.</p>
                <TrackClick
                  event="feature_accessed"
                  properties={{ feature: "settings" }}
                >
                  <button
                    onClick={() => handleFeatureClick("settings")}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Open Settings
                  </button>
                </TrackClick>
              </div>
            </TrackView>
          </div>

          <div
            style={{
              marginTop: "40px",
              padding: "20px",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
            }}
          >
            <h3>Newsletter Signup</h3>
            <NewsletterForm />
          </div>
        </div>
      )}
    </div>
  );
}

// Newsletter Form Component with Analytics
function NewsletterForm() {
  const { track } = useMentiqAnalytics();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    track("newsletter_signup_attempted", {
      email_domain: email.split("@")[1] || "unknown",
    });

    // Simulate API call
    setTimeout(() => {
      setSubscribed(true);
      track("newsletter_signup_completed", {
        email_domain: email.split("@")[1] || "unknown",
        signup_source: "dashboard",
      });
    }, 1000);
  };

  if (subscribed) {
    return (
      <div style={{ color: "#28a745" }}>✅ Thank you for subscribing!</div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            track("newsletter_email_input_changed", {
              email_length: e.target.value.length,
            });
          }}
          placeholder="Enter your email"
          required
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            flex: 1,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Subscribe
        </button>
      </div>
    </form>
  );
}

export default App;
