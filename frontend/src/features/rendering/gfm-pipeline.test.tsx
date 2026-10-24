import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';

describe('GitHub Flavored Markdown (GFM) Pipeline (US-009.2)', () => {
  it('parses tables and wraps them in a scrollable table-wrapper container', () => {
    const markdown = `
| Header Left | Header Center | Header Right |
| :--- | :---: | ---: |
| Left Row 1 | Center Row 1 | Right Row 1 |
| Left Row 2 | Center Row 2 | Right Row 2 |
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const tableWrapper = container.querySelector('.table-wrapper');
    expect(tableWrapper).toBeInTheDocument();
    expect(tableWrapper).toHaveAttribute('role', 'region');
    expect(tableWrapper).toHaveAttribute('aria-label', 'Table');

    const table = tableWrapper?.querySelector('table');
    expect(table).toBeInTheDocument();

    const headers = container.querySelectorAll('th');
    expect(headers).toHaveLength(3);
    expect(headers[0]).toHaveTextContent('Header Left');
    expect(headers[0].style.textAlign || headers[0].getAttribute('align')).toMatch(/left/);
    expect(headers[1]).toHaveTextContent('Header Center');
    expect(headers[1].style.textAlign || headers[1].getAttribute('align')).toMatch(/center/);
    expect(headers[2]).toHaveTextContent('Header Right');
    expect(headers[2].style.textAlign || headers[2].getAttribute('align')).toMatch(/right/);

    const cells = container.querySelectorAll('td');
    expect(cells).toHaveLength(6);
    expect(cells[0]).toHaveTextContent('Left Row 1');
  });

  it('parses task list items with disabled checkboxes matching state', () => {
    const markdown = `
- [ ] Task item to do
- [x] Task item completed
- Normal bullet item
`;
    const { container } = render(<MarkdownViewer content={markdown} />);

    const taskList = container.querySelector('ul.contains-task-list');
    expect(taskList).toBeInTheDocument();

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);

    const firstCheckbox = checkboxes[0] as HTMLInputElement;
    expect(firstCheckbox.checked).toBe(false);
    expect(firstCheckbox.disabled).toBe(true);

    const secondCheckbox = checkboxes[1] as HTMLInputElement;
    expect(secondCheckbox.checked).toBe(true);
    expect(secondCheckbox.disabled).toBe(true);
  });

  it('parses strikethrough syntax into <del> elements', () => {
    const markdown = 'This item is ~~deprecated and removed~~ from the spec.';
    const { container } = render(<MarkdownViewer content={markdown} />);

    const del = container.querySelector('del');
    expect(del).toBeInTheDocument();
    expect(del).toHaveTextContent('deprecated and removed');
  });

  it('automatically converts raw URLs into clickable links', () => {
    const markdown = 'Visit https://github.com/wailsapp/wails or email info@example.com for info.';
    render(<MarkdownViewer content={markdown} />);

    const webLink = screen.getByRole('link', { name: 'https://github.com/wailsapp/wails' });
    expect(webLink).toBeInTheDocument();
    expect(webLink).toHaveAttribute('href', 'https://github.com/wailsapp/wails');

    const mailLink = screen.getByRole('link', { name: 'info@example.com' });
    expect(mailLink).toBeInTheDocument();
    expect(mailLink).toHaveAttribute('href', 'mailto:info@example.com');
  });

  it('renders a composite GFM document with all extensions correctly', () => {
    const compositeMarkdown = `
# Release Notes

~~Version 0.9.0~~ is obsolete. See https://example.com/v1.0.

### Release Checklist
- [x] Core CommonMark rendering
- [x] GFM table alignment
- [ ] Cross-platform binary builds

| Feature | Status | Notes |
| :--- | :---: | :--- |
| Parsing | Complete | react-markdown + remark-gfm |
| Styling | Complete | Responsive max-width container |
`;
    const { container } = render(<MarkdownViewer content={compositeMarkdown} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Release Notes' })).toBeInTheDocument();
    expect(container.querySelector('del')).toHaveTextContent('Version 0.9.0');
    expect(screen.getByRole('link', { name: 'https://example.com/v1.0' })).toBeInTheDocument();

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(3);

    const tableWrapper = container.querySelector('.table-wrapper');
    expect(tableWrapper).toBeInTheDocument();
  });
});
