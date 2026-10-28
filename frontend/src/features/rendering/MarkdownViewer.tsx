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
import { Icon } from '../../components/Icon';
import { useZoom } from '../viewport/zoomController';
import { useSelectionCopy } from '../viewport/selectionCopy';
import { usePrint, triggerPrint } from '../viewport/printController';
import { copyToClipboard } from './clipboard';
import { truncateMiddlePath } from './utils/pathTruncate';
import { useSettings } from '../preferences';
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
          className="markdown-content document-wrapper markdown-body"
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

  const { settings } = useSettings();
  const isDocument = Boolean(document);
  const globalTocDefault = isDocument
    ? settings.showTableOfContents ?? settings.showToc ?? true
    : false;

  const tocData = useTableOfContents({ markdown: rawMarkdown });
  const initialTocOpen = showToc !== undefined ? showToc : globalTocDefault;

  const tocToggle = useTocToggle({
    initialOpen: initialTocOpen,
    hasHeadings: tocData.hasHeadings,
    onToggle: () => onToggleToc?.(),
  });

  // When global setting changes in preferences, update TOC visibility
  const prevGlobalSettingRef = React.useRef(globalTocDefault);
  React.useEffect(() => {
    if (prevGlobalSettingRef.current !== globalTocDefault) {
      prevGlobalSettingRef.current = globalTocDefault;
      if (showToc === undefined) {
        tocToggle.setIsOpen(globalTocDefault);
      }
    }
  }, [globalTocDefault, showToc, tocToggle]);

  // When controlled showToc prop changes, synchronize
  React.useEffect(() => {
    if (showToc !== undefined) {
      tocToggle.setIsOpen(showToc);
    }
  }, [showToc, tocToggle]);

  // When document changes (new document mounted), initialize per-document TOC state to global default
  const prevDocRef = React.useRef<string | undefined>(filePath);
  React.useEffect(() => {
    if (filePath !== prevDocRef.current) {
      prevDocRef.current = filePath;
      if (showToc === undefined) {
        tocToggle.setIsOpen(globalTocDefault);
      }
    }
  }, [filePath, globalTocDefault, showToc, tocToggle]);

  const isTocOpen =
    showToc !== undefined
      ? showToc && tocData.hasHeadings
      : tocToggle.isOpen && tocData.hasHeadings;

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

  const { zoom, zoomFactor, zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut } = useZoom({ enableShortcuts: true });
  usePrint({ enableShortcuts: true });

  const [isFocusMode, setIsFocusMode] = React.useState<boolean>(() => {
    return typeof window !== 'undefined' && window.document.body.classList.contains('focus-mode');
  });

  React.useEffect(() => {
    const handleFocusChange = () => {
      setIsFocusMode(typeof window !== 'undefined' && window.document.body.classList.contains('focus-mode'));
    };
    window.addEventListener('focus-mode-change', handleFocusChange);
    return () => window.removeEventListener('focus-mode-change', handleFocusChange);
  }, []);

  const toggleFocusMode = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      const active = window.document.body.classList.toggle('focus-mode');
      setIsFocusMode(active);
      window.dispatchEvent(new CustomEvent('focus-mode-change'));
    }
  }, []);

  const repoName = React.useMemo(() => {
    if (!filePath) return '';
    const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return '';
  }, [filePath]);

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
        <div className="floating-toolbar-container" data-testid="document-header">
          <div className="floating-pill" role="toolbar" aria-label="Document controls">
            <div
              className="pill-breadcrumb"
              title={copiedPath ? 'Copied path to clipboard!' : (filePath ? `${filePath} (Click to copy)` : (filename || 'Document'))}
              data-testid="doc-path-badge"
              onClick={handleCopyPath}
              style={{ cursor: filePath ? 'pointer' : 'default' }}
            >
              <Icon name="file" size={15} strokeWidth={1.8} />
              {repoName && (
                <>
                  <span className="repo-name">{repoName}</span>
                  <span className="slash">/</span>
                </>
              )}
              <h1 className="file-name doc-filename" id="pillFileName">
                {filename || 'Untitled Document'}
              </h1>
              {filePath && (
                <span
                  className="path-text"
                  data-testid="doc-path-text"
                  title={truncateMiddlePath(filePath)}
                  style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    borderWidth: 0,
                  }}
                >
                  {filePath}
                </span>
              )}
            </div>

            <div className="pill-divider" />

            <div
              className="zoom-controls doc-zoom-controls"
              data-testid="doc-zoom-controls"
              role="group"
              aria-label="Zoom controls"
            >
              <button
                type="button"
                className="pill-icon-btn doc-zoom-btn"
                id="zoomOutBtn"
                onClick={zoomOut}
                disabled={!canZoomOut}
                aria-label="Zoom out (Ctrl+-)"
                title="Zoom Out (Ctrl+-)"
                data-testid="doc-zoom-out"
              >
                <Icon name="minus" size={14} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="zoom-readout doc-zoom-display-btn"
                id="zoomReadout"
                onClick={resetZoom}
                aria-label={`Current zoom ${zoom}%. Click to reset (Ctrl+0)`}
                title="Reset zoom to 100% (Ctrl+0)"
                data-testid="doc-zoom-reset"
              >
                {zoom}%
              </button>
              <button
                type="button"
                className="pill-icon-btn doc-zoom-btn"
                id="zoomInBtn"
                onClick={zoomIn}
                disabled={!canZoomIn}
                aria-label="Zoom in (Ctrl+=)"
                title="Zoom In (Ctrl++)"
                data-testid="doc-zoom-in"
              >
                <Icon name="plus" size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="pill-divider" />

            <button
              type="button"
              className={`pill-icon-btn doc-search-toggle-btn ${search.isOpen ? 'active' : ''}`}
              id="findToggleBtn"
              onClick={() => (search.isOpen ? search.closeSearch() : search.openSearch())}
              aria-label="Find in Document (Ctrl+F)"
              title="Find in Document (Ctrl+F)"
              aria-expanded={search.isOpen}
              data-testid="doc-search-toggle"
            >
              <Icon name="search" size={14} strokeWidth={1.9} />
            </button>

            <button
              type="button"
              className="pill-icon-btn doc-print-btn"
              onClick={() => (onPrint ? onPrint() : triggerPrint())}
              aria-label="Print Document (Ctrl+P)"
              title="Print Document (Ctrl+P)"
              data-testid="doc-print-btn"
            >
              <Icon name="printer" size={14} strokeWidth={1.9} />
              <span
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  borderWidth: 0,
                }}
              >
                Print
              </span>
            </button>

            <button
              type="button"
              className={`pill-icon-btn doc-toc-toggle-btn ${isTocOpen ? 'active' : ''}`}
              id="outlineToggleBtn"
              onClick={tocToggle.toggle}
              disabled={!tocData.hasHeadings}
              aria-label="Toggle Outline Scrollspy (Ctrl+Shift+O)"
              title={
                tocData.hasHeadings
                  ? 'Toggle Outline Scrollspy (Ctrl+Shift+O)'
                  : 'No headings in document'
              }
              aria-expanded={isTocOpen}
              data-testid="doc-toc-toggle"
            >
              <Icon name="outline" size={14} strokeWidth={1.9} />
            </button>

            <button
              type="button"
              className={`pill-icon-btn ${isFocusMode ? 'active' : ''}`}
              id="focusModeBtn"
              onClick={toggleFocusMode}
              title="Enter Focus Mode (Distraction-Free)"
              aria-label="Enter Focus Mode"
              data-testid="doc-focus-toggle"
            >
              <Icon name="focus" size={14} strokeWidth={1.9} />
            </button>
          </div>

          <SearchBar
            className={isTocOpen ? 'has-toc-open' : ''}
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
        </div>
      )}

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
      </div>

      {isTocOpen && (
        <TableOfContents
          items={tocData.items}
          tree={tocData.tree}
          isOpen={isTocOpen}
          onClose={tocToggle.close}
          onSelectHeading={onNavigateAnchor}
          containerRef={contentRef}
          zoomFactor={zoomFactor}
        />
      )}
    </div>
  );
};

export default MarkdownViewer;
