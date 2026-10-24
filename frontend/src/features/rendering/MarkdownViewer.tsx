import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
          }}
        >
          {content}
        </ReactMarkdown>
      </main>
    </div>
  );
};

export default MarkdownViewer;
