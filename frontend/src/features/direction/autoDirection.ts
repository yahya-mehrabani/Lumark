/**
 * Unicode Automatic Direction Detection Engine (US-017 / FR-DIR-001)
 *
 * Implements block-level automatic text direction detection based on
 * the Unicode Bidirectional Algorithm (UBA / UAX #9 Rule P2):
 * 1. Skips leading neutral and weak characters (spaces, punctuation, digits, emojis, symbols).
 * 2. Finds the first strong directional character.
 * 3. Arabic, Persian, Hebrew, Syriac, Thaana, N'Ko, Samaritan, Mandaic letters resolve to 'rtl'.
 * 4. Latin, Greek, Cyrillic, CJK, and other script letters resolve to 'ltr'.
 * 5. If no strong directional character is found, resolves to the configured fallback (default 'ltr').
 */

export type Direction = 'rtl' | 'ltr';

// Regular expression matching strong Right-to-Left scripts (Arabic, Hebrew, Syriac, Thaana, N'Ko, Samaritan, Mandaic)
export const RTL_SCRIPT_REGEX =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}]/u;

// Regular expression matching any Unicode Letter
export const UNICODE_LETTER_REGEX = /\p{L}/u;

export interface DetectDirectionOptions {
  fallback?: Direction | null;
  stripHtml?: boolean;
}

/**
 * Strips HTML tags from text while preserving inner character sequences.
 */
export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Detects the direction of a text string based on the first strong directional character.
 *
 * @param text The input text string to evaluate.
 * @param options Configuration options for fallback direction and HTML tag stripping.
 * @returns 'rtl' if the first strong character is RTL, 'ltr' if LTR, or fallback if neither.
 */
export function detectFirstStrongDirection(
  text: string,
  options?: DetectDirectionOptions
): Direction | null {
  const fallback = options?.fallback !== undefined ? options.fallback : null;
  const shouldStripHtml = options?.stripHtml !== false;
  const cleanText = shouldStripHtml ? stripHtmlTags(text) : text;

  // Iterate over full Unicode code points (properly handling surrogate pairs / astral plane characters)
  for (const char of cleanText) {
    if (UNICODE_LETTER_REGEX.test(char)) {
      return RTL_SCRIPT_REGEX.test(char) ? 'rtl' : 'ltr';
    }
  }

  return fallback;
}

/**
 * Convenience helper returning guaranteed Direction ('rtl' | 'ltr') with default 'ltr'.
 */
export function getTextDirection(
  text: string,
  fallback: Direction = 'ltr'
): Direction {
  return detectFirstStrongDirection(text, { fallback }) ?? fallback;
}

/**
 * Checks if a text string has RTL direction based on first strong character.
 */
export function isRtlText(text: string): boolean {
  return detectFirstStrongDirection(text) === 'rtl';
}
