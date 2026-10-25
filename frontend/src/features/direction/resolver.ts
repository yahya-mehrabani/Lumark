import postcss, { type Rule } from 'postcss';
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

export type TextDirection = 'rtl' | 'ltr' | 'auto';

export interface ScopedCssDirectionRule {
  direction?: 'rtl' | 'ltr';
  textAlign?: string;
}

export interface DirectionResolverOptions {
  tags?: Iterable<string>;
  defaultDir?: 'auto' | 'rtl' | 'ltr';
}

/**
 * Extracts class names from an element's `className` or `class` property.
 */
export function getNodeClasses(node: HastElement): string[] {
  const classes: string[] = [];
  const props = node.properties as Record<string, unknown> | undefined;
  if (!props) return classes;

  const className = props.className;
  if (Array.isArray(className)) {
    classes.push(...className.map(String));
  } else if (typeof className === 'string') {
    classes.push(...className.split(/\s+/));
  }

  const classAttr = props.class;
  if (typeof classAttr === 'string') {
    classes.push(...classAttr.split(/\s+/));
  } else if (Array.isArray(classAttr)) {
    classes.push(...classAttr.map(String));
  }
  return classes.filter(Boolean);
}

/**
 * Checks node properties for an explicit `dir` attribute or inline `style` direction.
 * Conforms to PRD FR-DIR-002 and US-018.1.
 */
export function resolveExplicitDir(properties?: Record<string, any>): TextDirection | undefined {
  if (!properties) return undefined;

  // 1. Check explicit dir attribute (case-insensitive)
  if (properties.dir != null) {
    const rawDir = String(properties.dir).trim().toLowerCase();
    if (rawDir === 'rtl' || rawDir === 'ltr' || rawDir === 'auto') {
      return rawDir as TextDirection;
    }
  }

  // 2. Check inline style direction declaration
  if (properties.style != null) {
    const rawStyle = String(properties.style).toLowerCase();
    const match = /direction\s*:\s*(rtl|ltr)/i.exec(rawStyle);
    if (match) {
      return match[1].toLowerCase() as TextDirection;
    }
  }

  return undefined;
}

/**
 * Parses CSS text from embedded <style> elements to extract class-level direction rules.
 * Conforms to PRD FR-DIR-003 and US-018.2.
 */
export function parseCssDirectionRules(cssText: string): Map<string, ScopedCssDirectionRule> {
  const classRules = new Map<string, ScopedCssDirectionRule>();
  if (!cssText || !cssText.trim()) return classRules;

  try {
    const root = postcss.parse(cssText);
    root.walkRules((rule: Rule) => {
      let direction: 'rtl' | 'ltr' | undefined;
      let textAlign: string | undefined;

      rule.walkDecls((decl) => {
        const prop = decl.prop.toLowerCase();
        const val = decl.value.replace(/\s*!important/i, '').trim().toLowerCase();
        if (prop === 'direction') {
          if (val === 'rtl' || val === 'ltr') {
            direction = val;
          }
        } else if (prop === 'text-align') {
          textAlign = val;
        }
      });

      if (direction || textAlign) {
        const selectors = rule.selectors || [rule.selector];
        for (const sel of selectors) {
          const matches = sel.matchAll(/\.([a-zA-Z0-9_-]+)/g);
          for (const match of matches) {
            const className = match[1];
            // Skip top-level container scope selector
            if (className === 'markdown-content' || className === 'markdown-viewport') continue;

            const existing = classRules.get(className) || {};
            classRules.set(className, {
              direction: direction || existing.direction,
              textAlign: textAlign || existing.textAlign,
            });
          }
        }
      }
    });
  } catch {
    // Graceful error handling for malformed CSS
  }

  return classRules;
}

/**
 * Traverses Hast tree to extract all scoped CSS direction rules from <style> blocks.
 */
export function extractScopedCssDirections(tree: HastRoot): Map<string, ScopedCssDirectionRule> {
  const combinedRules = new Map<string, ScopedCssDirectionRule>();

  function findStyleNodes(node: HastNode): void {
    if (!node || !('children' in node)) return;
    const parent = node as HastElement | HastRoot;
    if (!Array.isArray(parent.children)) return;

    for (const child of parent.children) {
      if (child.type === 'element' && child.tagName === 'style') {
        const textNode = child.children.find((c) => c.type === 'text');
        if (textNode && typeof textNode.value === 'string') {
          const rules = parseCssDirectionRules(textNode.value);
          rules.forEach((val, key) => combinedRules.set(key, val));
        }
      }
      findStyleNodes(child);
    }
  }

  findStyleNodes(tree);
  return combinedRules;
}

/**
 * Rehype plugin that resolves direction according to strict precedence (US-018 / PRD Section 16):
 * 1. Explicit author HTML `dir` attribute or inline CSS `direction` on the element.
 * 2. Scoped author CSS class direction from embedded <style> blocks.
 * 3. Inherited explicit direction from an ancestor element.
 * 4. Automatic block-level strong character detection (`dir="auto"`) on un-directed textual blocks.
 */
export function rehypeDirectionResolver(options: DirectionResolverOptions = {}) {
  const targetTags = options.tags ? new Set(options.tags) : DEFAULT_AUTO_DIR_TAGS;
  const defaultDir = options.defaultDir || 'auto';

  return (tree: HastRoot): void => {
    // 1. Extract scoped CSS direction rules from all <style> elements
    const cssRules = extractScopedCssDirections(tree);

    // 2. Walk AST maintaining inherited direction
    function visit(node: HastNode, inheritedExplicitDir?: TextDirection): void {
      if (!node || !('children' in node)) return;
      const parent = node as HastElement | HastRoot;
      if (!Array.isArray(parent.children)) return;

      for (let i = 0; i < parent.children.length; i++) {
        const child = parent.children[i];
        if (child.type === 'element') {
          if (!child.properties) {
            child.properties = {};
          }

          let currentExplicitDir: TextDirection | undefined = undefined;

          // Check 1: Explicit HTML dir attribute or inline style direction
          const directExplicit = resolveExplicitDir(child.properties);
          if (directExplicit) {
            currentExplicitDir = directExplicit;
            child.properties.dir = directExplicit;
          } else {
            // Check 2: Scoped CSS class direction
            const classes = getNodeClasses(child);
            for (const cls of classes) {
              const rule = cssRules.get(cls);
              if (rule?.direction) {
                currentExplicitDir = rule.direction;
                child.properties.dir = rule.direction;
                break;
              }
            }
          }

          let nextInheritedDir: TextDirection | undefined = inheritedExplicitDir;

          if (currentExplicitDir) {
            if (currentExplicitDir === 'auto') {
              // Explicit dir="auto" on this element resets inherited explicit container direction
              nextInheritedDir = undefined;
            } else {
              // Explicit dir="rtl" or "ltr" cascades to descendants
              nextInheritedDir = currentExplicitDir;
            }
          } else if (inheritedExplicitDir) {
            // Child is inside an explicitly directed container (e.g. <div dir="rtl">);
            // It naturally inherits that direction in CSS/HTML without dir="auto" interference
            nextInheritedDir = inheritedExplicitDir;
          } else {
            // Un-directed textual block element: assign default direction (auto)
            if (targetTags.has(child.tagName)) {
              child.properties.dir = defaultDir;
            }
            nextInheritedDir = undefined;
          }

          visit(child, nextInheritedDir);
        }
      }
    }

    visit(tree);
  };
}

export default rehypeDirectionResolver;
