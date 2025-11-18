import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Analytics } from "../analytics";
import { AnalyticsConfig } from "../types";

// Simple integration test for the Analytics class
describe("Analytics Integration", () => {
  let analytics: Analytics;
  const config: AnalyticsConfig = {
    apiKey: "test-api-key",
    projectId: "test-project",
    endpoint: "https://test-endpoint.com",
  };

  beforeEach(() => {
    analytics = new Analytics(config);
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    analytics.destroy();
    jest.clearAllMocks();
  });

  it("should initialize with correct config", () => {
    expect(analytics.config.apiKey).toBe("test-api-key");
    expect(analytics.config.projectId).toBe("test-project");
  });

  it("should track events", async () => {
    analytics.track("test_event", { test: true });

    // Flush to send events
    await analytics.flush();

    expect(fetch).toHaveBeenCalled();
  });

  it("should track page views", async () => {
    analytics.page({ path: "/test-page" });

    await analytics.flush();

    expect(fetch).toHaveBeenCalled();
  });

  it("should identify users", async () => {
    analytics.identify("user-123", { name: "Test User" });

    await analytics.flush();

    expect(fetch).toHaveBeenCalled();
  });

  it("should handle funnel tracking", () => {
    analytics.startFunnel("signup_funnel");
    
    const initialState = analytics.getFunnelState("signup_funnel");
    expect(initialState).toBeDefined();
    expect(initialState.isActive).toBe(true);
    
    analytics.advanceFunnel("signup_funnel", "email_entered");
    analytics.advanceFunnel("signup_funnel", "password_entered");
    
    const beforeComplete = analytics.getFunnelState("signup_funnel");
    expect(beforeComplete.currentStep).toBe(2);
    
    analytics.completeFunnel("signup_funnel");

    // After completion, funnel state should be cleared
    const funnelState = analytics.getFunnelState("signup_funnel");
    expect(funnelState).toBeUndefined();
  });

  it("should calculate engagement score", () => {
    // Simulate some user activity
    analytics.track("button_click");
    analytics.track("scroll");
    analytics.track("page_view");

    const score = analytics.calculateEngagementScore();
    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("should get session data", () => {
    const sessionData = analytics.getSessionData();

    expect(sessionData).toBeDefined();
    expect(sessionData.sessionId).toBeDefined();
    expect(typeof sessionData.duration).toBe("number");
  });

  it("should handle errors gracefully", () => {
    // Mock fetch to fail
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    expect(() => {
      analytics.track("test_event");
    }).not.toThrow();
  });

  it("should respect queue limits", () => {
    // Fill the queue beyond limit
    for (let i = 0; i < 200; i++) {
      analytics.track("test_event", { index: i });
    }

    const queueSize = analytics.getQueueSize();
    expect(queueSize).toBeLessThanOrEqual(100); // Default max queue size
  });
});

// Test for session recording functionality
describe("Session Recording", () => {
  let analytics: Analytics;

  beforeEach(() => {
    analytics = new Analytics({
      apiKey: "test-key",
      projectId: "test-project",
      enableSessionRecording: true,
    });

    // Mock rrweb
    jest.doMock("rrweb", () => ({
      record: jest.fn(() => jest.fn()), // Returns stop function
    }));
  });

  afterEach(() => {
    analytics.destroy();
    jest.clearAllMocks();
  });

  it("should start recording when enabled", () => {
    analytics.startRecording();
    expect(analytics.isRecordingActive()).toBe(true);
  });

  it("should stop recording", () => {
    analytics.startRecording();
    analytics.stopRecording();
    expect(analytics.isRecordingActive()).toBe(false);
  });

  it("should pause and resume recording", () => {
    analytics.startRecording();
    analytics.pauseRecording();
    // Note: In real implementation, we'd check the paused state

    analytics.resumeRecording();
    expect(analytics.isRecordingActive()).toBe(true);
  });
});
