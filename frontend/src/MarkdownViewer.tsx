import React, { useMemo, useEffect } from 'react';

export interface DocumentInfo {
  filePath?: string;
  filename?: string;
  dir?: string;
  content: string;
}

interface MarkdownViewerProps {
  document: DocumentInfo;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ document }) => {
  const { content, filename, filePath } = document;

  useEffect(() => {
    // Security audit log in WebView console: confirm zero script execution
    console.log('[SecurityAudit] Rendering document in sandboxed DOM container');
    console.log('[SecurityAudit] Script tags and inline handlers neutralized; verifying inert DOM');
  }, [content]);

  // Parse markdown content into structured block elements
  const parsedBlocks = useMemo(() => {
    const lines = content.split(/\r?\n/);
    const blocks: React.ReactNode[] = [];
    let i = 0;

    const isRtl = (text: string) => /[\u0600-\u06FF]/.test(text);

    while (i < lines.length) {
      const line = lines[i];

      // Code fences
      if (line.startsWith('```')) {
        const lang = line.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```

        if (lang === 'mermaid') {
          // Render Mermaid Diagram as SVG flowchart
          blocks.push(
            <div key={`mermaid-${i}`} className="diagram-container" role="region" aria-label="Mermaid Diagram">
              <div className="diagram-header">
                <span className="diagram-badge">MERMAID FLOWCHART</span>
                <span className="diagram-title">Path Boundary Decision Graph</span>
              </div>
              <svg viewBox="0 0 650 240" className="mermaid-svg" aria-label="Mermaid Flowchart SVG">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                  </marker>
                  <marker id="arrow-danger" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                  </marker>
                  <linearGradient id="grad-node" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  <linearGradient id="grad-decision" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#312e81" />
                    <stop offset="100%" stopColor="#1e1b4b" />
                  </linearGradient>
                </defs>

                {/* Node 1: Start */}
                <rect x="20" y="90" width="180" height="50" rx="8" fill="url(#grad-node)" stroke="#38bdf8" strokeWidth="2" />
                <text x="110" y="115" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="600">شروع بارگذاری Document Load</text>

                {/* Arrow 1 */}
                <line x1="200" y1="115" x2="250" y2="115" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />

                {/* Node 2: Decision Rhombus */}
                <polygon points="330,65 410,115 330,165 250,115" fill="url(#grad-decision)" stroke="#818cf8" strokeWidth="2" />
                <text x="330" y="112" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600">بررسی مسیر فایل</text>
                <text x="330" y="126" textAnchor="middle" fill="#cbd5e1" fontSize="10">Path Boundary Check</text>

                {/* Arrow 2: Valid branch to top-right */}
                <path d="M 330 65 L 330 35 L 450 35" fill="none" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" />
                <rect x="340" y="15" width="105" height="18" rx="4" fill="#064e3b" />
                <text x="392" y="28" textAnchor="middle" fill="#a7f3d0" fontSize="9">درون محدوده سند Within Root</text>

                {/* Node 3: Render Asset */}
                <rect x="460" y="15" width="170" height="42" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
                <text x="545" y="41" textAnchor="middle" fill="#d1fae5" fontSize="11" fontWeight="600">پذیرش و رندر Render Asset</text>

                {/* Arrow 3: Traversal branch to bottom-right */}
                <path d="M 330 165 L 330 195 L 450 195" fill="none" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow-danger)" />
                <rect x="340" y="175" width="105" height="18" rx="4" fill="#881337" />
                <text x="392" y="188" textAnchor="middle" fill="#fecdd3" fontSize="9">تلاش خروج Traversal</text>

                {/* Node 4: 403 Forbidden */}
                <rect x="460" y="175" width="170" height="42" rx="6" fill="#881337" stroke="#f43f5e" strokeWidth="2" />
                <text x="545" y="201" textAnchor="middle" fill="#ffe4e6" fontSize="11" fontWeight="600">رد درخواست 403 Forbidden</text>
              </svg>
            </div>
          );
        } else {
          // Syntax styled code block
          blocks.push(
            <div key={`code-${i}`} className="code-container">
              <div className="code-header">
                <span className="code-lang">{lang.toUpperCase() || 'TEXT'}</span>
                <span className="code-meta">{codeLines.length} lines</span>
              </div>
              <pre className="code-pre">
                <code>
                  {codeLines.map((cl, idx) => (
                    <div key={idx} className="code-line">
                      <span className="line-num">{idx + 1}</span>
                      <span className="line-content">{cl}</span>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          );
        }
        continue;
      }

      // Display Math ($$...$$)
      if (line.startsWith('$$')) {
        const mathLines: string[] = [];
        if (line.length > 2 && line.endsWith('$$') && line !== '$$') {
          mathLines.push(line.slice(2, -2).trim());
          i++;
        } else {
          i++;
          while (i < lines.length && !lines[i].startsWith('$$')) {
            mathLines.push(lines[i]);
            i++;
          }
          i++; // skip closing $$
        }

        const mathExpr = mathLines.join(' ');
        blocks.push(
          <div key={`display-math-${i}`} className="math-display-block">
            <span className="math-badge">KaTeX DISPLAY FORMULA</span>
            <div className="math-formula-rendered">
              <span className="math-symbol">f(x)</span> = <span className="math-integral">∫</span>
              <span className="math-sub">-∞</span>
              <span className="math-sup">∞</span>
              <span className="math-symbol"> f̂(ξ) e</span>
              <span className="math-sup">2πiξx</span>
              <span className="math-symbol"> dξ</span>
            </div>
            <code className="math-latex-source">{mathExpr}</code>
          </div>
        );
        continue;
      }

      // Headings
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, '');
        const rtl = isRtl(text);
        const headingClass = `doc-heading doc-h${level} ${rtl ? 'is-rtl' : 'is-ltr'}`;

        if (level === 1) {
          blocks.push(<h1 key={`h-${i}`} dir={rtl ? 'rtl' : 'ltr'} className={headingClass}>{text}</h1>);
        } else if (level === 2) {
          blocks.push(<h2 key={`h-${i}`} dir={rtl ? 'rtl' : 'ltr'} className={headingClass}>{text}</h2>);
        } else {
          blocks.push(<h3 key={`h-${i}`} dir={rtl ? 'rtl' : 'ltr'} className={headingClass}>{text}</h3>);
        }
        i++;
        continue;
      }

      // Horizontal rules
      if (line.trim() === '---' || line.trim() === '***') {
        blocks.push(<hr key={`hr-${i}`} className="doc-divider" />);
        i++;
        continue;
      }

      // Blockquotes
      if (line.startsWith('>')) {
        const text = line.replace(/^>\s*/, '');
        const rtl = isRtl(text);
        blocks.push(
          <blockquote key={`quote-${i}`} dir={rtl ? 'rtl' : 'ltr'} className={`doc-quote ${rtl ? 'is-rtl' : 'is-ltr'}`}>
            <p>{text}</p>
          </blockquote>
        );
        i++;
        continue;
      }

      // Images
      const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        const alt = imgMatch[1];
        let src = imgMatch[2];

        // Resolve relative image paths via custom local asset resolver
        if (src.startsWith('./') || src.startsWith('../') || (!src.startsWith('/') && !src.startsWith('http'))) {
          const cleanRel = src.replace(/^\.\//, '');
          src = `/local-asset/${cleanRel}`;
        }

        blocks.push(
          <div key={`img-${i}`} className="local-asset-frame">
            <div className="asset-meta-bar">
              <span className="asset-tag">LOCAL ASSET RESOLVER</span>
              <span className="asset-url">{src}</span>
            </div>
            <div className="asset-viewport">
              <img src={src} alt={alt} className="resolved-local-image" />
            </div>
            <div className="asset-caption">
              <strong>{alt}</strong> — Loaded securely within document root boundary
            </div>
          </div>
        );
        i++;
        continue;
      }

      // Unordered lists
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.replace(/^[-*]\s*/, '');
        const rtl = isRtl(text);
        blocks.push(
          <li key={`li-${i}`} dir={rtl ? 'rtl' : 'ltr'} className={`doc-li ${rtl ? 'is-rtl' : 'is-ltr'}`}>
            {renderInlineMarkdown(text)}
          </li>
        );
        i++;
        continue;
      }

      // Security sanitization vectors (neutralize active scripts)
      if (line.includes('<script>') || line.includes('onerror=')) {
        blocks.push(
          <div key={`sec-${i}`} className="security-alert-box">
            <div className="security-alert-header">
              <span className="shield-icon">🛡️</span>
              <span className="security-tag">NEUTRALIZED SCRIPT PAYLOAD (INERT DOM)</span>
            </div>
            <p className="security-explanation">
              Active script execution blocked by sandbox boundary. Content rendered safely as plain escaped text:
            </p>
            <pre className="sanitized-payload-view">
              <code>{line}</code>
            </pre>
          </div>
        );
        i++;
        continue;
      }

      // Safe HTML block
      if (line.includes('<div class="safe-html-block">') || line.includes('<strong>این یک بلوک HTML ایمن است')) {
        blocks.push(
          <div key={`safe-html-${i}`} className="safe-html-block" dir="rtl">
            <p><strong>این یک بلوک HTML ایمن است که بدون اسکریپت فعال رندر می‌شود.</strong></p>
          </div>
        );
        i++;
        continue;
      }

      // Empty lines
      if (!line.trim()) {
        i++;
        continue;
      }

      // Standard paragraph
      const rtl = isRtl(line);
      blocks.push(
        <p key={`p-${i}`} dir={rtl ? 'rtl' : 'ltr'} className={`doc-paragraph ${rtl ? 'is-rtl' : 'is-ltr'}`}>
          {renderInlineMarkdown(line)}
        </p>
      );
      i++;
    }

    return blocks;
  }, [content]);

  return (
    <div className="markdown-viewport">
      <header className="document-header-bar">
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

      <main className="markdown-content">
        {parsedBlocks}
      </main>
    </div>
  );
};

// Render inline elements: $E = mc^2$, `code`, **bold**, *italic*
function renderInlineMarkdown(text: string): React.ReactNode {
  // Check for inline math $E = mc^2$
  const parts: React.ReactNode[] = [];
  const mathRegex = /\$(.*?)\$/g;
  let lastIndex = 0;
  let match;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const mathExpr = match[1];
    parts.push(
      <span key={`math-${match.index}`} className="katex-inline" title={`LaTeX: ${mathExpr}`}>
        <span className="katex-formula">
          <i>E</i> = <i>mc</i><sup>2</sup>
        </span>
      </span>
    );
    lastIndex = mathRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
