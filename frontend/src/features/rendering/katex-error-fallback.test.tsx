import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';

describe('KaTeX Pipeline Integration & Error Fallback (US-014.2)', () => {
  it('renders valid inline and display math via the unified pipeline', () => {
    const markdown = `# Math Document

Inline formula: $a^2 + b^2 = c^2$ in text.

Display block:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    // Check heading and text
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Math Document');

    // Check inline math
    const katexInline = container.querySelector('.katex:not(.katex-display .katex)');
    expect(katexInline).not.toBeNull();
    expect(container.querySelector('math')).not.toBeNull();

    // Check display math
    const katexDisplay = container.querySelector('.katex-display');
    expect(katexDisplay).not.toBeNull();
    expect(katexDisplay?.textContent).toContain('π');
  });

  it('renders malformed inline formula with safe error fallback badge without crashing', () => {
    const markdown = 'Here is an invalid formula: $\\frac{1}{$ and more prose.';
    const { container } = render(<MarkdownViewer content={markdown} />);

    // Document must not crash and must render surrounding text
    expect(container.textContent).toContain('Here is an invalid formula:');
    expect(container.textContent).toContain('and more prose.');

    // Malformed formula should render .katex-error element with raw formula and title
    const errorEl = container.querySelector('.katex-error');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain('\\frac{1}{');
    expect(errorEl?.getAttribute('title')).toMatch(/KaTeX parse error/i);
  });

  it('renders malformed display formula with graceful partial rendering (FR-RENDER-009)', () => {
    const markdown = `## Before Error
This paragraph renders properly.

$$
\\frac{1}{
$$

## After Error
This subsequent paragraph also renders properly.

$$
E = mc^2
$$
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    // Surrounding headings and paragraphs must render cleanly
    expect(screen.getByRole('heading', { name: /Before Error/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /After Error/i })).toBeInTheDocument();
    expect(screen.getByText('This paragraph renders properly.')).toBeInTheDocument();
    expect(screen.getByText('This subsequent paragraph also renders properly.')).toBeInTheDocument();

    // The malformed formula is contained within .katex-error
    const errorEl = container.querySelector('.katex-error');
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain('\\frac{1}{');

    // The valid display formula after the error renders properly
    const validDisplay = container.querySelector('.katex-display');
    expect(validDisplay).not.toBeNull();
    expect(validDisplay?.textContent).toContain('mc');
  });

  it('handles unsupported or unknown LaTeX macros gracefully without throwing', () => {
    const markdown = 'Formula with unknown macro: $\\unsupportedMacro{123}$ and trailing text';
    const { container } = render(<MarkdownViewer content={markdown} />);

    expect(container.textContent).toContain('Formula with unknown macro:');
    expect(container.textContent).toContain('and trailing text');

    // Unknown macro is either marked with katex-error or styled with error color without throwing
    const katexEl = container.querySelector('.katex');
    expect(katexEl).not.toBeNull();
    expect(katexEl?.textContent).toContain('\\unsupportedMacro');
  });

  it('handles multiple distinct math errors across the document independently', () => {
    const markdown = `
First bad formula: $\\sqrt{$

Valid formula: $x = 1$

Second bad formula: $\\sum_{$
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const errorElements = container.querySelectorAll('.katex-error');
    expect(errorElements.length).toBe(2);
    expect(errorElements[0].textContent).toContain('\\sqrt{');
    expect(errorElements[1].textContent).toContain('\\sum_{');

    // The valid middle formula must still render cleanly
    const mathElements = container.querySelectorAll('math');
    expect(mathElements.length).toBeGreaterThan(0);
  });
});
