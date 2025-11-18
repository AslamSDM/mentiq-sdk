/**
 * Enhanced Funnel Management and Session Analytics Tests
 */

import { Analytics } from "../analytics";
import { AnalyticsConfig } from "../types";

// Mock window and document for testing
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  location: { href: "http://localhost:3000" },
  navigator: { userAgent: "test" },
  innerWidth: 1024,
  innerHeight: 768,
  pageXOffset: 0,
  pageYOffset: 0,
};

const mockDocument = {
  documentElement: {
    scrollTop: 0,
    scrollHeight: 2000,
  },
  title: "Test Page",
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// @ts-ignore
global.window = mockWindow;
// @ts-ignore
global.document = mockDocument;

describe("Enhanced Funnel Management", () => {
  let analytics: Analytics;

  beforeEach(() => {
    const config: AnalyticsConfig = {
      apiKey: "test-key",
      projectId: "test-project",
      debug: true,
      enableAutoPageTracking: false,
      enableHeatmapTracking: false,
      enableSessionRecording: false,
    };

    analytics = new Analytics(config);
    jest.clearAllMocks();
  });

  describe("Funnel Lifecycle", () => {
    it("should start a funnel successfully", () => {
      const trackSpy = jest.spyOn(analytics, "track");

      analytics.startFunnel("test_funnel", { source: "test" });

      expect(trackSpy).toHaveBeenCalledWith("funnel_step", {
        funnel_name: "test_funnel",
        step_name: "start",
        step_index: 0,
        source: "test",
      });

      const state = analytics.getFunnelState("test_funnel");
      expect(state).toBeDefined();
      expect(state.funnelName).toBe("test_funnel");
      expect(state.currentStep).toBe(0);
      expect(state.isActive).toBe(true);
    });

    it("should advance funnel steps correctly", () => {
      const trackSpy = jest.spyOn(analytics, "track");

      analytics.startFunnel("test_funnel");
      analytics.advanceFunnel("test_funnel", "step_1", { data: "test" });

      const state = analytics.getFunnelState("test_funnel");
      expect(state.currentStep).toBe(1);
      expect(state.steps).toContain("step_1");

      expect(trackSpy).toHaveBeenLastCalledWith(
        "funnel_step",
        expect.objectContaining({
          funnel_name: "test_funnel",
          step_name: "step_1",
          step_index: 1,
          data: "test",
          previous_step: "start",
          total_steps_completed: 1,
        })
      );
    });

    it("should track funnel abandonment with reason", () => {
      const trackSpy = jest.spyOn(analytics, "track");

      analytics.startFunnel("test_funnel");
      analytics.advanceFunnel("test_funnel", "step_1");
      analytics.abandonFunnel("test_funnel", "user_exit", { page: "/test" });

      expect(trackSpy).toHaveBeenLastCalledWith(
        "funnel_abandoned",
        expect.objectContaining({
          funnel_name: "test_funnel",
          abandoned_at_step: 1,
          abandoned_step_name: "step_1",
          abandon_reason: "user_exit",
          steps_completed_count: 1,
          page: "/test",
        })
      );

      const state = analytics.getFunnelState("test_funnel");
      expect(state).toBeUndefined();
    });

    it("should complete funnel and clear state", () => {
      const trackSpy = jest.spyOn(analytics, "track");

      analytics.startFunnel("test_funnel");
      analytics.advanceFunnel("test_funnel", "step_1");
      analytics.completeFunnel("test_funnel", { success: true });

      expect(trackSpy).toHaveBeenLastCalledWith("funnel_completed", {
        funnel_name: "test_funnel",
        success: true,
      });

      const state = analytics.getFunnelState("test_funnel");
      expect(state).toBeUndefined();
    });

    it("should handle non-existent funnel gracefully", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      analytics.advanceFunnel("non_existent_funnel", "step_1");

      expect(consoleSpy).toHaveBeenCalledWith(
        "Funnel non_existent_funnel not started"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Funnel Timeout Handling", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should abandon funnel after timeout", () => {
      const trackSpy = jest.spyOn(analytics, "track");

      analytics.startFunnel("timeout_funnel");

      // Fast-forward time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(trackSpy).toHaveBeenLastCalledWith(
        "funnel_abandoned",
        expect.objectContaining({
          funnel_name: "timeout_funnel",
          abandon_reason: "timeout",
        })
      );
    });

    it("should reset timeout on funnel advancement", () => {
      const trackSpy = jest.spyOn(analytics, "track");

      analytics.startFunnel("reset_funnel");

      // Advance time by 4 minutes (less than timeout)
      jest.advanceTimersByTime(4 * 60 * 1000);

      // Advance funnel (should reset timer)
      analytics.advanceFunnel("reset_funnel", "step_1");

      // Advance time by another 4 minutes (total 8 minutes, but timer reset)
      jest.advanceTimersByTime(4 * 60 * 1000);

      // Should not have abandoned yet
      const state = analytics.getFunnelState("reset_funnel");
      expect(state).toBeDefined();
      expect(state.isActive).toBe(true);
    });
  });
});

describe("Enhanced Session Analytics", () => {
  let analytics: Analytics;

  beforeEach(() => {
    const config: AnalyticsConfig = {
      apiKey: "test-key",
      projectId: "test-project",
      debug: true,
    };

    analytics = new Analytics(config);
  });

  describe("Engagement Score Calculation", () => {
    it("should calculate engagement score correctly", () => {
      // Simulate session activity
      const sessionData = analytics.getSessionData();

      // Mock some activity
      sessionData.clickEvents = 10; // 20 points (10 * 2, max 25)
      sessionData.scrollDepth = 75; // 20 points (capped at 20)
      sessionData.pageViews = 3; // 12 points (3 * 4, max 20)
      sessionData.scrollEvents = 8; // 4 points (8 * 0.5, max 5)

      // Mock 2 minutes duration for 6 points (2 * 3, max 30)
      const originalStartTime = sessionData.startTime;
      sessionData.startTime = Date.now() - 2 * 60 * 1000;

      const score = analytics.calculateEngagementScore();

      // Expected: 20 + 20 + 12 + 4 + 6 = 62 points
      expect(score).toBe(62);

      // Restore original start time
      sessionData.startTime = originalStartTime;
    });

    it("should cap engagement score at 100", () => {
      const sessionData = analytics.getSessionData();

      // Set extremely high values
      sessionData.clickEvents = 50; // Should be capped at 25 points
      sessionData.scrollDepth = 100; // 20 points
      sessionData.pageViews = 10; // Should be capped at 20 points
      sessionData.scrollEvents = 20; // Should be capped at 5 points

      // Mock 20 minutes for maximum time points
      sessionData.startTime = Date.now() - 20 * 60 * 1000;

      const score = analytics.calculateEngagementScore();

      expect(score).toBe(100);
    });
  });

  describe("Bounce Likelihood Calculation", () => {
    it("should calculate high bounce likelihood for inactive users", () => {
      const sessionData = analytics.getSessionData();

      // Simulate minimal activity
      sessionData.pageViews = 1;
      sessionData.clickEvents = 0;
      sessionData.scrollEvents = 0;
      sessionData.scrollDepth = 10;

      const session = analytics.getActiveSession();

      // Should have high bounce likelihood
      expect(session.bounceLikelihood).toBeGreaterThan(80);
    });

    it("should calculate low bounce likelihood for engaged users", () => {
      const sessionData = analytics.getSessionData();

      // Simulate high activity
      sessionData.pageViews = 5; // -30 points
      sessionData.clickEvents = 10; // -20 points
      sessionData.scrollEvents = 8; // -15 points
      sessionData.scrollDepth = 80; // -15 points

      // Mock 3 minutes duration
      sessionData.startTime = Date.now() - 3 * 60 * 1000; // -20 points total

      const session = analytics.getActiveSession();

      // Should have very low bounce likelihood (100 - 100 = 0, but capped at 0)
      expect(session.bounceLikelihood).toBeLessThan(20);
    });
  });

  describe("Session Data Updates", () => {
    it("should update page changes on page navigation", () => {
      const initialPageChanges = analytics.getSessionData().pageChanges || 0;

      analytics.page({ title: "Test Page 1" });
      analytics.page({ title: "Test Page 2" });

      const updatedData = analytics.getSessionData();
      expect(updatedData.pageChanges).toBe(initialPageChanges + 2);
      expect(updatedData.pageViews).toBe(2);
    });

    it("should provide real-time session metrics", () => {
      const session1 = analytics.getActiveSession();
      const timestamp1 = session1.startTime;

      // Wait a bit
      setTimeout(() => {
        const session2 = analytics.getActiveSession();

        expect(session2.duration).toBeGreaterThan(session1.duration || 0);
        expect(session2.startTime).toBe(timestamp1); // Should be same session
      }, 100);
    });
  });
});

describe("Integration Tests", () => {
  let analytics: Analytics;

  beforeEach(() => {
    const config: AnalyticsConfig = {
      apiKey: "test-key",
      projectId: "test-project",
      debug: true,
    };

    analytics = new Analytics(config);
  });

  it("should track funnel progression with engagement metrics", () => {
    // Start funnel
    analytics.startFunnel("integration_test");

    // Simulate user activity
    analytics.page({ title: "Landing Page" });

    // Get initial engagement
    const initialEngagement = analytics.calculateEngagementScore();

    // Advance funnel with engagement context
    analytics.advanceFunnel("integration_test", "engaged_step", {
      engagement_score: initialEngagement,
    });

    // Simulate more activity
    analytics.page({ title: "Product Page" });

    const finalEngagement = analytics.calculateEngagementScore();
    const session = analytics.getActiveSession();

    expect(finalEngagement).toBeGreaterThan(initialEngagement);
    expect(session.pageViews).toBe(2);
    expect(session.engagementScore).toBe(finalEngagement);

    // Complete funnel with final metrics
    analytics.completeFunnel("integration_test", {
      final_engagement: finalEngagement,
      bounce_likelihood: session.bounceLikelihood,
    });
  });
});
