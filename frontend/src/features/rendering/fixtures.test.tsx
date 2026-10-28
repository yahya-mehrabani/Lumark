import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';

// Golden fixture markdown definitions covering PRD Section 13.2 & Story US-012.4
const commonmarkSpecFixture = `# CommonMark Baseline Specification Fixture

Paragraphs in CommonMark are separated by blank lines.

*Italic text* and **bold text** and ***bold italic text***.

Inline \`code snippets\` are supported.

> Blockquote Level 1
> > Nested Blockquote Level 2

* Item Alpha
* Item Beta
  * Sub-item Beta-1

1. First step
2. Second step

---

Link: [Official CommonMark Spec](https://spec.commonmark.org/)
`;

const headingsFixture = `# Headings Fixture

## Section One
### Subsection One
## Section One
## Section One

# راهنمای کاربری
## ویژگی‌ها
`;

const gfmExtensionsFixture = `# GFM Extensions Fixture

| Feature | Supported | Notes |
| :--- | :---: | ---: |
| Tables | Yes | Cleanly rendered |
| Task lists | Yes | Interactive checkboxes |

- [x] Completed task item
- [ ] Incomplete task item

~~Strikethrough text~~

Autolink: https://github.com/wailsapp/wails
`;

const codeBlocksFixture = `# Code Blocks Fixture

\`\`\`go
package main

import "fmt"

func main() {
	fmt.Println("Hello Go")
}
\`\`\`

\`\`\`typescript
const greeting: string = "Hello TypeScript";
console.log(greeting);
\`\`\`
`;

const linksAndAssetsFixture = `# Links and Assets Fixture

![Architecture](./assets/arch.png "Architecture")

![Missing](./assets/nonexistent.png)

[External](https://example.com)

[Relative Doc](./doc.md)

[Anchor Target](#links-and-assets-fixture)
`;

const persianSampleFixture = `# نمونه سند فارسی

این یک سند نمونه به زبان فارسی است.

## بخش اول: مقدمه

محتوای متنی با راست‌چین و حروف فارسی.

- مورد اول
- مورد دوم
`;

describe('Comprehensive Golden Fixtures Test Suite (US-012.4)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. CommonMark Specification Fixture', () => {
    it('renders CommonMark fixture without crashing and verifies expected DOM nodes', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'commonmark-spec.md',
            content: commonmarkSpecFixture,
          }}
        />
      );

      expect(container).toBeInTheDocument();
      const mainHeading = within(container.querySelector('main')!).getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('CommonMark Baseline Specification Fixture');
      expect(container.querySelector('em')).toHaveTextContent('Italic text');
      expect(container.querySelector('strong')).toHaveTextContent('bold text');
      expect(container.querySelector('code')).toHaveTextContent('code snippets');
      expect(container.querySelectorAll('blockquote').length).toBeGreaterThanOrEqual(2);
      expect(container.querySelectorAll('ul li').length).toBeGreaterThanOrEqual(3);
      expect(container.querySelectorAll('ol li').length).toBeGreaterThanOrEqual(2);
      expect(container.querySelector('hr')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Official CommonMark Spec/i })).toBeInTheDocument();
    });
  });

  describe('2. Headings & Anchors Fixture', () => {
    it('renders Headings fixture with deterministic IDs and duplicate disambiguation', () => {
      render(
        <MarkdownViewer
          document={{
            filename: 'headings-and-anchors.md',
            content: headingsFixture,
          }}
        />
      );

      const sectionOnes = screen
        .getAllByRole('heading', { level: 2 })
        .filter((h) => h.textContent?.includes('Section One'));

      expect(sectionOnes).toHaveLength(3);
      expect(sectionOnes[0]).toHaveAttribute('id', 'section-one');
      expect(sectionOnes[1]).toHaveAttribute('id', 'section-one-1');
      expect(sectionOnes[2]).toHaveAttribute('id', 'section-one-2');

      const persianHeading = screen.getByRole('heading', { name: /راهنمای کاربری/i });
      expect(persianHeading).toHaveAttribute('id', 'راهنمای-کاربری');
    });
  });

  describe('3. GFM Extensions Fixture', () => {
    it('renders GFM tables, task lists, strikethrough, and autolinks accurately', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'gfm-extensions.md',
            content: gfmExtensionsFixture,
          }}
        />
      );

      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelectorAll('th').length).toBe(3);
      expect(container.querySelectorAll('td').length).toBe(6);

      const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(false);

      expect(container.querySelector('del')).toHaveTextContent('Strikethrough text');
      expect(screen.getByRole('link', { name: /https:\/\/github.com\/wailsapp\/wails/i })).toBeInTheDocument();
    });
  });

  describe('4. Code Blocks Fixture', () => {
    it('renders code blocks with badges and copy buttons', async () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'code-blocks.md',
            content: codeBlocksFixture,
          }}
        />
      );

      const preElements = container.querySelectorAll('pre');
      expect(preElements.length).toBeGreaterThanOrEqual(1);

      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      expect(copyButtons.length).toBeGreaterThanOrEqual(2);

      const badges = screen.getAllByTestId('code-language-badge');
      const badgeTexts = badges.map((b) => b.textContent?.toLowerCase());
      expect(badgeTexts).toContain('go');
      expect(badgeTexts).toContain('typescript');
    });
  });

  describe('5. Links and Assets Fixture', () => {
    it('renders relative images, missing placeholders on error, and external link routing', () => {
      render(
        <MarkdownViewer
          document={{
            filename: 'links-and-assets.md',
            dir: '/workspace/docs',
            content: linksAndAssetsFixture,
          }}
        />
      );

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', '/local-asset/assets/arch.png');

      // Trigger error on nonexistent image to verify fallback placeholder
      fireEvent.error(images[1]);
      const placeholder = screen.getByTestId('missing-asset-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveTextContent('./assets/nonexistent.png');

      const externalLink = screen.getByRole('link', { name: /External/i });
      expect(externalLink).toHaveAttribute('target', '_blank');
      expect(externalLink).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('6. Persian / RTL Sample Fixture', () => {
    it('renders Persian RTL markdown cleanly without crashing', () => {
      const { container } = render(
        <MarkdownViewer
          document={{
            filename: 'نمونه سند.md',
            content: persianSampleFixture,
          }}
        />
      );

      expect(container).toBeInTheDocument();
      const mainHeading = within(container.querySelector('main')!).getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('نمونه سند فارسی');
      expect(container.querySelector('main')!.querySelectorAll('ul li').length).toBe(2);
    });
  });
});
