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
      endpoint: "http://localhost:8080",

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
          time_in_funnel: expect.any(Number),
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
          time_before_abandon: expect.any(Number),
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
      // Get the session data and modify the analytics internal state
      const sessionData = analytics.getSessionData();

      // Simulate user activity by directly modifying the analytics sessionData
      // This is a test, so we access the private property
      (analytics as any).sessionData.clickEvents = 10;
      (analytics as any).sessionData.scrollDepth = 75;
      (analytics as any).sessionData.pageViews = 3;
      (analytics as any).sessionData.scrollEvents = 8;

      // Mock 2 minutes duration
      (analytics as any).sessionData.startTime = Date.now() - 2 * 60 * 1000;

      const score = analytics.calculateEngagementScore();

      // Score should be a reasonable number based on activity
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should cap engagement score at 100", () => {
      // Set extremely high values via internal state
      (analytics as any).sessionData.clickEvents = 50;
      (analytics as any).sessionData.scrollDepth = 100;
      (analytics as any).sessionData.pageViews = 10;
      (analytics as any).sessionData.scrollEvents = 20;
      (analytics as any).sessionData.startTime = Date.now() - 20 * 60 * 1000;

      const score = analytics.calculateEngagementScore();

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe("Bounce Likelihood Calculation", () => {
    it("should calculate high bounce likelihood for inactive users", () => {
      // Reset session data to minimal activity
      (analytics as any).sessionData.pageViews = 1;
      (analytics as any).sessionData.clickEvents = 0;
      (analytics as any).sessionData.scrollEvents = 0;
      (analytics as any).sessionData.scrollDepth = 10;

      const session = analytics.getActiveSession();

      // Should have high bounce likelihood
      expect(session.bounceLikelihood).toBeGreaterThan(70);
    });

    it("should calculate low bounce likelihood for engaged users", () => {
      // Simulate high activity via internal state
      (analytics as any).sessionData.pageViews = 5;
      (analytics as any).sessionData.clickEvents = 10;
      (analytics as any).sessionData.scrollEvents = 8;
      (analytics as any).sessionData.scrollDepth = 80;
      (analytics as any).sessionData.startTime = Date.now() - 3 * 60 * 1000;

      const session = analytics.getActiveSession();

      // Should have low bounce likelihood due to high engagement
      expect(session.bounceLikelihood).toBeLessThan(50);
    });
  });

  describe("Session Data Updates", () => {
    it("should update page changes on page navigation", () => {
      const initialData = analytics.getSessionData();
      const initialPageChanges = initialData.pageChanges || 0;
      const initialPageViews = initialData.pageViews;

      analytics.page({ title: "Test Page 1" });
      analytics.page({ title: "Test Page 2" });

      const updatedData = analytics.getSessionData();
      expect(updatedData.pageChanges).toBe(initialPageChanges + 2);
      expect(updatedData.pageViews).toBe(initialPageViews + 2);
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
    expect(session.pageViews).toBeGreaterThanOrEqual(2);
    expect(session.engagementScore).toBe(finalEngagement);

    // Complete funnel with final metrics
    analytics.completeFunnel("integration_test", {
      final_engagement: finalEngagement,
      bounce_likelihood: session.bounceLikelihood,
    });
  });
});
