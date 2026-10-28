import { createHighlighter, type Highlighter, type BundledLanguage, type BundledTheme } from 'shiki';

export const SUPPORTED_LANGUAGES: BundledLanguage[] = [
  'go',
  'typescript',
  'javascript',
  'python',
  'rust',
  'html',
  'css',
  'json',
  'yaml',
  'bash',
  'sql',
  'markdown',
];

export const LANGUAGE_ALIASES: Record<string, BundledLanguage> = {
  golang: 'go',
  ts: 'typescript',
  js: 'javascript',
  py: 'python',
  python3: 'python',
  rs: 'rust',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  xml: 'html',
};

export const SUPPORTED_THEMES: BundledTheme[] = ['github-light', 'github-dark'];

export const DUAL_THEMES = {
  light: 'github-light' as BundledTheme,
  dark: 'github-dark' as BundledTheme,
};

export const MAX_HIGHLIGHT_CHARS = 50000;
export const MAX_HIGHLIGHT_LINES = 2000;

let highlighterPromise: Promise<Highlighter> | null = null;
let cachedHighlighter: Highlighter | null = null;

/**
 * Normalizes input language string (handles aliases, casing, whitespace).
 */
export function normalizeLanguage(lang?: string): BundledLanguage | null {
  if (!lang) return null;
  const cleaned = lang.trim().toLowerCase();
  if (!cleaned) return null;

  if (SUPPORTED_LANGUAGES.includes(cleaned as BundledLanguage)) {
    return cleaned as BundledLanguage;
  }

  if (cleaned in LANGUAGE_ALIASES) {
    return LANGUAGE_ALIASES[cleaned];
  }

  return null;
}

/**
 * Returns true if the language is supported by the offline Shiki highlighter bundle.
 */
export function isLanguageSupported(lang?: string): boolean {
  return normalizeLanguage(lang) !== null;
}

/**
 * Checks whether highlighting should be skipped to prevent UI freezes on very large files (PRD FR-RENDER-003).
 */
export function shouldSkipHighlighting(code: string): { skip: boolean; reason?: string } {
  if (code.length > MAX_HIGHLIGHT_CHARS) {
    return {
      skip: true,
      reason: `Code size (${code.length} characters) exceeds safe limit of ${MAX_HIGHLIGHT_CHARS} characters`,
    };
  }

  const lineCount = code.split('\n').length;
  if (lineCount > MAX_HIGHLIGHT_LINES) {
    return {
      skip: true,
      reason: `Line count (${lineCount} lines) exceeds safe limit of ${MAX_HIGHLIGHT_LINES} lines`,
    };
  }

  return { skip: false };
}

/**
 * Escapes HTML characters for plain text fallback rendering.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Initializes and returns the singleton Shiki highlighter instance with offline grammars.
 */
export async function getHighlighter(): Promise<Highlighter> {
  if (cachedHighlighter) {
    return cachedHighlighter;
  }

  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: SUPPORTED_THEMES,
      langs: SUPPORTED_LANGUAGES,
    }).then((highlighter) => {
      cachedHighlighter = highlighter;
      return highlighter;
    });
  }

  return highlighterPromise;
}

/**
 * Returns the cached highlighter instance if already initialized, or null.
 */
export function getCachedHighlighter(): Highlighter | null {
  return cachedHighlighter;
}

/**
 * Highlights a block of code into HTML with dual light/dark themes.
 * Falls back to plain text if language is unknown, unsupported, or code exceeds safe size limits.
 */
export async function highlightCode(
  code: string,
  lang?: string
): Promise<{ html: string; isHighlighted: boolean; normalizedLang: string | null; skipReason?: string }> {
  const normalizedLang = normalizeLanguage(lang);
  const skipCheck = shouldSkipHighlighting(code);

  if (skipCheck.skip) {
    return {
      html: `<pre class="shiki-fallback"><code>${escapeHtml(code)}</code></pre>`,
      isHighlighted: false,
      normalizedLang,
      skipReason: skipCheck.reason,
    };
  }

  if (!normalizedLang) {
    return {
      html: `<pre class="shiki-fallback"><code>${escapeHtml(code)}</code></pre>`,
      isHighlighted: false,
      normalizedLang: null,
      skipReason: lang ? `Language '${lang}' is not supported` : 'No language specified',
    };
  }

  try {
    const highlighter = await getHighlighter();
    const html = highlighter.codeToHtml(code, {
      lang: normalizedLang,
      themes: DUAL_THEMES,
      defaultColor: false,
    });

    return {
      html,
      isHighlighted: true,
      normalizedLang,
    };
  } catch (error) {
    return {
      html: `<pre class="shiki-fallback"><code>${escapeHtml(code)}</code></pre>`,
      isHighlighted: false,
      normalizedLang,
      skipReason: error instanceof Error ? error.message : 'Highlighting failed',
    };
  }
}

/**
 * Extracts syntax tokens for testing and inspection.
 */
export async function tokenizeCode(code: string, lang: string, theme: BundledTheme = 'github-dark') {
  const normalizedLang = normalizeLanguage(lang);
  if (!normalizedLang) {
    throw new Error(`Cannot tokenize unsupported language: ${lang}`);
  }
  const highlighter = await getHighlighter();
  return highlighter.codeToTokens(code, {
    lang: normalizedLang,
    theme,
  });
}
