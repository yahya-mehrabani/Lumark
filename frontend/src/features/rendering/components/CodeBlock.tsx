import React, { useEffect, useState, useRef } from 'react';
import { highlightCode } from '../shiki-highlighter';
import { copyToClipboard } from '../clipboard';
import { Icon } from '../../../components/Icon';

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
      dir="ltr"
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
              <Icon name="check" size={13} strokeWidth={2.4} className="copy-icon" />
              <span className="copy-button-label">Copied!</span>
            </>
          ) : copyStatus === 'error' ? (
            <>
              <Icon name="close" size={13} strokeWidth={2.4} className="copy-icon copy-icon-error" />
              <span className="copy-button-label">Failed</span>
            </>
          ) : (
            <>
              <Icon name="copy" size={13} strokeWidth={2} className="copy-icon" />
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
          dir="ltr"
        >
          {highlightedHtml ? (
            <div
              className="shiki-wrapper"
              data-testid="shiki-wrapper"
              dir="ltr"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <pre className="shiki-fallback" data-testid="shiki-fallback" dir="ltr">
              <code dir="ltr">{rawCode}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeBlock;
