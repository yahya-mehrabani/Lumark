import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { MarkdownViewer } from './MarkdownViewer';

describe('KaTeX Currency Avoidance & Display Scrolling (US-014.3)', () => {
  it('prevents accidental math rendering for currency symbols in prose ($10 and $20)', () => {
    const markdown = 'The items cost $10 and $20 respectively.';
    const { container } = render(<MarkdownViewer content={markdown} />);

    // Must remain plain text without any .katex or math element
    expect(container.querySelector('.katex')).toBeNull();
    expect(container.querySelector('math')).toBeNull();
    expect(screen.getByText('The items cost $10 and $20 respectively.')).toBeInTheDocument();
  });

  it('prevents accidental math rendering for large currency amounts ($100 and $200)', () => {
    const markdown = 'Budget is between $100 and $200 for supplies.';
    const { container } = render(<MarkdownViewer content={markdown} />);

    expect(container.querySelector('.katex')).toBeNull();
    expect(container.querySelector('math')).toBeNull();
    expect(screen.getByText('Budget is between $100 and $200 for supplies.')).toBeInTheDocument();
  });

  it('prevents accidental math conversion for decimal currency ($5.00 and $10.00)', () => {
    const markdown = 'The price is $5.00 and $10.00.';
    const { container } = render(<MarkdownViewer content={markdown} />);

    expect(container.querySelector('.katex')).toBeNull();
    expect(container.querySelector('math')).toBeNull();
    expect(screen.getByText('The price is $5.00 and $10.00.')).toBeInTheDocument();
  });

  it('preserves legitimate mathematical expressions alongside currency prose', () => {
    const markdown = `
The price is $50 per license, and the discount formula is $d = 0.1 \\times p$.

Total payout is $100 and $200.
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    // Math formula $d = 0.1 \times p$ must render as KaTeX
    const mathNodes = container.querySelectorAll('.katex');
    expect(mathNodes.length).toBe(1);
    expect(mathNodes[0].textContent).toContain('d');

    // Currency text must remain plain text
    expect(container.textContent).toContain('The price is $50 per license');
    expect(container.textContent).toContain('Total payout is $100 and $200.');
  });

  it('renders long display equations inside scrollable .katex-display container', () => {
    const markdown = `
A very wide mathematical formula:

$$
\\sum_{i=1}^{100} x_i = x_1 + x_2 + x_3 + x_4 + x_5 + x_6 + x_7 + x_8 + x_9 + x_{10} + \\dots + x_{100}
$$
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const displayContainer = container.querySelector('.katex-display');
    expect(displayContainer).not.toBeNull();
    expect(displayContainer?.querySelector('math')).not.toBeNull();
    expect(displayContainer?.textContent).toContain('100');
  });

  it('verifies that .katex-display container has overflow-x auto and padding in CSS', () => {
    const markdownCssPath = path.resolve(__dirname, 'markdown.css');
    const katexCssPath = path.resolve(__dirname, '../../styles/katex.css');

    const markdownCss = fs.readFileSync(markdownCssPath, 'utf8');
    const katexCss = fs.readFileSync(katexCssPath, 'utf8');

    // Verify rules in markdown.css
    expect(markdownCss).toMatch(/\.markdown-content\s+\.katex-display\s*\{[^}]*overflow-x:\s*auto/);
    expect(markdownCss).toMatch(/\.markdown-content\s+\.katex-display\s*\{[^}]*padding:\s*0\.5rem\s+0/);

    // Verify rules in katex.css
    expect(katexCss).toMatch(/\.katex-display\s*\{[^}]*overflow-x:\s*auto/);
    expect(katexCss).toMatch(/\.katex-display\s*\{[^}]*padding:\s*0\.5rem\s+0/);
  });
});
