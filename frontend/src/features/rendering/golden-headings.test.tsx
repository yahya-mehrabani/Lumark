import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';

const goldenHeadingsFixture = `# Headings and Anchors Golden Fixture

Baseline golden fixture for deterministic unique heading slug generation, duplicate disambiguation, Unicode preservation, and in-document anchor navigation.

[Jump to Introduction](#introduction) | [Jump to Duplicate 1](#duplicate-section) | [Jump to Duplicate 2](#duplicate-section-1) | [Jump to Duplicate 3](#duplicate-section-2) | [Jump to Persian](#راهنمای-جامع-کاربری)

---

## Level 2 Heading

This is a level 2 heading section.

### Level 3 Heading

This is a level 3 heading section.

#### Level 4 Heading

This is a level 4 heading section.

##### Level 5 Heading

This is a level 5 heading section.

###### Level 6 Heading

This is a level 6 heading section with subtle gray typography.

---

## Duplicate Section

First instance of the duplicate section heading.

## Duplicate Section

Second instance of the duplicate section heading. Expected anchor ID: \`duplicate-section-1\`.

## Duplicate Section

Third instance of the duplicate section heading. Expected anchor ID: \`duplicate-section-2\`.

---

## Headings with Inline Formatting: *Italic*, **Bold**, and \`Code\`

This heading contains nested Markdown formatting elements. The slug generator must extract plain text: \`headings-with-inline-formatting-italic-bold-and-code\`.

## Heading with Punctuation & Special Symbols: C++ / C# & v2.0 (New!)

Punctuation marks must be safely stripped or hyphenated.

---

# راهنمای جامع کاربری

این بخش با حروف و زبان فارسی نوشته شده است و باید شناسه لنگر معتبر با حفظ کاراکترهای یونیکد داشته باشد: \`راهنمای-جامع-کاربری\`.

## ویژگی‌های سیستم

ویژگی‌های پیشرفته با نیم‌فاصله یونیکد.

## Über die Entwickler

European accented characters test: \`über-die-entwickler\`.

## ユーザーガイド

Japanese CJK characters test: \`ユーザーガイド\`.

---

## Navigation Links

- [Back to Top](#headings-and-anchors-golden-fixture)
- [Go to Level 6 Heading](#level-6-heading)
- [Go to Persian Guide](#راهنمای-جامع-کاربری)
- [Go to Inline Formatting Heading](#headings-with-inline-formatting-italic-bold-and-code)
`;

describe('Golden Headings Fixture Suite (US-012.3)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and renders the complete headings and anchors golden fixture', () => {
    const { container } = render(
      <MarkdownViewer
        document={{
          filename: 'headings-and-anchors.md',
          filePath: '/fixtures/golden/headings-and-anchors.md',
          dir: '/fixtures/golden',
          content: goldenHeadingsFixture,
        }}
      />
    );

    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('document-header')).toHaveTextContent('headings-and-anchors.md');
  });

  it('renders all heading levels h1 through h6 with correct tags and deterministic IDs', () => {
    render(<MarkdownViewer content={goldenHeadingsFixture} />);

    const h1s = screen.getAllByTestId('heading-1');
    expect(h1s.length).toBeGreaterThanOrEqual(1);
    expect(h1s[0].tagName.toLowerCase()).toBe('h1');
    expect(h1s[0]).toHaveAttribute('id', 'headings-and-anchors-golden-fixture');

    const h2 = screen.getAllByTestId('heading-2')[0];
    expect(h2.tagName.toLowerCase()).toBe('h2');
    expect(h2).toHaveAttribute('id', 'level-2-heading');

    const h3 = screen.getByTestId('heading-3');
    expect(h3.tagName.toLowerCase()).toBe('h3');
    expect(h3).toHaveAttribute('id', 'level-3-heading');

    const h4 = screen.getByTestId('heading-4');
    expect(h4.tagName.toLowerCase()).toBe('h4');
    expect(h4).toHaveAttribute('id', 'level-4-heading');

    const h5 = screen.getByTestId('heading-5');
    expect(h5.tagName.toLowerCase()).toBe('h5');
    expect(h5).toHaveAttribute('id', 'level-5-heading');

    const h6 = screen.getByTestId('heading-6');
    expect(h6.tagName.toLowerCase()).toBe('h6');
    expect(h6).toHaveAttribute('id', 'level-6-heading');
  });

  it('disambiguates triplicate duplicate headings with incrementing suffixes', () => {
    render(<MarkdownViewer content={goldenHeadingsFixture} />);

    const duplicateHeadings = screen.getAllByRole('heading', { level: 2 }).filter((h) =>
      h.textContent?.includes('Duplicate Section')
    );

    expect(duplicateHeadings).toHaveLength(3);
    expect(duplicateHeadings[0]).toHaveAttribute('id', 'duplicate-section');
    expect(duplicateHeadings[1]).toHaveAttribute('id', 'duplicate-section-1');
    expect(duplicateHeadings[2]).toHaveAttribute('id', 'duplicate-section-2');
  });

  it('preserves Unicode characters across Persian, German, and Japanese headings', () => {
    render(<MarkdownViewer content={goldenHeadingsFixture} />);

    const allHeadings = screen.getAllByRole('heading');
    const ids = allHeadings.map((h) => h.getAttribute('id'));

    expect(ids).toContain('راهنمای-جامع-کاربری');
    expect(ids).toContain('ویژگی-های-سیستم');
    expect(ids).toContain('über-die-entwickler');
    expect(ids).toContain('ユーザーガイド');
  });

  it('extracts plain text from headings containing nested Markdown formatting', () => {
    render(<MarkdownViewer content={goldenHeadingsFixture} />);

    const formattedHeading = screen
      .getAllByRole('heading')
      .find((h) => h.getAttribute('id')?.startsWith('headings-with-inline-formatting'));

    expect(formattedHeading).toBeDefined();
    expect(formattedHeading).toHaveAttribute(
      'id',
      'headings-with-inline-formatting-italic-bold-and-code'
    );
  });

  it('attaches heading-anchor direct link to every rendered heading', () => {
    render(<MarkdownViewer content={goldenHeadingsFixture} />);

    const anchors = screen.getAllByTestId('heading-anchor');
    expect(anchors.length).toBeGreaterThanOrEqual(10);

    anchors.forEach((anchor) => {
      const href = anchor.getAttribute('href');
      expect(href).toMatch(/^#[^\s]+$/);
    });
  });

  it('navigates to duplicate heading targets when clicked from internal links', () => {
    render(<MarkdownViewer content={goldenHeadingsFixture} />);

    const duplicate2Link = screen.getByRole('link', { name: /Jump to Duplicate 2/i });
    expect(duplicate2Link).toHaveAttribute('href', '#duplicate-section-1');

    fireEvent.click(duplicate2Link);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });

    scrollIntoViewMock.mockClear();

    const persianLink = screen.getByRole('link', { name: /Jump to Persian/i });
    expect(decodeURIComponent(persianLink.getAttribute('href') || '')).toBe('#راهنمای-جامع-کاربری');

    fireEvent.click(persianLink);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});
