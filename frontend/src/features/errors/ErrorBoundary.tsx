import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundaryProps, ErrorBoundaryState } from './types';
import './errors.css';

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught rendering fault:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  public resetError = (): void => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
    });
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({
          error: this.state.error,
          resetError: this.resetError,
          tabId: this.props.tabId,
          tabTitle: this.props.tabTitle,
          onCloseTab: this.props.onCloseTab,
          onReloadTab: this.props.onReloadTab,
        });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default accessible error card (WCAG AA compliant)
      const tabLabel = this.props.tabTitle ? ` "${this.props.tabTitle}"` : '';
      const displayMessage = this.state.error?.message || 'An unexpected rendering error occurred.';

      return (
        <div
          className="error-fallback-card"
          role="alert"
          aria-live="assertive"
          data-testid="error-boundary-fallback"
        >
          <svg
            className="error-fallback-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>

          <h2 className="error-fallback-title">
            Document Rendering Error
          </h2>

          <p className="error-fallback-message">
            Unable to render document{tabLabel}. Other open tabs and navigation tools remain fully functional.
          </p>

          <div className="error-fallback-details" data-testid="error-message">
            {displayMessage}
          </div>

          <div className="error-fallback-actions">
            <button
              type="button"
              className="error-btn error-btn-primary"
              onClick={this.resetError}
              aria-label="Try reloading this document"
            >
              Try Again
            </button>
            {this.props.onCloseTab && (
              <button
                type="button"
                className="error-btn error-btn-secondary"
                onClick={this.props.onCloseTab}
                aria-label="Close this tab"
              >
                Close Tab
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
