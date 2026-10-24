import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';

describe('CommonMark Pipeline (US-009.1)', () => {
  it('parses headings h1 through h6 to appropriate HTML elements', () => {
    const markdown = `
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
`;
    render(<MarkdownViewer content={markdown} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading 1');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Heading 2');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Heading 3');
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Heading 4');
    expect(screen.getByRole('heading', { level: 5 })).toHaveTextContent('Heading 5');
    expect(screen.getByRole('heading', { level: 6 })).toHaveTextContent('Heading 6');
  });

  it('parses paragraphs and inline styling (bold, italic, code)', () => {
    const markdown = 'This is a **bold text** and *italic text* and `inline code` sample.';
    const { container } = render(<MarkdownViewer content={markdown} />);

    const p = container.querySelector('p');
    expect(p).toBeInTheDocument();

    const strong = container.querySelector('strong');
    expect(strong).toHaveTextContent('bold text');

    const em = container.querySelector('em');
    expect(em).toHaveTextContent('italic text');

    const code = container.querySelector('code');
    expect(code).toHaveTextContent('inline code');
  });

  it('parses blockquotes to <blockquote> elements', () => {
    const markdown = `
> This is a primary quote
> with multiple lines
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveTextContent('This is a primary quote with multiple lines');
  });

  it('parses unordered and ordered lists with nested items', () => {
    const markdown = `
- Item 1
- Item 2
  - Subitem 2.1
  - Subitem 2.2
- Item 3

1. First
2. Second
3. Third
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const uls = container.querySelectorAll('ul');
    expect(uls.length).toBeGreaterThanOrEqual(1);

    const ols = container.querySelectorAll('ol');
    expect(ols.length).toBeGreaterThanOrEqual(1);

    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(8);
  });

  it('parses thematic breaks (horizontal rules) to <hr> elements', () => {
    const markdown = `
Section Before

---

Section After
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const hr = container.querySelector('hr');
    expect(hr).toBeInTheDocument();
  });

  it('parses links and preserves link destinations', () => {
    const markdown = '[Documentation](https://commonmark.org/help/)';
    render(<MarkdownViewer content={markdown} />);

    const link = screen.getByRole('link', { name: 'Documentation' });
    expect(link).toHaveAttribute('href', 'https://commonmark.org/help/');
  });

  it('parses fenced code blocks to <pre> and <code> elements', () => {
    const markdown = `\`\`\`typescript
const greeting: string = "hello world";
console.log(greeting);
\`\`\``;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const pre = container.querySelector('pre');
    expect(pre).toBeInTheDocument();

    const code = pre?.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent('const greeting: string = "hello world";');
  });

  it('neutralizes raw HTML script tags without executing active code', () => {
    const maliciousMarkdown = '<script>window.__pwned__ = true;</script>';
    const { container } = render(<MarkdownViewer content={maliciousMarkdown} />);

    expect(container.querySelector('script')).toBeNull();
    expect((window as any).__pwned__).toBeUndefined();
  });

  it('renders document header when document metadata is provided', () => {
    render(
      <MarkdownViewer
        document={{
          filename: 'readme.md',
          filePath: '/home/user/docs/readme.md',
          content: '# Readme Content',
        }}
      />
    );

    expect(screen.getByTestId('document-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'readme.md' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Readme Content' })).toBeInTheDocument();
  });
});
