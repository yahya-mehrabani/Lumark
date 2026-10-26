import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { SANITY_HTML_SCHEMA } from './security/htmlSanitizer';
import { rehypeScopedCss } from './security/cssSanitizer';
import { rehypeAutoDirection } from '../direction/autoDirectionPlugin';
import {
  useDirectionPreference,
  type DirectionPreference,
} from '../direction/autoDirection';
import { remarkStrictMath, escapeCurrencyDollars } from './utils/remark-strict-math';
import { STRICT_KATEX_OPTIONS } from './katex-adapter';
import { CodeBlock } from './components/CodeBlock';
import { Heading } from './components/Heading';
import { MarkdownImage } from './components/MarkdownImage';
import { MarkdownLink } from './components/MarkdownLink';
import { MermaidBlock } from './components/MermaidBlock';
import { SlugTracker, SlugContext } from './utils/slugify';
import { TableOfContents } from '../navigation/TableOfContents';
import { useTableOfContents } from '../navigation/useTableOfContents';
import { useTocToggle } from '../navigation/useTocToggle';
import { SearchBar } from '../navigation/SearchBar';
import { useSearch } from '../navigation/useSearch';
import { useTheme } from '../viewport/themeStore';
import { useZoom } from '../viewport/zoomController';
import { useSelectionCopy } from '../viewport/selectionCopy';
import { usePrint, triggerPrint } from '../viewport/printController';
import { copyToClipboard } from './clipboard';
import { truncateMiddlePath } from './utils/pathTruncate';
import '../../styles/katex.css';
import './markdown.css';

export interface DocumentInfo {
  filePath?: string;
  filename?: string;
  dir?: string;
  content: string;
}

export interface MarkdownViewerProps {
  document?: DocumentInfo;
  content?: string;
  className?: string;
  directionPreference?: DirectionPreference;
  onOpenDocument?: (filePath: string, anchor?: string) => void;
  onOpenExternalUrl?: (url: string) => Promise<void> | void;
  onNavigateAnchor?: (anchor: string) => void;
  showToc?: boolean;
  onToggleToc?: () => void;
  onPrint?: () => void;
}

interface MarkdownContentBodyProps {
  content: string;
  slugTracker: SlugTracker;
  activePref: DirectionPreference;
  docDir?: string;
  onOpenDocument?: (filePath: string, anchor?: string) => void;
  onOpenExternalUrl?: (url: string) => Promise<void> | void;
  onNavigateAnchor?: (anchor: string) => void;
}

