import { defaultSchema } from 'rehype-sanitize';
import type { Options } from 'rehype-sanitize';

/**
 * Custom Rehype-Sanitize Schema Allowlist for Lumark.
 * Conforms to PRD Section 7.3, 7.4, 8.1, 8.2, ADR-0003, and Story US-015.
 *
 * Enforces:
 * 1. Allowlist of safe semantic tags (h1-h6, p, div, span, table, lists, etc., plus <style> and MathML).
 * 2. Complete stripping of active executable elements (<script>, <iframe>, <object>, <embed>, <form>, <base>, <meta>).
 * 3. Stripping of all inline event handler attributes (onclick, onerror, onload, etc.).
 * 4. Permitted safe attributes on all elements (dir, lang, className, class, style, id, title, role, aria-*).
 * 5. Safe URL schemes (http, https, mailto, etc. for links; http, https, data, local-asset for images).
 */
export const SANITY_HTML_SCHEMA: Options = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'style',
    'mark',
    'figure',
    'figcaption',
    // MathML elements for offline KaTeX / math rendering
    'math',
    'semantics',
    'mrow',
    'mi',
    'mo',
    'mn',
    'msup',
    'msub',
    'msubsup',
    'mfrac',
    'msqrt',
    'mroot',
    'munder',
    'mover',
    'munderover',
    'mtable',
    'mtr',
    'mtd',
    'mtext',
    'mspace',
    'annotation',
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] || []),
      'dir',
      'lang',
      'className',
      'class',
      'style',
      'title',
      'role',
      'ariaLabel',
      'ariaHidden',
      'ariaDescribedBy',
      'ariaLabelledBy',
    ],
    style: ['type', 'media'],
    math: ['xmlns', 'display'],
    annotation: ['encoding'],
    mo: ['stretchy', 'fence', 'separator'],
    a: [
      ...((defaultSchema.attributes?.a || []).filter(
        (attr) => !Array.isArray(attr) || attr[0] !== 'className'
      )),
      'className',
      'class',
      'href',
      'title',
      'ariaLabel',
      'ariaDescribedBy',
    ],
    h2: [
      ...((defaultSchema.attributes?.h2 || []).filter(
        (attr) => !Array.isArray(attr) || attr[0] !== 'className'
      )),
      'className',
      'class',
    ],
    li: [
      ...((defaultSchema.attributes?.li || []).filter(
        (attr) => !Array.isArray(attr) || attr[0] !== 'className'
      )),
      'className',
      'class',
    ],
    ol: [
      ...((defaultSchema.attributes?.ol || []).filter(
        (attr) => !Array.isArray(attr) || attr[0] !== 'className'
      )),
      'className',
      'class',
    ],
    ul: [
      ...((defaultSchema.attributes?.ul || []).filter(
        (attr) => !Array.isArray(attr) || attr[0] !== 'className'
      )),
      'className',
      'class',
    ],
    section: [
      ...((defaultSchema.attributes?.section || []).filter(
        (attr) => !Array.isArray(attr) || attr[0] !== 'className'
      )),
      'className',
      'class',
    ],
  },
  ancestors: {
    ...defaultSchema.ancestors,
    input: ['li'], // strictly allow <input> only within <li> for GFM task lists
  },
  required: {
    ...defaultSchema.required,
    input: {
      type: 'checkbox',
      disabled: true,
    },
  },
  strip: [
    ...(defaultSchema.strip || []),
    'script',
    'iframe',
    'object',
    'embed',
    'form',
    'base',
    'meta',
    'link',
    'noscript',
    'template',
  ],
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'irc', 'ircs', 'xmpp'],
    src: ['http', 'https', 'data', 'local-asset'],
  },
};
