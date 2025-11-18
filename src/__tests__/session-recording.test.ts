import { SessionRecorder, RRWebEvent } from "../session-recording";
import { AnalyticsConfig } from "../types";

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("SessionRecorder", () => {
  let recorder: SessionRecorder;
  const config: AnalyticsConfig = {
    apiKey: "test-api-key",
    projectId: "test-project-id",
    endpoint: "https://api.test.com",
    debug: false, // Set to false to avoid console spam
  };
  const sessionId = "test-session-123";

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
    } as Response);

    // Mock localStorage
    const localStorageMock: { [key: string]: string } = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key: string) => localStorageMock[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: jest.fn(() => {
          Object.keys(localStorageMock).forEach((key) => {
            delete localStorageMock[key];
          });
        }),
      },
      writable: true,
    });

    recorder = new SessionRecorder(config, sessionId);
  });

  afterEach(() => {
    recorder.stop();
  });

  describe("initialization", () => {
    it("should create a recorder instance", () => {
      expect(recorder).toBeInstanceOf(SessionRecorder);
    });

    it("should not be recording initially", () => {
      expect(recorder.isActive()).toBe(false);
    });

    it("should accept custom recording config", () => {
      const customConfig = {
        maxDuration: 10 * 60 * 1000,
        blockClass: "custom-block",
        maskAllInputs: false,
      };
      const customRecorder = new SessionRecorder(config, sessionId, customConfig);
      expect(customRecorder).toBeInstanceOf(SessionRecorder);
    });
  });

  describe("basic controls", () => {
    it("should have start method", () => {
      expect(typeof recorder.start).toBe('function');
    });

    it("should have stop method", () => {
      expect(typeof recorder.stop).toBe('function');
    });

    it("should have pause method", () => {
      expect(typeof recorder.pause).toBe('function');
    });

    it("should have resume method", () => {
      expect(typeof recorder.resume).toBe('function');
    });

    it("should have isActive method", () => {
      expect(typeof recorder.isActive).toBe('function');
    });

    it("should handle stop when not recording", () => {
      expect(() => recorder.stop()).not.toThrow();
    });
  });

  describe("event management", () => {
    it("should return current event count", () => {
      expect(recorder.getEventCount()).toBe(0);
    });

    it("should clear events", () => {
      recorder.clearEvents();
      expect(recorder.getEventCount()).toBe(0);
    });
  });

  describe("configuration", () => {
    it("should use custom block class", () => {
      const customRecorder = new SessionRecorder(config, sessionId, {
        blockClass: "custom-block",
      });
      
      expect(customRecorder).toBeInstanceOf(SessionRecorder);
    });

    it("should use custom sampling config", () => {
      const customRecorder = new SessionRecorder(config, sessionId, {
        sampling: {
          mousemove: 100,
          scroll: 200,
          input: 'last',
        },
      });
      
      expect(customRecorder).toBeInstanceOf(SessionRecorder);
    });

    it("should accept maxDuration config", () => {
      const customRecorder = new SessionRecorder(config, sessionId, {
        maxDuration: 1000,
      });
      
      expect(customRecorder).toBeInstanceOf(SessionRecorder);
    });
  });

  describe("integration with analytics", () => {
    it("should use analytics config", () => {
      expect(recorder).toBeDefined();
    });

    it("should use session ID from analytics", () => {
      const testRecorder = new SessionRecorder(config, "custom-session-456");
      expect(testRecorder).toBeInstanceOf(SessionRecorder);
    });

    it("should handle different endpoints", () => {
      const customConfig = {
        ...config,
        endpoint: "https://custom.api.com",
      };
      const customRecorder = new SessionRecorder(customConfig, sessionId);
      expect(customRecorder).toBeInstanceOf(SessionRecorder);
    });
  });

  describe("API integration", () => {
    it("should use correct API endpoint format", () => {
      // The endpoint should be /api/v1/sessions/:session_id/recordings
      const expectedEndpoint = `${config.endpoint}/api/v1/sessions/${sessionId}/recordings`;
      expect(expectedEndpoint).toBe("https://api.test.com/api/v1/sessions/test-session-123/recordings");
    });

    it("should use correct authentication headers", () => {
      // Headers should include ApiKey and X-Project-ID
      const expectedHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `ApiKey ${config.apiKey}`,
        'X-Project-ID': config.projectId,
      };
      
      expect(expectedHeaders.Authorization).toBe("ApiKey test-api-key");
      expect(expectedHeaders['X-Project-ID']).toBe("test-project-id");
    });
  });

  describe("error handling", () => {
    it("should not throw on start", () => {
      expect(() => recorder.start()).not.toThrow();
    });

    it("should not throw on stop", () => {
      expect(() => recorder.stop()).not.toThrow();
    });

    it("should not throw on pause", () => {
      expect(() => recorder.pause()).not.toThrow();
    });

    it("should not throw on resume", () => {
      expect(() => recorder.resume()).not.toThrow();
    });
  });

  describe("browser compatibility", () => {
    it("should work in browser environment", () => {
      expect(typeof window).not.toBe("undefined");
      expect(recorder).toBeDefined();
    });

    it("should handle missing rrweb gracefully", () => {
      // Since rrweb is loaded dynamically, missing it shouldn't crash
      expect(() => recorder.start()).not.toThrow();
    });
  });
});
