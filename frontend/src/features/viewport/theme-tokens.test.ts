import { describe, it, expect } from 'vitest';
import {
  LIGHT_THEME_TOKENS,
  DARK_THEME_TOKENS,
  parseHex,
  getRelativeLuminance,
  getContrastRatio,
  meetsWcagAA,
} from './themeTokens';
import fs from 'fs';
import path from 'path';

describe('Theme Design Tokens & WCAG AA Contrast Compliance (US-023.1)', () => {
  describe('Hex Parsing & Luminance Utilities', () => {
    it('parses 3-character and 6-character hex values correctly', () => {
      expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(parseHex('000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseHex('#0f172a')).toEqual({ r: 15, g: 23, b: 42 });
    });

    it('throws error for invalid hex color strings', () => {
      expect(() => parseHex('#invalid')).toThrow('Invalid hex color string');
      expect(() => parseHex('12345')).toThrow('Invalid hex color string');
    });

    it('calculates reference relative luminance accurately', () => {
      expect(getRelativeLuminance('#000000')).toBeCloseTo(0.0, 4);
      expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1.0, 4);
    });

    it('calculates standard contrast ratio between pure white and pure black as 21:1', () => {
      const ratio = getContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21.0, 1);
    });
  });

  describe('Light Theme Contrast Ratios (WCAG AA >= 4.5:1)', () => {
    it('textPrimary meets WCAG AA contrast against bgPrimary', () => {
      const result = meetsWcagAA(LIGHT_THEME_TOKENS.textPrimary, LIGHT_THEME_TOKENS.bgPrimary);
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textSecondary meets WCAG AA contrast against bgPrimary', () => {
      const result = meetsWcagAA(LIGHT_THEME_TOKENS.textSecondary, LIGHT_THEME_TOKENS.bgPrimary);
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textMuted meets WCAG AA contrast against bgPrimary', () => {
      const result = meetsWcagAA(LIGHT_THEME_TOKENS.textMuted, LIGHT_THEME_TOKENS.bgPrimary);
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('linkColor meets WCAG AA contrast against bgPrimary', () => {
      const result = meetsWcagAA(LIGHT_THEME_TOKENS.linkColor, LIGHT_THEME_TOKENS.bgPrimary);
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textPrimary meets WCAG AA contrast against secondary and tertiary backgrounds', () => {
      const resSec = meetsWcagAA(LIGHT_THEME_TOKENS.textPrimary, LIGHT_THEME_TOKENS.bgSecondary);
      const resTert = meetsWcagAA(LIGHT_THEME_TOKENS.textPrimary, LIGHT_THEME_TOKENS.bgTertiary);
      expect(resSec.passes).toBe(true);
      expect(resTert.passes).toBe(true);
    });
  });

  describe('Dark Theme Contrast Ratios (WCAG AA >= 4.5:1)', () => {
    it('textPrimary meets WCAG AA contrast against bgPrimary', () => {
      const result = meetsWcagAA(DARK_THEME_TOKENS.textPrimary, DARK_THEME_TOKENS.bgPrimary);
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textSecondary meets WCAG AA contrast against bgPrimary', () => {
      const result = meetsWcagAA(DARK_THEME_TOKENS.textSecondary, DARK_THEME_TOKENS.bgPrimary);
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textMuted meets WCAG AA contrast against bgPrimary', () => {
      const result = meetsWcagAA(DARK_THEME_TOKENS.textMuted, DARK_THEME_TOKENS.bgPrimary);
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('linkColor meets WCAG AA contrast against bgPrimary', () => {
      const result = meetsWcagAA(DARK_THEME_TOKENS.linkColor, DARK_THEME_TOKENS.bgPrimary);
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textPrimary meets WCAG AA contrast against secondary and tertiary backgrounds', () => {
      const resSec = meetsWcagAA(DARK_THEME_TOKENS.textPrimary, DARK_THEME_TOKENS.bgSecondary);
      const resTert = meetsWcagAA(DARK_THEME_TOKENS.textPrimary, DARK_THEME_TOKENS.bgTertiary);
      expect(resSec.passes).toBe(true);
      expect(resTert.passes).toBe(true);
    });
  });

  describe('CSS Theme Token Definitions', () => {
    it('theme.css defines required CSS variables for both light and dark modes', () => {
      const cssPath = path.resolve(__dirname, 'theme.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const expectedVars = [
        '--bg-primary',
        '--bg-secondary',
        '--bg-tertiary',
        '--text-primary',
        '--text-secondary',
        '--text-muted',
        '--border-subtle',
        '--border-strong',
        '--link-color',
        '--accent',
        '--focus-ring',
      ];

      for (const varName of expectedVars) {
        expect(cssContent).toContain(varName);
      }

      expect(cssContent).toContain('[data-theme="dark"]');
      expect(cssContent).toContain('[data-theme="light"]');
      expect(cssContent).toContain('prefers-color-scheme: light');
    });
  });
});
