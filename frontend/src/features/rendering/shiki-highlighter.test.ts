import { describe, it, expect, beforeAll } from 'vitest';
import {
  getHighlighter,
  highlightCode,
  tokenizeCode,
  normalizeLanguage,
  isLanguageSupported,
  shouldSkipHighlighting,
  SUPPORTED_LANGUAGES,
  SUPPORTED_THEMES,
  MAX_HIGHLIGHT_CHARS,
  MAX_HIGHLIGHT_LINES,
} from './shiki-highlighter';

describe('Shiki Syntax Highlighter Service (US-010.1)', () => {
  beforeAll(async () => {
    // Warm up the highlighter
    await getHighlighter();
  }, 15000);

  it('initializes highlighter with offline bundled languages and dual themes', async () => {
    const highlighter = await getHighlighter();
    expect(highlighter).toBeDefined();

    expect(SUPPORTED_THEMES).toContain('github-light');
    expect(SUPPORTED_THEMES).toContain('github-dark');

    const loadedThemes = highlighter.getLoadedThemes();
    expect(loadedThemes).toContain('github-light');
    expect(loadedThemes).toContain('github-dark');

    const loadedLangs = highlighter.getLoadedLanguages();
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(loadedLangs).toContain(lang);
    }
  });

  it('normalizes common language names and aliases', () => {
    expect(normalizeLanguage('go')).toBe('go');
    expect(normalizeLanguage('GOLANG')).toBe('go');
    expect(normalizeLanguage('ts')).toBe('typescript');
    expect(normalizeLanguage('typescript')).toBe('typescript');
    expect(normalizeLanguage('js')).toBe('javascript');
    expect(normalizeLanguage('py')).toBe('python');
    expect(normalizeLanguage('python3')).toBe('python');
    expect(normalizeLanguage('rs')).toBe('rust');
    expect(normalizeLanguage('sh')).toBe('bash');
    expect(normalizeLanguage('shell')).toBe('bash');
    expect(normalizeLanguage('yml')).toBe('yaml');
    expect(normalizeLanguage('md')).toBe('markdown');
    expect(normalizeLanguage('unknown_lang')).toBeNull();
    expect(normalizeLanguage(undefined)).toBeNull();
    expect(normalizeLanguage('')).toBeNull();
  });

  it('verifies language support checks', () => {
    expect(isLanguageSupported('go')).toBe(true);
    expect(isLanguageSupported('golang')).toBe(true);
    expect(isLanguageSupported('python')).toBe(true);
    expect(isLanguageSupported('rust')).toBe(true);
    expect(isLanguageSupported('bash')).toBe(true);
    expect(isLanguageSupported('sql')).toBe(true);
    expect(isLanguageSupported('fortran')).toBe(false);
    expect(isLanguageSupported('')).toBe(false);
  });

  it('generates syntax tokens for supported languages with offline bundled grammars', async () => {
    const goCode = 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello Go")\n}';
    const tokensResult = await tokenizeCode(goCode, 'go', 'github-dark');

    expect(tokensResult).toBeDefined();
    expect(tokensResult.tokens.length).toBeGreaterThan(0);

    // Look for keyword token 'package' and string token "Hello Go"
    const allTokens = tokensResult.tokens.flat();
    const packageToken = allTokens.find((t) => t.content === 'package');
    expect(packageToken).toBeDefined();
    expect(packageToken?.color).toBeDefined();

    const stringToken = allTokens.find((t) => t.content.includes('Hello Go'));
    expect(stringToken).toBeDefined();
  });

  it('highlights code with dual themes generating both light and dark styles', async () => {
    const tsCode = 'const greeting: string = "hello";';
    const result = await highlightCode(tsCode, 'ts');

    expect(result.isHighlighted).toBe(true);
    expect(result.normalizedLang).toBe('typescript');
    expect(result.html).toContain('class="shiki shiki-themes github-light github-dark"');
    expect(result.html).toContain('greeting');
    expect(result.html).toContain('--shiki-dark');
  });

  it('falls back to clean escaped plain text for unknown languages', async () => {
    const rawUnknown = 'defun test <script>alert("xss")</script> & unknown;';
    const result = await highlightCode(rawUnknown, 'unknownlang');

    expect(result.isHighlighted).toBe(false);
    expect(result.normalizedLang).toBeNull();
    expect(result.skipReason).toContain('unknownlang');
    expect(result.html).toContain('<pre class="shiki-fallback"><code>');
    expect(result.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; unknown;');
    expect(result.html).not.toContain('<script>');
  });

  it('falls back to clean escaped plain text when no language is specified', async () => {
    const textCode = 'Just some generic log lines\nline 2';
    const result = await highlightCode(textCode, undefined);

    expect(result.isHighlighted).toBe(false);
    expect(result.normalizedLang).toBeNull();
    expect(result.html).toContain('<pre class="shiki-fallback"><code>');
    expect(result.html).toContain('Just some generic log lines\nline 2');
  });

  it('enforces safe size limits to prevent UI freezing (FR-RENDER-003)', async () => {
    // Character limit test
    const hugeCode = 'a'.repeat(MAX_HIGHLIGHT_CHARS + 10);
    const charSkip = shouldSkipHighlighting(hugeCode);
    expect(charSkip.skip).toBe(true);
    expect(charSkip.reason).toContain('exceeds safe limit');

    const charResult = await highlightCode(hugeCode, 'go');
    expect(charResult.isHighlighted).toBe(false);
    expect(charResult.skipReason).toContain('exceeds safe limit');

    // Line limit test
    const manyLines = Array(MAX_HIGHLIGHT_LINES + 5).fill('console.log(1);').join('\n');
    const lineSkip = shouldSkipHighlighting(manyLines);
    expect(lineSkip.skip).toBe(true);
    expect(lineSkip.reason).toContain('Line count');

    const lineResult = await highlightCode(manyLines, 'javascript');
    expect(lineResult.isHighlighted).toBe(false);
    expect(lineResult.skipReason).toContain('Line count');
  });
});
