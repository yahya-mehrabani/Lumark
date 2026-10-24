import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './components/CodeBlock';
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
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  document,
  content: rawContent,
  className = '',
}) => {
  const content = document ? document.content : (rawContent ?? '');
  const filename = document?.filename;
  const filePath = document?.filePath;

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
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            table: ({ node, ...props }) => (
              <div className="table-wrapper" role="region" tabIndex={0} aria-label="Table">
                <table {...props} />
              </div>
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
      </main>
    </div>
  );
};

export default MarkdownViewer;
