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

  if (!('getTotalLength' in SVGElement.prototype)) {
    (SVGElement.prototype as any).getTotalLength = function () {
      return 100;
    };
  }

  if (!('getPointAtLength' in SVGElement.prototype)) {
    (SVGElement.prototype as any).getPointAtLength = function (len: number) {
      return { x: len, y: len };
    };
  }
}

if (typeof SVGPathElement !== 'undefined') {
  if (!('getTotalLength' in SVGPathElement.prototype)) {
    (SVGPathElement.prototype as any).getTotalLength = function () {
      return 100;
    };
  }
  if (!('getPointAtLength' in SVGPathElement.prototype)) {
    (SVGPathElement.prototype as any).getPointAtLength = function (len: number) {
      return { x: len, y: len };
    };
  }
}

if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = function () {};
}
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = function () {};
}
