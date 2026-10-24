import React, { useEffect, useState, useRef } from 'react';
import { highlightCode } from '../shiki-highlighter';
import { copyToClipboard } from '../clipboard';

export interface CodeBlockProps {
  rawCode: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
  onCopySuccess?: (copiedText: string) => void;
  onCopyError?: (err: Error) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  rawCode,
  language,
  className = '',
  showLineNumbers = true,
  onCopySuccess,
  onCopyError,
}) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isCancelled = false;

    highlightCode(rawCode, language)
      .then((res) => {
        if (!isCancelled) {
          setHighlightedHtml(res.html);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Failed to highlight code:', err);
          setHighlightedHtml(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [rawCode, language]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await copyToClipboard(rawCode);
      setCopyStatus('copied');
      if (onCopySuccess) {
        onCopySuccess(rawCode);
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    } catch (err) {
      setCopyStatus('error');
      const error = err instanceof Error ? err : new Error(String(err));
      if (onCopyError) {
        onCopyError(error);
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    }
  };

  const displayLanguage = language ? language.toUpperCase() : 'TEXT';

  // Compute lines for line numbers
  const normalizedLines = rawCode.endsWith('\n') ? rawCode.slice(0, -1) : rawCode;
  const lineCount = normalizedLines.split('\n').length;

  return (
    <div
      className={`code-block-container ${className}`.trim()}
      data-testid="code-block-container"
      data-language={language || 'text'}
    >
      <div className="code-block-header" data-testid="code-block-header">
        <span className="code-language-badge" data-testid="code-language-badge">
          {displayLanguage}
        </span>
        <button
          type="button"
          className={`code-copy-button ${copyStatus === 'copied' ? 'copied' : copyStatus === 'error' ? 'error' : ''}`}
          aria-label={
            copyStatus === 'copied'
              ? 'Copied to clipboard'
              : copyStatus === 'error'
              ? 'Failed to copy code'
              : 'Copy code to clipboard'
          }
          data-testid="copy-code-button"
          onClick={handleCopy}
        >
          {copyStatus === 'copied' ? (
            <>
              <svg
                className="copy-icon"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
              <span className="copy-button-label">Copied!</span>
            </>
          ) : copyStatus === 'error' ? (
            <>
              <svg
                className="copy-icon copy-icon-error"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM4.72 4.72a.75.75 0 0 1 1.06 0L8 6.94l2.22-2.22a.75.75 0 1 1 1.06 1.06L9.06 8l2.22 2.22a.75.75 0 1 1-1.06 1.06L8 9.06l-2.22 2.22a.75.75 0 0 1-1.06-1.06L6.94 8 4.72 5.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
              <span className="copy-button-label">Failed</span>
            </>
          ) : (
            <>
              <svg
                className="copy-icon"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
                <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
              </svg>
              <span className="copy-button-label">Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="code-block-body" data-testid="code-block-body">
        {showLineNumbers && (
          <div
            className="code-line-numbers"
            aria-hidden="true"
            data-testid="code-line-numbers"
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i + 1} className="line-number" data-line={i + 1}>
                {i + 1}
              </span>
            ))}
          </div>
        )}

        <div
          className="code-scroll-container"
          data-testid="code-scroll-container"
          tabIndex={0}
          role="region"
          aria-label={`Code content (${displayLanguage})`}
          style={{ overflowX: 'auto' }}
        >
          {highlightedHtml ? (
            <div
              className="shiki-wrapper"
              data-testid="shiki-wrapper"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="shiki-fallback" data-testid="shiki-fallback">
              <code>{rawCode}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeBlock;
