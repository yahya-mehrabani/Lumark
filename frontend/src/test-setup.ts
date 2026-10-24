import '@testing-library/jest-dom/vitest';

// Polyfill SVG layout methods for jsdom environment if missing
if (typeof SVGElement !== 'undefined') {
  if (!('getBBox' in SVGElement.prototype)) {
    (SVGElement.prototype as any).getBBox = function () {
      return {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
      };
    };
  }

  if (!('getComputedTextLength' in SVGElement.prototype)) {
    (SVGElement.prototype as any).getComputedTextLength = function () {
      return (this.textContent || '').length * 8;
    };
  }
}
