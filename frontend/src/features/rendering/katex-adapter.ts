import katex, { type KatexOptions } from 'katex';

/**
 * Strict base configuration for offline KaTeX math rendering.
 * Enforces PRD Section 8 and FR-RENDER-006 invariants:
 * - throwOnError: false (graceful inline fallback rather than unhandled crash)
 * - output: 'htmlAndMathml' (preserves MathML for accessibility while rendering rich HTML)
 * - trust: false (disables dangerous commands/protocols in untrusted Markdown)
 * - strict: false (permits common LaTeX math constructs without strict warnings)
 */
export const STRICT_KATEX_OPTIONS: KatexOptions = {
  displayMode: false,
  throwOnError: false,
  errorColor: '#cc0000',
  output: 'htmlAndMathml',
  strict: false,
  trust: false,
};

/**
 * Helper to escape HTML characters in raw error fallback output.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Options accepted by renderMath.
 */
export interface RenderMathOptions extends Partial<KatexOptions> {
  displayMode?: boolean;
}

/**
 * Renders LaTeX math into safe, accessible HTML/MathML string offline.
 *
 * @param latex The mathematical formula text (without outer $ or $$ delimiters)
 * @param options Optional overrides for KaTeX rendering
 * @returns Generated HTML string containing MathML and HTML presentation layers
 */
export function renderMath(latex: string, options?: RenderMathOptions): string {
  const trimmed = (latex || '').trim();
  if (!trimmed) {
    return '';
  }

  const mergedOptions: KatexOptions = {
    ...STRICT_KATEX_OPTIONS,
    ...options,
  };

  try {
    return katex.renderToString(trimmed, mergedOptions);
  } catch (err: unknown) {
    if (mergedOptions.throwOnError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    return `<span class="katex-error" title="${escapeHtml(message)}">${escapeHtml(trimmed)}</span>`;
  }
}

/**
 * Checks whether a given LaTeX formula string is syntactically valid according to KaTeX.
 *
 * @param latex The mathematical formula text
 * @param options Optional overrides
 * @returns true if formula parses cleanly without error
 */
export function isMathValid(latex: string, options?: RenderMathOptions): boolean {
  const trimmed = (latex || '').trim();
  if (!trimmed) {
    return true;
  }

  try {
    katex.renderToString(trimmed, {
      ...STRICT_KATEX_OPTIONS,
      ...options,
      throwOnError: true,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Renders LaTeX math directly into a DOM element.
 */
export function renderMathToElement(
  latex: string,
  element: HTMLElement,
  options?: RenderMathOptions
): void {
  const trimmed = (latex || '').trim();
  if (!trimmed) {
    element.innerHTML = '';
    return;
  }

  const mergedOptions: KatexOptions = {
    ...STRICT_KATEX_OPTIONS,
    ...options,
  };

  try {
    katex.render(trimmed, element, mergedOptions);
  } catch (err: unknown) {
    if (mergedOptions.throwOnError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    element.innerHTML = `<span class="katex-error" title="${escapeHtml(message)}">${escapeHtml(trimmed)}</span>`;
  }
}

export default {
  renderMath,
  isMathValid,
  renderMathToElement,
  STRICT_KATEX_OPTIONS,
};
