import { visit } from 'unist-util-visit';
import type { Root, Text, Literal } from 'mdast';

export interface InlineMathNode extends Literal {
  type: 'inlineMath';
  value: string;
}

/**
 * Preprocesses markdown text to escape isolated currency dollar signs (e.g. $10, $5.00, $100)
 * outside of code blocks and display math blocks so that CommonMark parses them as literal dollars
 * rather than math opening delimiters.
 */
export function escapeCurrencyDollars(markdown: string): string {
  if (!markdown || !markdown.includes('$')) {
    return markdown;
  }

  // Preserve fenced code blocks, inline code, and display math blocks
  const parts = markdown.split(/(```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]*?\$\$)/g);
  for (let i = 0; i < parts.length; i += 2) {
    // Only prose parts (even indices)
    parts[i] = parts[i].replace(
      /(^|[^\\])\$(\d+([.,]\d+)?(?=[\s,.;:!?)]|$))/g,
      (_match, p1, p2) => `${p1}\\$${p2}`
    );
  }
  return parts.join('');
}

/**
 * Remark plugin to enforce strict LaTeX spacing rules and currency avoidance.
 *
 * Requirements:
 * - PRD FR-RENDER-006: Ordinary dollar signs in prose are not incorrectly converted to math.
 * - Story US-014 AC 3 & Task US-014.3: Text like "$10 and $20" or "$100 and $200" remains plain prose.
 *
 * Rules:
 * 1. An inline math formula must not start or end with whitespace (e.g. '$ a $' or '$10 and $').
 * 2. Pure currency numbers/amounts (e.g. '$100$') are preserved as plain text.
 * 3. When an accidental match occurs, the node is reverted to a standard mdast 'text' node.
 */
export function remarkStrictMath() {
  return (tree: Root) => {
    visit(tree, 'inlineMath', (node: unknown, index, parent) => {
      if (typeof index !== 'number' || !parent) return;

      const mathNode = node as InlineMathNode;
      const val = mathNode.value || '';

      // Strict spacing check: LaTeX inline math must not have whitespace immediately inside delimiters
      const hasLeadingOrTrailingSpace = val.startsWith(' ') || val.endsWith(' ');

      // Currency pattern: digits with optional commas/decimals
      const isLikelyCurrency = /^\s*[\d,.]+\s*$/.test(val);

      if (hasLeadingOrTrailingSpace || isLikelyCurrency) {
        const textNode: Text = {
          type: 'text',
          value: `$${val}$`,
        };
        const parentNode = parent as { children: unknown[] };
        parentNode.children[index] = textNode;
      }
    });
  };
}

export default remarkStrictMath;
