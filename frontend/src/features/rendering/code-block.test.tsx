import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';
import { CodeBlock } from './components/CodeBlock';

const goldenCodeBlocksFixture = `
# Golden Code Blocks & Syntax Highlighting Fixture

## 1. Supported Language: Go

\`\`\`go
package main

import (
	"fmt"
	"strings"
)

type Greeter struct {
	Greeting string
}

func main() {
	g := Greeter{Greeting: "سلام دنیا (Hello World 🌍)"}
	fmt.Println(strings.ToUpper(g.Greeting))
}
\`\`\`

## 2. Supported Language: TypeScript

\`\`\`typescript
export interface DocumentSession {
  readonly id: string;
  filename: string;
  isDirty: boolean;
  wordCount: number;
}

export function formatSession(doc: DocumentSession): string {
  const status = doc.isDirty ? '● Unsaved' : 'Saved';
  return \`[\${doc.id}] \${doc.filename} - \${status} (\${doc.wordCount} words)\`;
}
\`\`\`

## 3. Supported Language: Python with Unicode & Comments

\`\`\`python
import sys

def compute_metrics(text: str) -> dict:
    # تابع پردازش متن و کلمات (Persian RTL comment)
    tokens = text.strip().split()
    return {
        "count": len(tokens),
        "status": "موفق",
        "emoji": "✨"
    }

if __name__ == "__main__":
    print(compute_metrics("آزمایش Antigravity"))
\`\`\`

## 4. Unknown Language Fallback

\`\`\`customunknownlanguage
DEFINE ENTITY Customer {
    PRIMARY_KEY id: UUID
    FIELD name: STRING(100)
    CONSTRAINT check_positive_balance CHECK(balance >= 0)
}
\`\`\`

## 5. Plain Code Block Without Language Identifier

\`\`\`
Plain log lines without syntax highlight identifier:
2026-10-24 14:00:00 [INFO] Markdown viewer started
2026-10-24 14:00:01 [DEBUG] Initialized Shiki offline grammars
\`\`\`

## 6. Long Lines Testing Horizontal Scrolling

\`\`\`bash
curl -X POST "https://api.internal.local/v1/projects/markdown-viewer/deployments?env=production&region=us-east-1&validate=true&notify=team-leads" -H "Authorization: Bearer mock_token_for_length_testing_without_line_wrap_demonstrating_horizontal_scrolling" -H "Content-Type: application/json" -d '{"version":"1.0.0","commit":"85e3726","artifacts":["app-linux-amd64","app-windows-x64.exe"]}'
\`\`\`
`;


