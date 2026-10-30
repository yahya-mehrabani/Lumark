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
  detectFirstStrongDirection,
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
import { usePrint } from '../viewport/printController';
import { ReadingScrollbar } from '../viewport/ReadingScrollbar';
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

interface MarkdownDocContextValue {
  docDir?: string;
  onOpenDocument?: (filePath: string, anchor?: string) => void;
  onOpenExternalUrl?: (url: string) => Promise<void> | void;
  onNavigateAnchor?: (anchor: string) => void;
}

const MarkdownDocContext = React.createContext<MarkdownDocContextValue>({});

const MarkdownH1 = (props: React.ComponentProps<'h1'>) => <Heading level={1} {...props} />;
const MarkdownH2 = (props: React.ComponentProps<'h2'>) => <Heading level={2} {...props} />;
const MarkdownH3 = (props: React.ComponentProps<'h3'>) => <Heading level={3} {...props} />;
const MarkdownH4 = (props: React.ComponentProps<'h4'>) => <Heading level={4} {...props} />;
const MarkdownH5 = (props: React.ComponentProps<'h5'>) => <Heading level={5} {...props} />;
const MarkdownH6 = (props: React.ComponentProps<'h6'>) => <Heading level={6} {...props} />;
const MarkdownCode = (props: React.ComponentProps<'code'>) => <code dir="ltr" {...props} />;
const MarkdownStyle = ({ children, ...props }: React.ComponentProps<'style'>) => {
  const cssText =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
        ? children.join('')
        : String(children ?? '');
  return <style dangerouslySetInnerHTML={{ __html: cssText }} {...props} />;
};
const MarkdownTable = (props: React.ComponentProps<'table'>) => (
  <div className="table-wrapper" role="region" tabIndex={0} aria-label="Table">
    <table {...props} />
  </div>
);
const MarkdownImg = (props: any) => {
  const { docDir } = React.useContext(MarkdownDocContext);
  return <MarkdownImage docDir={docDir} {...props} />;
};
const MarkdownA = (props: any) => {
  const { docDir, onOpenDocument, onOpenExternalUrl, onNavigateAnchor } =
    React.useContext(MarkdownDocContext);
  return (
    <MarkdownLink
      docDir={docDir}
      onOpenMarkdown={onOpenDocument}
      onOpenExternal={onOpenExternalUrl}
      onNavigateAnchor={onNavigateAnchor}
      {...props}
    />
  );
};
const MarkdownPre = ({ children, node, ...props }: any) => {
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
};

const MARKDOWN_COMPONENTS = {
  h1: MarkdownH1,
  h2: MarkdownH2,
  h3: MarkdownH3,
  h4: MarkdownH4,
  h5: MarkdownH5,
  h6: MarkdownH6,
  code: MarkdownCode,
  style: MarkdownStyle,
  table: MarkdownTable,
  img: MarkdownImg,
  a: MarkdownA,
  pre: MarkdownPre,
} as const;

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
      const docContextValue = React.useMemo<MarkdownDocContextValue>(
        () => ({
          docDir,
          onOpenDocument,
          onOpenExternalUrl,
          onNavigateAnchor,
        }),
        [docDir, onOpenDocument, onOpenExternalUrl, onNavigateAnchor]
      );

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
            <MarkdownDocContext.Provider value={docContextValue}>
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
                components={MARKDOWN_COMPONENTS}
              >
                {content}
              </ReactMarkdown>
            </MarkdownDocContext.Provider>
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

  // Read global setting once during initial state setup of a tab
  const initialGlobalTocRef = React.useRef(globalTocDefault);

  const tocData = useTableOfContents({ markdown: rawMarkdown });
  const initialTocOpen = showToc !== undefined ? showToc : initialGlobalTocRef.current;

  const tocToggle = useTocToggle({
    initialOpen: initialTocOpen,
    hasHeadings: tocData.hasHeadings,
    onToggle: () => onToggleToc?.(),
  });

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

  // Responsive TOC: hide automatically on narrow viewports (< 1240px) without touching manual setting
  const [isNarrowScreen, setIsNarrowScreen] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(max-width: 1240px)').matches;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(max-width: 1240px)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsNarrowScreen(e.matches);
    };
    setIsNarrowScreen(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
      return () => mediaQuery.removeListener(handleMediaChange);
    }
  }, []);

  const userWantsToc =
    showToc !== undefined
      ? showToc && tocData.hasHeadings
      : tocToggle.isOpen && tocData.hasHeadings;

  const isTocOpen = userWantsToc && !isNarrowScreen;

  const contentRef = React.useRef<HTMLElement | null>(null);
  const search = useSearch({ containerRef: contentRef });
  useSelectionCopy({ containerRef: contentRef });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (search.isOpen) {
          search.closeSearch();
        } else {
          search.openSearch();
        }
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

  const slugTracker = React.useMemo(() => new SlugTracker(), [content]);

  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  const docDir = React.useMemo(() => {
    if (activePref === 'rtl' || activePref === 'ltr') {
      return activePref;
    }
    return detectFirstStrongDirection(rawMarkdown, { fallback: 'ltr' }) ?? 'ltr';
  }, [activePref, rawMarkdown]);

  const resolvedTocPosition: 'left' | 'right' = React.useMemo(() => {
    const pos = settings.tocPosition ?? 'left';
    if (pos === 'left') return 'left';
    if (pos === 'right') return 'right';
    return docDir === 'rtl' ? 'right' : 'left';
  }, [settings.tocPosition, docDir]);

  const resolvedScrollbarPosition: 'left' | 'right' =
    resolvedTocPosition === 'left' ? 'right' : 'left';

  return (
    <div
      ref={viewportRef}
      className={`markdown-viewport ${className}`.trim()}
      data-testid="markdown-viewport"
    >
      {Boolean(filename || filePath) && (
        <div className="floating-toolbar-container" data-testid="document-header">
          {/* Visually hidden document metadata for accessibility and document identification */}
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
            <h1 className="file-name doc-filename" id="pillFileName">
              {filename || 'Untitled Document'}
            </h1>
            {filePath && <span>{filePath}</span>}
          </span>

          <div className="floating-pill" role="toolbar" aria-label="Document controls">
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
              className={`pill-icon-btn doc-toc-toggle-btn ${isTocOpen ? 'active' : ''}`}
              id="outlineToggleBtn"
              onClick={tocToggle.toggle}
              disabled={!tocData.hasHeadings}
              aria-label="Toggle Outline Scrollspy (Ctrl+L)"
              title={
                tocData.hasHeadings
                  ? 'Toggle Outline Scrollspy (Ctrl+L)'
                  : 'No headings in document'
              }
              aria-expanded={isTocOpen}
              data-testid="doc-toc-toggle"
            >
              <Icon name="outline" size={14} strokeWidth={1.9} />
            </button>

            <button
              type="button"
              className={`pill-icon-btn doc-focus-btn ${isFocusMode ? 'active' : ''}`}
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
          position={resolvedTocPosition}
          onClose={tocToggle.close}
          onSelectHeading={onNavigateAnchor}
          containerRef={contentRef}
          zoomFactor={zoomFactor}
        />
      )}

      <ReadingScrollbar
        viewportRef={contentRef}
        side={resolvedScrollbarPosition}
      />
    </div>
  );
};

export default MarkdownViewer;
