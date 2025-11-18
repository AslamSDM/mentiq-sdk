import React, { useEffect, useState } from "react";
import {
  init,
  startFunnel,
  advanceFunnel,
  abandonFunnel,
  completeFunnel,
  getFunnelState,
  getActiveSession,
  calculateEngagementScore,
} from "@mentiq/analytics";

// Initialize MentiQ Analytics
const analytics = init({
  apiKey: "your_api_key",
  projectId: "your_project_id",
  debug: true,
});

export default function EnhancedFunnelExample() {
  const [funnelState, setFunnelState] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [engagementScore, setEngagementScore] = useState<number>(0);

  useEffect(() => {
    // Start a purchase funnel when component mounts
    startFunnel("purchase_funnel", {
      campaign: "holiday_sale",
      source: "homepage",
    });

    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      const currentFunnelState = getFunnelState("purchase_funnel");
      const currentSession = getActiveSession();
      const currentEngagement = calculateEngagementScore();

      setFunnelState(currentFunnelState);
      setSessionData(currentSession);
      setEngagementScore(currentEngagement);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleProductView = () => {
    advanceFunnel("purchase_funnel", "product_view", {
      product_id: "abc123",
      product_category: "electronics",
    });
  };

  const handleAddToCart = () => {
    advanceFunnel("purchase_funnel", "add_to_cart", {
      cart_value: 299.99,
      quantity: 1,
    });
  };

  const handleCheckout = () => {
    advanceFunnel("purchase_funnel", "checkout_start", {
      payment_method: "credit_card",
    });
  };

  const handlePurchase = () => {
    completeFunnel("purchase_funnel", {
      order_id: "order_12345",
      total_amount: 299.99,
      currency: "USD",
    });
  };

  const handleAbandon = () => {
    abandonFunnel("purchase_funnel", "user_clicked_abandon", {
      abandon_page: window.location.pathname,
      time_on_page: Date.now(),
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        Enhanced Funnel Tracking Example
      </h1>

      {/* Funnel Actions */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Purchase Funnel Actions</h2>
        <div className="space-x-4">
          <button
            onClick={handleProductView}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            View Product
          </button>
          <button
            onClick={handleAddToCart}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add to Cart
          </button>
          <button
            onClick={handleCheckout}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Start Checkout
          </button>
          <button
            onClick={handlePurchase}
            className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
          >
            Complete Purchase
          </button>
          <button
            onClick={handleAbandon}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Abandon Funnel
          </button>
        </div>
      </div>

      {/* Real-time Funnel State */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Funnel State</h2>
        {funnelState ? (
          <div className="space-y-2">
            <p>
              <strong>Funnel:</strong> {funnelState.funnelName}
            </p>
            <p>
              <strong>Current Step:</strong> {funnelState.currentStep}
            </p>
            <p>
              <strong>Time in Funnel:</strong>{" "}
              {Math.round(funnelState.timeInFunnel / 1000)}s
            </p>
            <p>
              <strong>Steps Completed:</strong> {funnelState.steps.join(" → ")}
            </p>
            <p>
              <strong>Active:</strong> {funnelState.isActive ? "Yes" : "No"}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">No active funnel</p>
        )}
      </div>

      {/* Session Analytics */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Session Analytics</h2>
        {sessionData && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>
                <strong>Page Views:</strong> {sessionData.pageViews}
              </p>
              <p>
                <strong>Clicks:</strong>{" "}
                {sessionData.clickEvents || sessionData.clicks}
              </p>
              <p>
                <strong>Scroll Events:</strong> {sessionData.scrollEvents || 0}
              </p>
              <p>
                <strong>Max Scroll Depth:</strong> {sessionData.maxScrollDepth}%
              </p>
            </div>
            <div>
              <p>
                <strong>Session Duration:</strong>{" "}
                {Math.round((sessionData.duration || 0) / 1000)}s
              </p>
              <p>
                <strong>Engagement Score:</strong>{" "}
                {sessionData.engagementScore?.toFixed(1) || 0}/100
              </p>
              <p>
                <strong>Bounce Likelihood:</strong>{" "}
                {sessionData.bounceLikelihood?.toFixed(1) || 0}%
              </p>
              <p>
                <strong>Active:</strong> {sessionData.isActive ? "Yes" : "No"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Engagement Score Display */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          Real-time Engagement Score
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${engagementScore}%` }}
            />
          </div>
          <span className="text-2xl font-bold">
            {engagementScore.toFixed(1)}/100
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Engagement score updates automatically based on user interactions
        </p>
      </div>
    </div>
  );
}
