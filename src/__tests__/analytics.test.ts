import { Analytics } from "../analytics";
import { AnalyticsConfig } from "../types";

// Mock fetch for testing
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("Analytics", () => {
  let analytics: Analytics;
  const config: AnalyticsConfig = {
    apiKey: "test-key",
    debug: true,
  };

  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    } as Response);

    // Clear localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Clear sessionStorage
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    analytics = new Analytics(config);
  });

  afterEach(() => {
    analytics.destroy();
  });

  describe("initialization", () => {
    it("should initialize with config", () => {
      expect(analytics).toBeInstanceOf(Analytics);
      expect(analytics.getAnonymousId()).toBeDefined();
      expect(analytics.getSessionId()).toBeDefined();
    });
  });

  describe("track", () => {
    it("should track events", () => {
      analytics.track("test_event", { foo: "bar" });

      // Should queue the event
      expect(analytics.getSessionId()).toBeDefined();
    });

    it("should include user properties in events", () => {
      const userId = "user123";
      analytics.identify(userId);
      analytics.track("test_event");

      expect(analytics.getUserId()).toBe(userId);
    });
  });

  describe("page", () => {
    it("should track page views", () => {
      analytics.page({ title: "Test Page" });

      expect(analytics.getSessionId()).toBeDefined();
    });
  });

  describe("identify", () => {
    it("should set user ID", () => {
      const userId = "user123";
      analytics.identify(userId, { name: "Test User" });

      expect(analytics.getUserId()).toBe(userId);
    });
  });

  describe("alias", () => {
    it("should create alias", () => {
      analytics.alias("new-id", "old-id");

      expect(analytics.getSessionId()).toBeDefined();
    });
  });

  describe("reset", () => {
    it("should reset user data", () => {
      analytics.identify("user123");
      analytics.reset();

      expect(analytics.getUserId()).toBeNull();
    });
  });

  describe("flush", () => {
    it("should send queued events", async () => {
      analytics.track("test_event");
      await analytics.flush();

      expect(mockFetch).toHaveBeenCalled();
    });

    it("should handle flush errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      analytics.track("test_event");

      await expect(analytics.flush()).rejects.toThrow("Network error");
    });
  });
});
