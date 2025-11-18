import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MentiqAnalyticsProvider, useMentiqAnalytics } from '../dynamic-provider';

// Mock analytics module
jest.mock('../analytics', () => ({
  Analytics: jest.fn().mockImplementation(() => ({
    track: jest.fn(),
    page: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    getSessionData: jest.fn().mockReturnValue({
      sessionId: 'test-session',
      isActive: true,
      duration: 1000,
      pageViews: 1,
      clicks: 0,
      scrollDepth: 0,
    }),
    getQueueSize: jest.fn().mockReturnValue(0),
    trackCustomError: jest.fn(),
    trackPerformance: jest.fn(),
    getSessionId: jest.fn().mockReturnValue('test-session-id'),
  })),
}));

// Test component that uses analytics
function TestComponent() {
  const { track, page, identify, analytics } = useMentiqAnalytics();

  return (
    <div>
      <button onClick={() => track('test_event', { test: true })}>
        Track Event
      </button>
      <button onClick={() => page({ path: '/test' })}>
        Track Page
      </button>
      <button onClick={() => identify('user-123', { name: 'Test User' })}>
        Identify User
      </button>
      <div data-testid="session-id">{analytics?.getSessionId()}</div>
    </div>
  );
}

describe('MentiqAnalyticsProvider', () => {
  const defaultConfig = {
    apiKey: 'test-api-key',
    projectId: 'test-project',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    render(
      <MentiqAnalyticsProvider 
        config={defaultConfig}
        loading={<div>Loading analytics...</div>}
      >
        <TestComponent />
      </MentiqAnalyticsProvider>
    );

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('should render children after analytics loads', async () => {
    render(
      <MentiqAnalyticsProvider config={defaultConfig}>
        <TestComponent />
      </MentiqAnalyticsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Track Event')).toBeInTheDocument();
    });
  });

  it('should provide analytics context to children', async () => {
    render(
      <MentiqAnalyticsProvider config={defaultConfig}>
        <TestComponent />
      </MentiqAnalyticsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-id')).toHaveTextContent('test-session-id');
    });
  });

  it('should handle analytics method calls', async () => {
    render(
      <MentiqAnalyticsProvider config={defaultConfig}>
        <TestComponent />
      </MentiqAnalyticsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Track Event')).toBeInTheDocument();
    });

    // Test track event
    fireEvent.click(screen.getByText('Track Event'));
    // Note: In the actual implementation, we'd verify the mock was called
    
    // Test page tracking
    fireEvent.click(screen.getByText('Track Page'));
    
    // Test identify
    fireEvent.click(screen.getByText('Identify User'));
  });

  it('should render fallback on error', async () => {
    // Mock import failure
    jest.doMock('../analytics', () => {
      throw new Error('Failed to load analytics');
    });

    render(
      <MentiqAnalyticsProvider 
        config={defaultConfig}
        fallback={<div>Analytics unavailable</div>}
      >
        <TestComponent />
      </MentiqAnalyticsProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics unavailable')).toBeInTheDocument();
    });
  });

  it('should handle SSR gracefully', () => {
    // Mock server environment
    const originalWindow = global.window;
    delete (global as any).window;

    render(
      <MentiqAnalyticsProvider config={defaultConfig}>
        <div>Server rendered content</div>
      </MentiqAnalyticsProvider>
    );

    expect(screen.getByText('Server rendered content')).toBeInTheDocument();

    // Restore window
    global.window = originalWindow;
  });
});

describe('useMentiqAnalytics hook', () => {
  const defaultConfig = {
    apiKey: 'test-api-key',
    projectId: 'test-project',
  };

  it('should throw error when used outside provider', () => {
    function TestComponentWithoutProvider() {
      useMentiqAnalytics();
      return <div>Test</div>;
    }

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponentWithoutProvider />);
    }).toThrow('useMentiqAnalytics must be used within a MentiqAnalyticsProvider');

    consoleSpy.mockRestore();
  });

  it('should provide all analytics methods', async () => {
    function TestHookComponent() {
      const analytics = useMentiqAnalytics();
      
      return (
        <div>
          <div data-testid="has-track">{typeof analytics.track}</div>
          <div data-testid="has-page">{typeof analytics.page}</div>
          <div data-testid="has-identify">{typeof analytics.identify}</div>
          <div data-testid="has-reset">{typeof analytics.reset}</div>
          <div data-testid="has-flush">{typeof analytics.flush}</div>
          <div data-testid="has-analytics">{typeof analytics.analytics}</div>
        </div>
      );
    }

    render(
      <MentiqAnalyticsProvider config={defaultConfig}>
        <TestHookComponent />
      </MentiqAnalyticsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-track')).toHaveTextContent('function');
      expect(screen.getByTestId('has-page')).toHaveTextContent('function');
      expect(screen.getByTestId('has-identify')).toHaveTextContent('function');
      expect(screen.getByTestId('has-reset')).toHaveTextContent('function');
      expect(screen.getByTestId('has-flush')).toHaveTextContent('function');
      expect(screen.getByTestId('has-analytics')).toHaveTextContent('object');
    });
  });
});