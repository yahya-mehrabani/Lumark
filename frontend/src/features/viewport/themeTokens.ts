/**
 * WCAG AA-Compliant Theme Tokens and Contrast Calculation Utilities
 * Source: PRD Section 5.7, FR-NAV-004, and Story US-023 (Task US-023.1)
 */

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgSurface: string;
  bgCode: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  borderStrong: string;
  linkColor: string;
  linkHover: string;
  accent: string;
  accentHover: string;
  focusRing: string;
  chromeBg: string;
  chromeBorder: string;
}

export const LIGHT_THEME_TOKENS: ThemeColors = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgTertiary: '#f1f5f9',
  bgSurface: '#ffffff',
  bgCode: '#f6f8fa',
  textPrimary: '#0f172a',    // slate-900 (Luminance ~ 0.013 -> Contrast vs #ffffff = ~15.6:1)
  textSecondary: '#334155',  // slate-700 (Luminance ~ 0.059 -> Contrast vs #ffffff = ~9.6:1)
  textMuted: '#475569',      // slate-600 (Luminance ~ 0.104 -> Contrast vs #ffffff = ~6.8:1)
  borderSubtle: '#e2e8f0',   // slate-200
  borderStrong: '#cbd5e1',   // slate-300
  linkColor: '#0969da',      // GitHub light blue (Contrast vs #ffffff = ~5.2:1)
  linkHover: '#0550ae',
  accent: '#2563eb',         // blue-600
  accentHover: '#1d4ed8',
  focusRing: 'rgba(37, 99, 235, 0.5)',
  chromeBg: '#f8fafc',
  chromeBorder: '#e2e8f0',
};

export const DARK_THEME_TOKENS: ThemeColors = {
  bgPrimary: '#0b0f19',      // dark base (Luminance ~ 0.007)
  bgSecondary: '#111827',    // gray-900
  bgTertiary: '#1e293b',     // slate-800
  bgSurface: '#161f30',
  bgCode: '#151b28',
  textPrimary: '#f8fafc',    // slate-50 (Luminance ~ 0.957 -> Contrast vs #0b0f19 = ~17.7:1)
  textSecondary: '#cbd5e1',  // slate-300 (Luminance ~ 0.655 -> Contrast vs #0b0f19 = ~12.4:1)
  textMuted: '#94a3b8',      // slate-400 (Luminance ~ 0.297 -> Contrast vs #0b0f19 = ~6.1:1)
  borderSubtle: '#1e293b',
  borderStrong: '#334155',
  linkColor: '#58a6ff',      // GitHub dark blue (Contrast vs #0b0f19 = ~7.7:1)
  linkHover: '#79b8ff',
  accent: '#3b82f6',         // blue-500
  accentHover: '#60a5fa',
  focusRing: 'rgba(59, 130, 246, 0.5)',
  chromeBg: '#090d16',
  chromeBorder: 'rgba(255, 255, 255, 0.08)',
};

/**
 * Parses hex color (e.g. #fff, #ffffff, with or without leading hash) to RGB tuple.
 */
export function parseHex(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.trim().replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (cleaned.length !== 6) {
    throw new Error(`Invalid hex color string: "${hex}"`);
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates standard WCAG 2.1 relative luminance for an sRGB color.
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const toLinear = (val: number): number => {
    const srgb = val / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates standard WCAG 2.1 contrast ratio between two colors.
 * Return value is in the range 1.0 to 21.0.
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks whether the contrast ratio meets WCAG 2.1 AA requirements.
 * - Normal text requires >= 4.5:1
 * - Large text (>= 18pt or 14pt bold) requires >= 3.0:1
 */
export function meetsWcagAA(
  fgColor: string,
  bgColor: string,
  isLargeText: boolean = false
): { passes: boolean; ratio: number; requiredRatio: number } {
  const ratio = getContrastRatio(fgColor, bgColor);
  const requiredRatio = isLargeText ? 3.0 : 4.5;
  return {
    passes: ratio >= requiredRatio,
    ratio: Math.round(ratio * 100) / 100,
    requiredRatio,
  };
}
