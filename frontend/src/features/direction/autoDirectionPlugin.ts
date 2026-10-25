import type { Root as HastRoot, Element as HastElement, Node as HastNode } from 'hast';

/**
 * Default textual block elements that receive automatic direction (PRD FR-DIR-001).
 * Blocks include paragraphs, headings (h1-h6), list items, blockquotes, table cells, and captions.
 */
export const DEFAULT_AUTO_DIR_TAGS: ReadonlySet<string> = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'blockquote',
  'td',
  'th',
  'caption',
]);

export interface RehypeAutoDirectionOptions {
  tags?: Iterable<string>;
  defaultDir?: 'auto' | 'rtl' | 'ltr';
}

/**
 * Rehype plugin that attaches `dir="auto"` to textual block elements
 * in the Markdown HAST tree (US-017.2 / FR-DIR-001).
 *
 * Preserves existing explicit author `dir` attributes (US-018 / FR-DIR-002).
 */
export function rehypeAutoDirection(options: RehypeAutoDirectionOptions = {}) {
  const targetTags = options.tags ? new Set(options.tags) : DEFAULT_AUTO_DIR_TAGS;
  const dirValue = options.defaultDir || 'auto';

  return (tree: HastRoot): void => {
    function visit(node: HastNode): void {
      if (!node || !('children' in node)) return;

      const children = (node as HastElement | HastRoot).children;
      if (!Array.isArray(children)) return;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type === 'element') {
          if (targetTags.has(child.tagName)) {
            if (!child.properties) {
              child.properties = {};
            }
            // Preserve explicit author markup if dir attribute is already present
            if (!child.properties.dir) {
              child.properties.dir = dirValue;
            }
          }
          visit(child);
        }
      }
    }

    visit(tree);
  };
}

export default rehypeAutoDirection;
