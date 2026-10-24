import postcss from 'postcss';
import type { Root, Rule, AtRule, Declaration } from 'postcss';
import type { Root as HastRoot, Element as HastElement, Text as HastText } from 'hast';

/**
 * Default container scoping selector.
 * Conforms to PRD Section 7.4, 8.1, 8.2 and ADR-0003.
 */
export const DEFAULT_SCOPE_SELECTOR = '.markdown-content';

/**
 * Baseline safe CSS property allowlist.
 * Conforms to PRD Section 7.4 & ADR-0003.
 */
export const ALLOWED_CSS_PROPERTIES: ReadonlySet<string> = new Set([
  'direction',
  'text-align',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'font-variant',
  'line-height',
  'color',
  'background',
  'background-color',
  'background-image',
  'background-repeat',
  'background-position',
  'background-size',
  'border',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-left-radius',
  'border-bottom-right-radius',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'width',
  'max-width',
  'min-width',
  'height',
  'max-height',
  'min-height',
  'display',
  'box-sizing',
  'text-decoration',
  'text-overflow',
  'text-transform',
  'text-indent',
  'white-space',
  'overflow',
  'overflow-x',
  'overflow-y',
  'opacity',
  'vertical-align',
  'word-break',
  'word-wrap',
  'overflow-wrap',
  'letter-spacing',
  'cursor',
  'list-style',
  'list-style-type',
  'table-layout',
  'border-collapse',
  'border-spacing',
  'position',
  'top',
  'bottom',
  'left',
  'right',
  'z-index',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'flex-direction',
  'flex-wrap',
  'flex-flow',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'gap',
  'row-gap',
  'column-gap',
  'grid-template-columns',
  'grid-template-rows',
  'grid-gap',
]);

/**
 * Strips dangerous at-rules, scopes selectors to container, and cleans declarations.
 */
function processCssRoot(root: Root, scopePrefix: string): void {
  // 1. Strip all at-rules (@import, @font-face, @keyframes, @media, etc.)
  root.walkAtRules((atRule: AtRule) => {
    atRule.remove();
  });

  // 2. Walk rules to scope selectors and sanitize declarations
  root.walkRules((rule: Rule) => {
    // Scope selectors
    if (rule.selectors && rule.selectors.length > 0) {
      const scopedSelectors = rule.selectors.map((sel) => {
        const trimmed = sel.trim();
        if (trimmed === 'body' || trimmed === 'html' || trimmed === ':root') {
          return scopePrefix;
        }
        if (trimmed.startsWith(scopePrefix)) {
          return trimmed;
        }
        return `${scopePrefix} ${trimmed}`;
      });
      rule.selector = scopedSelectors.join(', ');
    }

    // Sanitize declarations
    rule.walkDecls((decl: Declaration) => {
      sanitizeDeclaration(decl);
    });

    // Remove empty rule if all declarations were stripped
    if (rule.nodes && rule.nodes.length === 0) {
      rule.remove();
    }
  });
}

/**
 * Sanitizes an individual CSS declaration:
 * - Checks property against allowlist
 * - Neutralizes position: fixed to absolute (AC 5)
 * - Strips position: sticky
 * - Clamps z-index to max 10
 * - Strips remote url(), expressions, behaviors, javascript:
 */
function sanitizeDeclaration(decl: Declaration): void {
  const prop = decl.prop.toLowerCase();
  const value = decl.value.trim();

  // Check property allowlist
  if (!ALLOWED_CSS_PROPERTIES.has(prop)) {
    decl.remove();
    return;
  }

  // Reject executable or remote values
  const lowerVal = value.toLowerCase();
  if (
    lowerVal.includes('expression(') ||
    lowerVal.includes('javascript:') ||
    lowerVal.includes('-moz-binding') ||
    lowerVal.includes('behavior:')
  ) {
    decl.remove();
    return;
  }

  // Reject url() to prevent remote resource fetching or network leaks
  if (lowerVal.includes('url(')) {
    decl.remove();
    return;
  }

  // Handle position property
  if (prop === 'position') {
    if (lowerVal === 'fixed') {
      // AC 5: convert position: fixed to absolute to prevent full-viewport overlays
      decl.value = 'absolute';
    } else if (lowerVal === 'sticky') {
      decl.remove();
      return;
    }
  }

  // Handle z-index property (clamp to max 10)
  if (prop === 'z-index') {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      decl.remove();
      return;
    }
    if (parsed > 10) {
      decl.value = '10';
    }
  }
}

/**
 * Sanitizes and scopes CSS source text.
 * Gracefully handles syntax errors by returning an empty string without crashing (AUD-010).
 *
 * @param css Raw CSS string
 * @param scopePrefix Container selector (defaults to .markdown-content)
 * @returns Sanitized and scoped CSS string
 */
export function sanitizeCss(css: string, scopePrefix: string = DEFAULT_SCOPE_SELECTOR): string {
  if (!css || typeof css !== 'string' || !css.trim()) {
    return '';
  }

  try {
    const root = postcss.parse(css);
    processCssRoot(root, scopePrefix);
    return root.toString().trim();
  } catch {
    // Graceful degradation for unparseable CSS: return empty string
    return '';
  }
}

/**
 * Sanitizes an inline style attribute value (e.g. "color: red; position: fixed;").
 *
 * @param inlineStyle Raw style attribute string
 * @returns Sanitized inline style declarations
 */
export function sanitizeInlineStyle(inlineStyle: string): string {
  if (!inlineStyle || typeof inlineStyle !== 'string' || !inlineStyle.trim()) {
    return '';
  }

  try {
    const root = postcss.parse(`__dummy__ { ${inlineStyle} }`);
    const validDecls: string[] = [];

    root.walkDecls((decl: Declaration) => {
      sanitizeDeclaration(decl);
      if (decl.parent) {
        validDecls.push(`${decl.prop}: ${decl.value}`);
      }
    });

    return validDecls.join('; ');
  } catch {
    return '';
  }
}

/**
 * Rehype plugin to sanitize embedded <style> blocks and inline style attributes in Hast.
 */
export function rehypeScopedCss(options: { scopePrefix?: string } = {}) {
  const scopePrefix = options.scopePrefix || DEFAULT_SCOPE_SELECTOR;

  return (tree: HastRoot): void => {
    function visit(node: HastElement | HastRoot): void {
      if (!node || !('children' in node)) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (child.type === 'element') {
          // 1. Process <style> blocks
          if (child.tagName === 'style') {
            const textNode = child.children.find((c): c is HastText => c.type === 'text');
            if (textNode) {
              const sanitized = sanitizeCss(textNode.value, scopePrefix);
              textNode.value = sanitized;
            }
          }

          // 2. Process inline style attributes
          if (child.properties && child.properties.style) {
            const rawStyle = String(child.properties.style);
            const sanitizedStyle = sanitizeInlineStyle(rawStyle);
            if (sanitizedStyle) {
              child.properties.style = sanitizedStyle;
            } else {
              delete child.properties.style;
            }
          }

          visit(child);
        }
      }
    }

    visit(tree);
  };
}