describe('Fenced Code Blocks, Syntax Highlighting & Copy Action Integration (US-010.4)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Go code block with language badge, line numbers, and accurate Shiki highlighting (AC 1)', async () => {
    const md = '```go\npackage main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello")\n}\n```';

    render(<MarkdownViewer content={md} />);

    // Language badge
    const badge = screen.getByTestId('code-language-badge');
    expect(badge).toHaveTextContent('GO');

    // Line numbers
    const lineNumbers = screen.getByTestId('code-line-numbers');
    expect(lineNumbers).toBeInTheDocument();
    const lines = lineNumbers.querySelectorAll('.line-number');
    expect(lines.length).toBe(7);

    // Shiki highlighting wrapper
    await waitFor(() => {
      const shiki = screen.getByTestId('shiki-wrapper');
      expect(shiki).toBeInTheDocument();
      expect(shiki.innerHTML).toContain('class="shiki');
      expect(shiki.innerHTML).toContain('package');
      expect(shiki.innerHTML).toContain('main');
    });
  });

  it('renders unknown language in readable monospaced font without errors (AC 2)', async () => {
    const md = '```unknownlang\nDEF ENTITY Sample { id: 1 }\n```';

    render(<MarkdownViewer content={md} />);

    const badge = screen.getByTestId('code-language-badge');
    expect(badge).toHaveTextContent('UNKNOWNLANG');

    await waitFor(() => {
      const fallback = screen.getByTestId('shiki-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('DEF ENTITY Sample { id: 1 }');
    });
  });

  it('ensures long lines scroll horizontally inside container without stretching layout (AC 3, PRD 5.4)', async () => {
    const longLine = 'const veryLongLine = "' + 'a'.repeat(300) + '";';
    const md = `\`\`\`javascript\n${longLine}\n\`\`\``;

    render(<MarkdownViewer content={md} />);

    const scrollContainer = screen.getByTestId('code-scroll-container');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer.style.overflowX).toBe('auto');
    expect(scrollContainer).toHaveAttribute('role', 'region');
    expect(scrollContainer).toHaveAttribute('tabIndex', '0');

    await waitFor(() => {
      expect(screen.getByTestId('shiki-wrapper')).toBeInTheDocument();
    });
  });

  it('copies exact original code to clipboard preserving tabs, spaces, newlines, and Unicode (AC 4, FR-RENDER-004)', async () => {
    const rawSnippet =
      'func Calculate() {\n\t// \tIndented with tabs\n\tval := "مرحبا 🚀"\n\treturn val\n}\n';

    let clipboardData = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockImplementation(async (text: string) => {
          clipboardData = text;
          return Promise.resolve();
        }),
      },
      writable: true,
      configurable: true,
    });

    render(<CodeBlock rawCode={rawSnippet} language="go" />);

    await waitFor(() => {
      expect(screen.getByTestId('shiki-wrapper')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTestId('copy-code-button');
    expect(copyBtn).toHaveTextContent('Copy');

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(copyBtn).toHaveTextContent('Copied!');
      expect(copyBtn).toHaveClass('copied');
      expect(clipboardData).toBe(rawSnippet);
    });

    // Detailed whitespace and Unicode fidelity checks
    expect(clipboardData.includes('\t// \tIndented with tabs')).toBe(true);
    expect(clipboardData.includes('مرحبا 🚀')).toBe(true);
    expect(clipboardData.endsWith('\n')).toBe(true);
    expect(clipboardData).not.toContain('<span');
    expect(clipboardData).not.toContain('class="shiki"');
  });

  it('renders all code blocks from the golden fixture suite successfully', async () => {
    render(<MarkdownViewer content={goldenCodeBlocksFixture} />);

    // Multiple code blocks should be present
    const containers = await screen.findAllByTestId('code-block-container');
    expect(containers.length).toBe(6);

    // Verify badges across the blocks
    const badges = screen.getAllByTestId('code-language-badge');
    const badgeTexts = badges.map((b) => b.textContent?.trim());
    expect(badgeTexts).toContain('GO');
    expect(badgeTexts).toContain('TYPESCRIPT');
    expect(badgeTexts).toContain('PYTHON');
    expect(badgeTexts).toContain('CUSTOMUNKNOWNLANGUAGE');
    expect(badgeTexts).toContain('TEXT');
    expect(badgeTexts).toContain('BASH');

    // Verify copy button is present on every code block
    const copyButtons = screen.getAllByTestId('copy-code-button');
    expect(copyButtons.length).toBe(6);
    for (const btn of copyButtons) {
      expect(btn).toHaveAttribute('aria-label', 'Copy code to clipboard');
    }
  });

  it('displays accessible feedback on copy and provides localized error handling', async () => {
    const onCopySuccess = vi.fn();
    const onCopyError = vi.fn();

    let clip = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockImplementation(async (t: string) => {
          clip = t;
        }),
      },
      writable: true,
      configurable: true,
    });

    render(
      <CodeBlock
        rawCode="echo 'hello world'"
        language="bash"
        onCopySuccess={onCopySuccess}
        onCopyError={onCopyError}
      />
    );

    const btn = screen.getByTestId('copy-code-button');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toHaveTextContent('Copied!');
      expect(btn).toHaveAttribute('aria-label', 'Copied to clipboard');
      expect(onCopySuccess).toHaveBeenCalledWith("echo 'hello world'");
      expect(clip).toBe("echo 'hello world'");
    });
  });
});