const MarkdownContentBody = React.memo(
  React.forwardRef<HTMLElement, MarkdownContentBodyProps>(
    (
      {
        content,
        slugTracker,
        activePref,
        docDir,
        onOpenDocument,
        onOpenExternalUrl,
        onNavigateAnchor,
      },
      ref
    ) => {
      return (
        <main
          ref={ref}
          className="markdown-content"
          data-testid="markdown-content"
          tabIndex={0}
          dir={activePref !== 'auto' ? activePref : undefined}
          style={{
            ['--default-contextmenu' as string]: 'show',
            outline: 'none',
          }}
        >
          <SlugContext.Provider value={slugTracker}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath, remarkStrictMath]}
              rehypePlugins={[
                rehypeRaw,
                [rehypeSanitize, SANITY_HTML_SCHEMA],
                rehypeScopedCss,
                [rehypeKatex, STRICT_KATEX_OPTIONS],
                [rehypeAutoDirection, { userPreference: activePref }],
              ]}
              urlTransform={(url) => url}
              components={{
                h1: ({ node, ...props }) => <Heading level={1} {...props} />,
                h2: ({ node, ...props }) => <Heading level={2} {...props} />,
                h3: ({ node, ...props }) => <Heading level={3} {...props} />,
                h4: ({ node, ...props }) => <Heading level={4} {...props} />,
                h5: ({ node, ...props }) => <Heading level={5} {...props} />,
                h6: ({ node, ...props }) => <Heading level={6} {...props} />,
                code: ({ node, ...props }) => <code dir="ltr" {...props} />,
                style: ({ node, children, ...props }) => {
                  const cssText =
                    typeof children === 'string'
                      ? children
                      : Array.isArray(children)
                        ? children.join('')
                        : String(children ?? '');
                  return <style dangerouslySetInnerHTML={{ __html: cssText }} {...props} />;
                },
                table: ({ node, ...props }) => (
                  <div className="table-wrapper" role="region" tabIndex={0} aria-label="Table">
                    <table {...props} />
                  </div>
                ),
                img: ({ node, ...props }) => <MarkdownImage docDir={docDir} {...props} />,
                a: ({ node, ...props }) => (
                  <MarkdownLink
                    docDir={docDir}
                    onOpenMarkdown={onOpenDocument}
                    onOpenExternal={onOpenExternalUrl}
                    onNavigateAnchor={onNavigateAnchor}
                    {...props}
                  />
                ),
                pre: ({ children, node, ...props }) => {
                  if (React.isValidElement(children)) {
                    const codeProps = children.props as { className?: string; children?: React.ReactNode };
                    const rawCode =
                      typeof codeProps.children === 'string'
                        ? codeProps.children
                        : String(codeProps.children ?? '');
                    const match = /language-([a-zA-Z0-9_+-]+)/.exec(codeProps.className || '');
                    const language = match ? match[1] : undefined;
                    if (language?.toLowerCase() === 'mermaid') {
                      return <MermaidBlock rawCode={rawCode} />;
                    }
                    return <CodeBlock rawCode={rawCode} language={language} />;
                  }
                  return (
                    <pre dir="ltr" {...props}>
                      {children}
                    </pre>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </SlugContext.Provider>
        </main>
      );
    }
  )
);
MarkdownContentBody.displayName = 'MarkdownContentBody';

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  document,
  content: rawContent,
  className = '',
  directionPreference,
  onOpenDocument,
  onOpenExternalUrl,
  onNavigateAnchor,
  showToc,
  onToggleToc,
  onPrint,
}) => {
  const [hookPref] = useDirectionPreference();
  const activePref = directionPreference ?? hookPref;

  const rawMarkdown = document ? document.content : (rawContent ?? '');
  const content = React.useMemo(() => escapeCurrencyDollars(rawMarkdown), [rawMarkdown]);
  const filename = document?.filename;
  const filePath = document?.filePath;

  const tocData = useTableOfContents({ markdown: rawMarkdown });
  const tocToggle = useTocToggle({
    initialOpen: showToc ?? false,
    hasHeadings: tocData.hasHeadings,
    onToggle: () => onToggleToc?.(),
  });

  const isTocOpen = showToc !== undefined ? (showToc && tocData.hasHeadings) : tocToggle.isOpen;

  const contentRef = React.useRef<HTMLElement | null>(null);
  const search = useSearch({ containerRef: contentRef });
  useSelectionCopy({ containerRef: contentRef });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        search.openSearch();
      } else if (e.key === 'F3' && search.isOpen) {
        e.preventDefault();
        if (e.shiftKey) {
          search.prevMatch();
        } else {
          search.nextMatch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search]);

  const { theme, toggleTheme } = useTheme();
  const { zoom, zoomFactor, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut } = useZoom({ enableShortcuts: true });
  usePrint({ enableShortcuts: true });

  const [copiedPath, setCopiedPath] = React.useState(false);
  const copyPathTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!filePath) return;
    try {
      await copyToClipboard(filePath);
      setCopiedPath(true);
      clearTimeout(copyPathTimerRef.current);
      copyPathTimerRef.current = setTimeout(() => {
        setCopiedPath(false);
      }, 2000);
    } catch (err) {
      console.warn('Failed to copy file path:', err);
    }
  };

  const slugTracker = React.useMemo(() => new SlugTracker(), [content]);

  return (
    <div className={`markdown-viewport ${className}`.trim()} data-testid="markdown-viewport">
      {(filename || filePath) && (
        <header className="document-header-bar app-chrome" data-testid="document-header">
          <div className="doc-title-group">
            <span className="doc-type-badge">MARKDOWN</span>
            <h1 className="doc-filename">{filename || 'Untitled Document'}</h1>
          </div>
          <div className="doc-header-right">
            {filePath && (
              <div className="doc-path-badge" title={filePath} data-testid="doc-path-badge">
                <span className="path-label">PATH:</span>
                <span className="path-text" title={filePath}>{truncateMiddlePath(filePath)}</span>
                <button
                  type="button"
                  className="doc-copy-path-btn"
                  onClick={handleCopyPath}
                  aria-label={copiedPath ? 'Path copied to clipboard' : 'Copy file path to clipboard'}
                  title={copiedPath ? 'Copied!' : 'Copy full path to clipboard'}
                  data-testid="doc-copy-path-btn"
                >
                  {copiedPath ? (
                    <svg className="copy-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="copy-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            )}
            <div className="doc-zoom-controls" data-testid="doc-zoom-controls" role="group" aria-label="Zoom controls">
              <button
                type="button"
                className="doc-zoom-btn"
                onClick={zoomOut}
                disabled={!canZoomOut}
                aria-label="Zoom out (Ctrl+-)"
                title="Zoom out (Ctrl+-)"
                data-testid="doc-zoom-out"
              >
                -
              </button>
              <button
                type="button"
                className="doc-zoom-display-btn"
                onClick={resetZoom}
                aria-label={`Current zoom ${zoom}%. Click to reset (Ctrl+0)`}
                title="Reset zoom to 100% (Ctrl+0)"
                data-testid="doc-zoom-reset"
              >
                {zoom}%
              </button>
              <button
                type="button"
                className="doc-zoom-btn"
                onClick={zoomIn}
                disabled={!canZoomIn}
                aria-label="Zoom in (Ctrl+=)"
                title="Zoom in (Ctrl+=)"
                data-testid="doc-zoom-in"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="doc-theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Theme: ${theme === 'system' ? 'Auto (System)' : theme === 'dark' ? 'Dark' : 'Light'}. Click to toggle.`}
              title={`Theme: ${theme === 'system' ? 'Auto (System)' : theme === 'dark' ? 'Dark' : 'Light'} (Click to toggle)`}
              data-testid="doc-theme-toggle"
              data-theme-mode={theme}
            >
              {theme === 'dark' ? (
                <svg className="theme-btn-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : theme === 'light' ? (
                <svg className="theme-btn-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="theme-btn-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              )}
              <span className="theme-btn-label">{theme === 'system' ? 'Auto' : theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
            <button
              type="button"
              className="doc-print-btn"
              onClick={() => (onPrint ? onPrint() : triggerPrint())}
              aria-label="Print document (Ctrl+P)"
              title="Print document (Ctrl+P)"
              data-testid="doc-print-btn"
            >
              Print
            </button>
            <button
              type="button"
              className={`doc-search-toggle-btn ${search.isOpen ? 'active' : ''}`}
              onClick={() => (search.isOpen ? search.closeSearch() : search.openSearch())}
              aria-label="Find in document (Ctrl+F)"
              title="Find in document (Ctrl+F)"
              aria-expanded={search.isOpen}
              data-testid="doc-search-toggle"
            >
              Find
            </button>
            <button
              type="button"
              className={`doc-toc-toggle-btn ${isTocOpen ? 'active' : ''}`}
              onClick={tocToggle.toggle}
              disabled={!tocData.hasHeadings}
              aria-label="Table of Contents (Ctrl+Shift+O)"
              title={
                tocData.hasHeadings
                  ? 'Table of Contents (Ctrl+Shift+O)'
                  : 'No headings in document'
              }
              aria-expanded={isTocOpen}
              data-testid="doc-toc-toggle"
            >
              Outline
            </button>
          </div>
        </header>
      )}

      <SearchBar
        isOpen={search.isOpen}
        query={search.query}
        onQueryChange={search.setQuery}
        currentIndex={search.currentIndex}
        totalMatches={search.totalMatches}
        onNext={search.nextMatch}
        onPrevious={search.prevMatch}
        onClose={search.closeSearch}
        caseSensitive={search.caseSensitive}
        onToggleCaseSensitive={search.toggleCaseSensitive}
      />

      <div
        className="markdown-viewport-body"
        data-testid="markdown-viewport-body"
        style={{ zoom: zoomFactor }}
      >
        <MarkdownContentBody
          ref={contentRef}
          content={content}
          slugTracker={slugTracker}
          activePref={activePref}
          docDir={document?.dir}
          onOpenDocument={onOpenDocument}
          onOpenExternalUrl={onOpenExternalUrl}
          onNavigateAnchor={onNavigateAnchor}
        />

        {isTocOpen && (
          <TableOfContents
            items={tocData.items}
            tree={tocData.tree}
            isOpen={isTocOpen}
            onClose={tocToggle.close}
            onSelectHeading={onNavigateAnchor}
            containerRef={contentRef}
          />
        )}
      </div>
    </div>
  );
};

export default MarkdownViewer;
