import mermaid, { type MermaidConfig } from 'mermaid';
import { sanitizeSvg } from './utils/sanitize-svg';

/**
 * Strict base configuration for offline Mermaid rendering.
 * Enforces PRD Section 8 and FR-RENDER-005 security invariants:
 * - securityLevel: 'strict' (disables script execution and dangerous tags)
 * - startOnLoad: false (manual programmatic rendering only)
 * - suppressErrorRendering: true (prevents Mermaid from writing unhandled error DOM)
 */
export const STRICT_MERMAID_CONFIG: MermaidConfig = {
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  suppressErrorRendering: true,
  logLevel: 'error',
  flowchart: {
    htmlLabels: false,
    useMaxWidth: true,
  },
  sequence: {
    useMaxWidth: true,
  },
  gantt: {
    useMaxWidth: true,
  },
};

let isInitialized = false;
let currentConfig: MermaidConfig = { ...STRICT_MERMAID_CONFIG };
let diagramCounter = 0;

/**
 * Initializes or re-initializes Mermaid with strict security settings.
 * Mandatory security options (securityLevel: 'strict', startOnLoad: false) cannot be overridden.
 */
export function initMermaid(config?: Partial<MermaidConfig>): MermaidConfig {
  const resolvedTheme = config?.theme || (detectAppTheme() as MermaidTheme);
  currentConfig = {
    ...STRICT_MERMAID_CONFIG,
    theme: resolvedTheme,
    ...config,
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
  };

  mermaid.initialize(currentConfig);
  isInitialized = true;
  return { ...currentConfig };
}

export type MermaidTheme = 'default' | 'dark' | 'neutral' | 'forest' | 'base';

/**
 * Detects current application theme from DOM attributes or system preferences.
 */
export function detectAppTheme(): 'dark' | 'default' {
  if (typeof document !== 'undefined') {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme === 'light') return 'default';
    if (htmlTheme === 'dark') return 'dark';
    if (document.body?.classList.contains('theme-light')) return 'default';
    if (document.body?.classList.contains('theme-dark')) return 'dark';
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'default';
    }
  }
  return 'dark';
}

/**
 * Retrieves a snapshot of the current active Mermaid configuration.
 */
export function getMermaidConfig(): MermaidConfig {
  if (!isInitialized) {
    initMermaid();
  }
  return { ...currentConfig };
}

export interface MermaidRenderResult {
  svg: string;
  bindFunctions?: (element: Element) => void;
}

export interface RenderMermaidOptions {
  theme?: MermaidTheme;
  id?: string;
}

/**
 * Renders a Mermaid diagram definition into sanitized SVG.
 * Ensures fault isolation and SVG sanitization.
 */
export async function renderMermaid(
  code: string,
  options?: RenderMermaidOptions
): Promise<MermaidRenderResult> {
  const targetTheme = options?.theme || (detectAppTheme() as MermaidTheme);
  if (!isInitialized || currentConfig.theme !== targetTheme) {
    initMermaid({ theme: targetTheme });
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return { svg: '' };
  }

  const id = options?.id || `mermaid-diagram-${++diagramCounter}`;
  const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    const renderOutput = await mermaid.render(cleanId, trimmedCode);
    const sanitizedSvg = sanitizeSvg(renderOutput.svg);

    return {
      svg: sanitizedSvg,
      bindFunctions: renderOutput.bindFunctions,
    };
  } catch (err) {
    // Clean up temporary DOM artifacts inserted by Mermaid if render throws
    const errorEl = document.getElementById(cleanId) || document.getElementById(`d${cleanId}`);
    if (errorEl) {
      errorEl.remove();
    }
    throw err;
  }
}

/**
 * Validates Mermaid diagram syntax without DOM rendering.
 */
export async function parseMermaid(code: string): Promise<boolean> {
  if (!isInitialized) {
    initMermaid();
  }
  const result = await mermaid.parse(code.trim());
  return Boolean(result);
}

export default {
  initMermaid,
  getMermaidConfig,
  renderMermaid,
  parseMermaid,
  STRICT_MERMAID_CONFIG,
};
