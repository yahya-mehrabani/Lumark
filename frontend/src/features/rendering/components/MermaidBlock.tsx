import React, { useEffect, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import { renderMermaid, detectAppTheme, type MermaidTheme } from '../mermaid-adapter';

export interface MermaidBlockProps {
  rawCode: string;
  className?: string;
  theme?: MermaidTheme;
  onError?: (err: Error) => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackRawCode: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Localized Error Boundary for Mermaid blocks.
 * Catches any unhandled React or DOM exceptions during diagram mounting,
 * preventing document-wide crashes per FR-RENDER-009.
 */
export class MermaidErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'Unknown diagram rendering error' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Mermaid rendering caught by localized ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <MermaidErrorCard
          errorMessage={this.state.errorMessage}
          rawCode={this.props.fallbackRawCode}
        />
      );
    }
    return this.props.children;
  }
}

interface MermaidErrorCardProps {
  errorMessage: string;
  rawCode: string;
}

export const MermaidErrorCard: React.FC<MermaidErrorCardProps> = ({ errorMessage, rawCode }) => {
  return (
    <div
      className="mermaid-error-card"
      role="alert"
      data-testid="mermaid-error-card"
      dir="ltr"
    >
      <div className="mermaid-error-header" data-testid="mermaid-error-header">
        <svg
          className="mermaid-error-icon"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
        </svg>
        <span className="mermaid-error-title" data-testid="mermaid-error-title">
          Mermaid Syntax Error
        </span>
      </div>
      <p className="mermaid-error-message" data-testid="mermaid-error-message">
        {errorMessage}
      </p>
      <div className="mermaid-raw-source-container" data-testid="mermaid-raw-source-container">
        <span className="mermaid-raw-source-label">Raw Diagram Source:</span>
        <pre className="mermaid-raw-source" data-testid="mermaid-raw-source">
          <code>{rawCode}</code>
        </pre>
      </div>
    </div>
  );
};

export const MermaidBlockInner: React.FC<MermaidBlockProps> = ({
  rawCode,
  className = '',
  theme,
  onError,
}) => {
  const [activeTheme, setActiveTheme] = useState<MermaidTheme>(
    theme || (detectAppTheme() as MermaidTheme)
  );
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; rawCode: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize theme with application theme changes
  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
      return;
    }

    const updateTheme = () => {
      setActiveTheme(detectAppTheme() as MermaidTheme);
    };

    updateTheme();

    if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(() => {
        updateTheme();
      });

      if (document.documentElement) {
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
      }
      if (document.body) {
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ['class'],
        });
      }

      return () => {
        observer.disconnect();
      };
    }
  }, [theme]);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    renderMermaid(rawCode, { theme: activeTheme })
      .then((res) => {
        if (!isCancelled) {
          setSvgHtml(res.svg);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : String(err);
          setError({ message, rawCode });
          setSvgHtml(null);
          setIsLoading(false);
          if (onError) {
            onError(err instanceof Error ? err : new Error(message));
          }
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [rawCode, activeTheme, onError]);

  if (error) {
    return <MermaidErrorCard errorMessage={error.message} rawCode={error.rawCode} />;
  }

  if (isLoading && !svgHtml) {
    return (
      <div
        className={`mermaid-container loading ${className}`.trim()}
        data-testid="mermaid-loading"
        data-mermaid-theme={activeTheme}
        dir="ltr"
        role="region"
        aria-label="Loading diagram"
      >
        <span className="mermaid-loading-indicator">Rendering diagram...</span>
      </div>
    );
  }

  return (
    <div
      className={`mermaid-container ${className}`.trim()}
      data-testid="mermaid-container"
      data-mermaid-theme={activeTheme}
      dir="ltr"
      role="region"
      tabIndex={0}
      aria-label="Mermaid diagram"
      style={{ overflowX: 'auto', maxWidth: '100%' }}
    >
      <div
        className="mermaid-svg-wrapper"
        data-testid="mermaid-svg-wrapper"
        dangerouslySetInnerHTML={{ __html: svgHtml || '' }}
      />
    </div>
  );
};

export const MermaidBlock: React.FC<MermaidBlockProps> = (props) => {
  return (
    <MermaidErrorBoundary fallbackRawCode={props.rawCode}>
      <MermaidBlockInner {...props} />
    </MermaidErrorBoundary>
  );
};

export default MermaidBlock;
