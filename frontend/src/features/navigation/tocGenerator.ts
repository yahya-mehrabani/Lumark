import { SlugTracker, slugify } from '../rendering/utils/slugify';
import { TocItem, TocNode, HeadingLevel } from './types';

/**
 * Strips common inline Markdown formatting to extract readable plain text for TOC labels.
 */
export function cleanMarkdownHeadingText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText.trim();

  // Strip leading ATX hashes: "## Title" -> "Title"
  text = text.replace(/^#{1,6}\s+/, '');

  // Strip trailing ATX closing hashes: "Title ##" -> "Title"
  text = text.replace(/\s+#+\s*$/, '');

  // Strip HTML tags: "<b>Title</b>" -> "Title"
  text = text.replace(/<[^>]+>/g, '');

  // Replace Markdown images: "![alt](url)" -> "alt"
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');

  // Replace Markdown links: "[link text](url)" -> "link text"
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // Strip inline code backticks: "`foo`" -> "foo"
  text = text.replace(/`([^`]+)`/g, '$1');

  // Strip bold and italics: "***bold-italic***" -> "bold-italic", "**bold**" -> "bold", etc.
  text = text.replace(/(\*{1,3}|_{1,3})([^*_]+)\1/g, '$2');

  // Strip strikethrough: "~~strike~~" -> "strike"
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Collapse multiple spaces into single space
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extracts headings from raw Markdown text without requiring DOM rendering.
 * Conforms to PRD FR-NAV-001 and Section 5.5.
 * Disambiguates duplicate headings using SlugTracker identical to the rendering pipeline.
 */
export function extractHeadingsFromMarkdown(markdown: string): TocItem[] {
  if (!markdown || !markdown.trim()) {
    return [];
  }

  const tracker = new SlugTracker();
  const items: TocItem[] = [];
  const lines = markdown.split(/\r?\n/);

  let inFencedCode = false;
  let fenceChar = '';
  let fenceLen = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Check for fenced code block toggle
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const matchFence = fenceMatch[1];
      const matchChar = matchFence[0];
      const matchLen = matchFence.length;

      if (!inFencedCode) {
        inFencedCode = true;
        fenceChar = matchChar;
        fenceLen = matchLen;
        continue;
      } else if (matchChar === fenceChar && matchLen >= fenceLen) {
        inFencedCode = false;
        fenceChar = '';
        fenceLen = 0;
        continue;
      }
    }

    if (inFencedCode) {
      continue;
    }

    // 2. ATX Headings: # Heading through ###### Heading
    const atxMatch = line.match(/^ {0,3}(#{1,6})\s+(.+)$/);
    if (atxMatch) {
      const level = atxMatch[1].length as HeadingLevel;
      const rawText = atxMatch[2];
      const cleanText = cleanMarkdownHeadingText(rawText);

      if (cleanText) {
        // Disambiguate slug using SlugTracker
        const id = tracker.slug(cleanText);
        items.push({ id, text: cleanText, level });
      }
      continue;
    }

    // 3. Setext Headings (level 1 ===, level 2 ---)
    if (i > 0 && trimmed.length >= 3) {
      const prevLine = lines[i - 1].trim();
      // Prev line must not be empty or a heading or block element
      if (prevLine && !prevLine.startsWith('#') && !prevLine.startsWith('```') && !prevLine.startsWith('~~~')) {
        let setextLevel: HeadingLevel | null = null;
        if (/^={3,}$/.test(trimmed)) {
          setextLevel = 1;
        } else if (/^-{3,}$/.test(trimmed)) {
          setextLevel = 2;
        }

        if (setextLevel) {
          const cleanText = cleanMarkdownHeadingText(prevLine);
          if (cleanText) {
            const id = tracker.slug(cleanText);
            items.push({ id, text: cleanText, level: setextLevel });
          }
          continue;
        }
      }
    }

    // 4. HTML Headings: <h1 id="...">Heading</h1>
    const htmlHeadingMatch = line.match(/<h([1-6])(?:\s+[^>]*)?>(.*?)<\/h\1>/i);
    if (htmlHeadingMatch) {
      const level = parseInt(htmlHeadingMatch[1], 10) as HeadingLevel;
      const innerHtml = htmlHeadingMatch[2];
      const cleanText = cleanMarkdownHeadingText(innerHtml);

      if (cleanText) {
        // Check for explicit id attribute in the opening tag
        const idMatch = line.match(/<h[1-6][^>]*\bid=["']([^"']+)["']/i);
        const explicitId = idMatch ? idMatch[1] : undefined;
        const id = tracker.slug(cleanText, explicitId);
        items.push({ id, text: cleanText, level });
      }
    }
  }

  return items;
}

/**
 * Extracts headings from a rendered DOM container.
 * Excludes hidden elements, aria-hidden anchors, and elements with no visible text.
 */
export function extractHeadingsFromElement(container: HTMLElement | null): TocItem[] {
  if (!container) {
    return [];
  }

  const headings = container.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6');
  const items: TocItem[] = [];
  const seenElements = new Set<HTMLElement>();

  headings.forEach((el) => {
    if (seenElements.has(el)) return;
    seenElements.add(el);

    // Skip hidden headings
    if (
      el.getAttribute('aria-hidden') === 'true' ||
      el.offsetParent === null && el.style.display === 'none'
    ) {
      return;
    }

    const levelNum = parseInt(el.tagName.substring(1), 10);
    if (isNaN(levelNum) || levelNum < 1 || levelNum > 6) {
      return;
    }
    const level = levelNum as HeadingLevel;

    // Clone element to strip the .heading-anchor (#) from the label
    const clone = el.cloneNode(true) as HTMLElement;
    const anchors = clone.querySelectorAll('.heading-anchor, [aria-hidden="true"]');
    anchors.forEach((a) => a.remove());

    const text = (clone.textContent || '').trim();
    if (!text) {
      return;
    }

    const id = el.id || el.getAttribute('data-heading-id') || slugify(text);

    items.push({
      id,
      text,
      level,
    });
  });

  return items;
}

/**
 * Transforms a linear array of TocItems into a hierarchical tree of TocNodes.
 * Accurately nests child headings (e.g. h2 under h1, h3 under h2).
 * Gracefully handles skipped levels (e.g. h1 directly followed by h3).
 */
export function buildTocTree(items: TocItem[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const item of items) {
    const node: TocNode = {
      ...item,
      children: [],
    };

    // Pop items from stack that have level >= current item's level
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level item relative to the current hierarchy
      root.push(node);
    } else {
      // Child of the closest preceding item with a strictly lower level number
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}
