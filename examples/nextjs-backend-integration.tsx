// pages/_app.tsx
import type { AppProps } from "next/app";
import { AnalyticsProvider } from "mentiq-sdk";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AnalyticsProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_MENTIQ_API_KEY!,
        projectId: process.env.NEXT_PUBLIC_MENTIQ_PROJECT_ID!,
        endpoint:
          process.env.NEXT_PUBLIC_MENTIQ_ENDPOINT || "https://api.mentiq.io",
        debug: process.env.NODE_ENV === "development",
        enableAutoPageTracking: true,
        enableHeatmapTracking: true,
        enablePerformanceTracking: true,
        batchSize: 10,
        flushInterval: 5000,
      }}
    >
      <Component {...pageProps} />
    </AnalyticsProvider>
  );
}

// pages/index.tsx
import { useAnalytics, TrackClick, TrackView } from "mentiq-sdk";
import { useEffect } from "react";

export default function HomePage() {
  const { track, page, identify } = useAnalytics();

  useEffect(() => {
    // Auto page tracking sends this as 'page_view' to backend
    page({
      title: "Home - MentiQ Demo",
      path: "/",
      referrer: document.referrer,
    });
  }, [page]);

  const handleUserAction = (action: string, properties?: any) => {
    track(action, properties);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">MentiQ Analytics Demo</h1>

      {/* Track element views automatically */}
      <TrackView
        event="hero_viewed"
        properties={{ section: "hero" }}
        threshold={0.5}
        delay={1000}
      >
        <section className="bg-blue-100 p-8 rounded-lg mb-8">
          <h2 className="text-2xl mb-4">Hero Section</h2>
          <p>This view will be tracked when 50% visible for 1 second</p>
        </section>
      </TrackView>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Track clicks automatically - sent as 'user_signup' to backend */}
        <TrackClick
          event="signup"
          properties={{ source: "homepage", plan: "free" }}
        >
          <button
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
            onClick={() => handleUserAction("signup", { method: "email" })}
          >
            Sign Up Free
          </button>
        </TrackClick>

        {/* Track clicks - sent as 'user_login' to backend */}
        <TrackClick event="login" properties={{ source: "homepage" }}>
          <button
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
            onClick={() => handleUserAction("login")}
          >
            Login
          </button>
        </TrackClick>

        {/* Track clicks - sent as 'purchase' to backend */}
        <TrackClick
          event="purchase"
          properties={{ plan: "premium", amount: 29.99 }}
        >
          <button
            className="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600"
            onClick={() =>
              handleUserAction("purchase", {
                plan: "premium",
                amount: 29.99,
                currency: "USD",
              })
            }
          >
            Upgrade to Premium
          </button>
        </TrackClick>

        {/* Track clicks - sent as 'file_download' to backend */}
        <TrackClick
          event="download"
          properties={{ file_type: "pdf", category: "documentation" }}
        >
          <button
            className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
            onClick={() =>
              handleUserAction("download", {
                file_name: "api-docs.pdf",
                file_size: "1.2MB",
              })
            }
          >
            Download API Docs
          </button>
        </TrackClick>
      </div>

      {/* Track form interactions */}
      <TrackView
        event="contact_form_viewed"
        properties={{ section: "contact" }}
      >
        <section className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              track("form_submit", { form_type: "contact" });
            }}
          >
            <div className="mb-4">
              <input
                type="email"
                placeholder="Your email"
                className="w-full p-2 border rounded"
                onFocus={() => track("form_field_focus", { field: "email" })}
              />
            </div>
            <div className="mb-4">
              <textarea
                placeholder="Your message"
                className="w-full p-2 border rounded h-24"
                onFocus={() => track("form_field_focus", { field: "message" })}
              />
            </div>
            <TrackClick
              event="form_submit"
              properties={{ form_type: "contact" }}
            >
              <button
                type="submit"
                className="bg-indigo-500 text-white px-6 py-2 rounded hover:bg-indigo-600"
              >
                Send Message
              </button>
            </TrackClick>
          </form>
        </section>
      </TrackView>
    </div>
  );
}

// .env.local
/*
NEXT_PUBLIC_MENTIQ_API_KEY=your-api-key-here
NEXT_PUBLIC_MENTIQ_PROJECT_ID=your-project-id-here
NEXT_PUBLIC_MENTIQ_ENDPOINT=https://api.mentiq.io
*/
