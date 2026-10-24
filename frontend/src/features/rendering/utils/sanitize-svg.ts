/**
 * SVG Sanitizer Utility
 * Strips script tags, interactive event handlers (on*), and dangerous href schemes
 * from SVG strings to enforce SEC-INVAR-07 and PRD Section 8 security invariants.
 */

const DANGEROUS_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'link',
  'meta',
  'base',
]);

const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data:text\/html):/i;

export function sanitizeSvg(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') {
    return '';
  }

  // Ensure DOMParser is available (browser and jsdom environments)
  if (typeof DOMParser === 'undefined') {
    return svgContent;
  }

  const parser = new DOMParser();
  let doc: Document;

  try {
    doc = parser.parseFromString(svgContent, 'image/svg+xml');
  } catch {
    // If XML parsing fails, return empty string for safety
    return '';
  }

  // Check for XML parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return '';
  }

  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') {
    return '';
  }

  // Recursive element sanitizer
  function sanitizeElement(element: Element) {
    const tagName = element.tagName.toLowerCase();

    // Remove prohibited elements
    if (DANGEROUS_TAGS.has(tagName)) {
      element.remove();
      return;
    }

    // Inspect attributes
    const attributes = Array.from(element.attributes);
    for (const attr of attributes) {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value.trim().replace(/[\u0000-\u001F\u007F-\u009F\s]+/g, '');

      // Strip any inline event handlers (onclick, onload, onerror, onmouseover, etc.)
      if (attrName.startsWith('on')) {
        element.removeAttribute(attr.name);
        continue;
      }

      // Check href and xlink:href for script-based protocols
      if (attrName === 'href' || attrName === 'xlink:href') {
        if (DANGEROUS_PROTOCOLS.test(attrValue)) {
          element.removeAttribute(attr.name);
        }
      }
    }

    // Recursively sanitize all children
    const children = Array.from(element.children);
    for (const child of children) {
      sanitizeElement(child);
    }
  }

  sanitizeElement(root);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(root);
}
