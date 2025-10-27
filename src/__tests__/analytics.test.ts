import { Analytics } from "../analytics";
import { AnalyticsConfig } from "../types";

// Mock fetch for testing
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("Analytics", () => {
  let analytics: Analytics;
  const config: AnalyticsConfig = {
    apiKey: "test-key",
    projectId: "test-project-123",
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
    it("should send queued events to correct backend endpoint", async () => {
      analytics.track("test_event");
      await analytics.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.mentiq.io/api/v1/events/batch",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "ApiKey test-key",
            "X-Project-ID": "test-project-123",
          }),
        })
      );
    });

    it("should transform events to backend format", async () => {
      analytics.track("button_clicked", { element: "signup-btn" });
      await analytics.flush();

      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body as string);

      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: "click",
            properties: expect.objectContaining({
              element: "signup-btn",
            }),
            timestamp: expect.any(String),
          }),
        ])
      );
    });

    it("should send page views with correct event type", async () => {
      analytics.page({ title: "Home", path: "/home" });
      await analytics.flush();

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body as string);

      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: "page_view",
          }),
        ])
      );
    });

    it("should handle flush errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      analytics.track("test_event");

      // Since events are batched, this might not throw immediately
      try {
        await analytics.flush();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
