import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CodeBlock } from './CodeBlock';

describe('CodeBlock React Component (US-010.2)', () => {
  it('renders code block container with overflow-x auto styling', () => {
    const code = 'const x = 10;';
    render(<CodeBlock rawCode={code} language="typescript" />);

    const container = screen.getByTestId('code-block-container');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('data-language', 'typescript');

    const scrollContainer = screen.getByTestId('code-scroll-container');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer.style.overflowX).toBe('auto');
  });

  it('renders language badge for known language', () => {
    const code = 'package main\nfunc main() {}';
    render(<CodeBlock rawCode={code} language="go" />);

    const badge = screen.getByTestId('code-language-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('GO');
  });

  it('renders language badge for unknown language gracefully', async () => {
    const code = 'custom-dsl-statement';
    render(<CodeBlock rawCode={code} language="unknownlang" />);

    const badge = screen.getByTestId('code-language-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('UNKNOWNLANG');

    await waitFor(() => {
      expect(screen.getByTestId('shiki-fallback')).toBeInTheDocument();
    });
  });

  it('renders default TEXT badge when no language is specified', async () => {
    const code = 'Plain unadorned text';
    render(<CodeBlock rawCode={code} />);

    const badge = screen.getByTestId('code-language-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('TEXT');

    await waitFor(() => {
      expect(screen.getByTestId('shiki-fallback')).toBeInTheDocument();
    });
  });

  it('renders line numbers matching code line count', async () => {
    const multilineCode = 'line 1\nline 2\nline 3\nline 4\nline 5';
    render(<CodeBlock rawCode={multilineCode} language="bash" showLineNumbers={true} />);

    const lineNumbersContainer = screen.getByTestId('code-line-numbers');
    expect(lineNumbersContainer).toBeInTheDocument();
    expect(lineNumbersContainer).toHaveAttribute('aria-hidden', 'true');

    const lineElements = lineNumbersContainer.querySelectorAll('.line-number');
    expect(lineElements.length).toBe(5);
    expect(lineElements[0]).toHaveTextContent('1');
    expect(lineElements[4]).toHaveTextContent('5');

    await waitFor(() => {
      expect(screen.getByTestId('shiki-wrapper')).toBeInTheDocument();
    });
  });

  it('omits line numbers when showLineNumbers is false', async () => {
    const code = 'const a = 1;';
    render(<CodeBlock rawCode={code} language="typescript" showLineNumbers={false} />);

    expect(screen.queryByTestId('code-line-numbers')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('shiki-wrapper')).toBeInTheDocument();
    });
  });

  it('renders syntax highlighted HTML asynchronously for supported language', async () => {
    const goCode = 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hi")\n}';
    render(<CodeBlock rawCode={goCode} language="go" />);

    await waitFor(() => {
      const shikiWrapper = screen.getByTestId('shiki-wrapper');
      expect(shikiWrapper).toBeInTheDocument();
      expect(shikiWrapper.innerHTML).toContain('class="shiki');
      expect(shikiWrapper.innerHTML).toContain('package');
    });
  });

  it('falls back to readable plain text without error for unknown language', async () => {
    const unknownCode = 'CUSTOM_KEYWORD foo = 123;';
    render(<CodeBlock rawCode={unknownCode} language="unknownlanguage123" />);

    await waitFor(() => {
      const shikiFallback = screen.getByTestId('shiki-fallback');
      expect(shikiFallback).toBeInTheDocument();
      expect(shikiFallback).toHaveTextContent('CUSTOM_KEYWORD foo = 123;');
    });
  });

  it('renders accessible copy code button in header', async () => {
    render(<CodeBlock rawCode="echo test" language="bash" />);

    const copyBtn = screen.getByTestId('copy-code-button');
    expect(copyBtn).toBeInTheDocument();
    expect(copyBtn).toHaveAttribute('aria-label', 'Copy code to clipboard');
    expect(copyBtn).toHaveTextContent('Copy');

    await waitFor(() => {
      expect(screen.getByTestId('shiki-wrapper')).toBeInTheDocument();
    });
  });
});
