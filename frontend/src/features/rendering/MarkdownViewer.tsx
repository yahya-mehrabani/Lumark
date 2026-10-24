import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './components/CodeBlock';
import { Heading } from './components/Heading';
import { MarkdownImage } from './components/MarkdownImage';
import { MarkdownLink } from './components/MarkdownLink';
import { SlugTracker, SlugContext } from './utils/slugify';
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
  onOpenDocument?: (filePath: string, anchor?: string) => void;
  onOpenExternalUrl?: (url: string) => Promise<void> | void;
  onNavigateAnchor?: (anchor: string) => void;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  document,
  content: rawContent,
  className = '',
  onOpenDocument,
  onOpenExternalUrl,
  onNavigateAnchor,
}) => {
  const content = document ? document.content : (rawContent ?? '');
  const filename = document?.filename;
  const filePath = document?.filePath;

  const slugTracker = React.useMemo(() => new SlugTracker(), [content]);
  // Reset tracker on every render pass so re-renders of the same content yield deterministic IDs
  slugTracker.reset();

  return (
    <div className={`markdown-viewport ${className}`.trim()} data-testid="markdown-viewport">
      {(filename || filePath) && (
        <header className="document-header-bar" data-testid="document-header">
          <div className="doc-title-group">
            <span className="doc-type-badge">MARKDOWN</span>
            <h1 className="doc-filename">{filename || 'Untitled Document'}</h1>
          </div>
          {filePath && (
            <div className="doc-path-badge" title={filePath}>
              <span className="path-label">PATH:</span> {filePath}
            </div>
          )}
        </header>
      )}

      <main className="markdown-content" data-testid="markdown-content">
        <SlugContext.Provider value={slugTracker}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            urlTransform={(url) => url}
            components={{
              h1: ({ node, ...props }) => <Heading level={1} {...props} />,
              h2: ({ node, ...props }) => <Heading level={2} {...props} />,
              h3: ({ node, ...props }) => <Heading level={3} {...props} />,
              h4: ({ node, ...props }) => <Heading level={4} {...props} />,
              h5: ({ node, ...props }) => <Heading level={5} {...props} />,
              h6: ({ node, ...props }) => <Heading level={6} {...props} />,
              table: ({ node, ...props }) => (
                <div className="table-wrapper" role="region" tabIndex={0} aria-label="Table">
                  <table {...props} />
                </div>
              ),
              img: ({ node, ...props }) => <MarkdownImage docDir={document?.dir} {...props} />,
              a: ({ node, ...props }) => (
                <MarkdownLink
                  docDir={document?.dir}
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
                  return <CodeBlock rawCode={rawCode} language={language} />;
                }
                return <pre {...props}>{children}</pre>;
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </SlugContext.Provider>
      </main>
    </div>
  );
};

export default MarkdownViewer;
