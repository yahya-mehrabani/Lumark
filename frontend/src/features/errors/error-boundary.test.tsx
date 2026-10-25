import { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { TabErrorBoundary } from './TabErrorBoundary';
import { TabStore } from '../tabs/tabStore';
import { AppShell } from '../shell/AppShell';

// Component that conditionally throws to simulate plugin / rendering crashes
function ProblematicComponent({ shouldThrow, message }: { shouldThrow: boolean; message?: string }) {
  if (shouldThrow) {
    throw new Error(message || 'Simulated plugin syntax error');
  }
  return <div data-testid="valid-content">Document rendered successfully</div>;
}

// Wrapper component allowing dynamic error recovery simulation
function RecoverableWrapper() {
  const [hasError, setHasError] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setHasError(false)}>
        Fix Issue
      </button>
      <ErrorBoundary onReset={() => setHasError(false)}>
        <ProblematicComponent shouldThrow={hasError} message="Corrupt input" />
      </ErrorBoundary>
    </div>
  );
}

describe('ErrorBoundary', () => {
  // Suppress console.error in tests for expected thrown errors
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Normal Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('catches rendering errors and displays accessible fallback UI', () => {
    render(
      <ErrorBoundary tabTitle="report.md">
        <ProblematicComponent shouldThrow={true} message="Custom plugin syntax error" />
      </ErrorBoundary>
    );

    const fallback = screen.getByTestId('error-boundary-fallback');
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveAttribute('role', 'alert');
    expect(fallback).toHaveAttribute('aria-live', 'assertive');

    expect(screen.getByText('Document Rendering Error')).toBeInTheDocument();
    expect(
      screen.getByText(/Unable to render document "report\.md"\. Other open tabs and navigation tools remain fully functional\./)
    ).toBeInTheDocument();

    const errorDetails = screen.getByTestId('error-message');
    expect(errorDetails).toHaveTextContent('Custom plugin syntax error');
  });

  it('calls onError callback with error details when crash occurs', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ProblematicComponent shouldThrow={true} message="Test error" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.anything()
    );
  });

  it('resets error state when Try Again is clicked and condition is resolved', () => {
    render(<RecoverableWrapper />);

    // Initially crashed
    expect(screen.getByText('Document Rendering Error')).toBeInTheDocument();

    // Click Fix Issue, then Try Again
    fireEvent.click(screen.getByText('Fix Issue'));
    fireEvent.click(screen.getByRole('button', { name: /Try reloading this document/i }));

    // Now rendered successfully
    expect(screen.getByTestId('valid-content')).toBeInTheDocument();
    expect(screen.queryByText('Document Rendering Error')).not.toBeInTheDocument();
  });

  it('invokes onCloseTab when Close Tab button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TabErrorBoundary tabId="tab-1" tabTitle="broken.md" onCloseTab={onClose}>
        <ProblematicComponent shouldThrow={true} />
      </TabErrorBoundary>
    );

    const closeBtn = screen.getByRole('button', { name: /Close this tab/i });
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports custom fallback render function', () => {
    render(
      <ErrorBoundary
        fallback={({ error, resetError }) => (
          <div data-testid="custom-fallback">
            <span>Custom: {error?.message}</span>
            <button onClick={resetError}>Retry</button>
          </div>
        )}
      >
        <ProblematicComponent shouldThrow={true} message="Custom fallback test" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom: Custom fallback test')).toBeInTheDocument();
  });

  it('isolates tab crashes in AppShell so adjacent tabs remain fully functional', () => {
    const store = new TabStore();
    const tab1 = store.openTab({
      filePath: '/path/broken.md',
      filename: 'broken.md',
      content: 'broken content',
    });
    const tab2 = store.openTab({
      filePath: '/path/working.md',
      filename: 'working.md',
      content: '# Working Document Header',
    });

    // Make tab 1 active
    store.switchTab(tab1.id);

    const { rerender } = render(
      <AppShell
        store={store}
        renderDocument={(tab) => {
          if (tab.id === tab1.id) {
            throw new Error('Plugin crash in tab 1');
          }
          return <div data-testid="tab2-content">Tab 2 Content OK: {tab.content}</div>;
        }}
      />
    );

    // Tab 1 is crashed and shows fallback
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Plugin crash in tab 1')).toBeInTheDocument();

    // Now switch to Tab 2
    store.switchTab(tab2.id);

    rerender(
      <AppShell
        store={store}
        renderDocument={(tab) => {
          if (tab.id === tab1.id) {
            throw new Error('Plugin crash in tab 1');
          }
          return <div data-testid="tab2-content">Tab 2 Content OK: {tab.content}</div>;
        }}
      />
    );

    // Tab 2 renders without errors
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
    expect(screen.getByTestId('tab2-content')).toBeInTheDocument();
    expect(screen.getByText('Tab 2 Content OK: # Working Document Header')).toBeInTheDocument();
  });
});
