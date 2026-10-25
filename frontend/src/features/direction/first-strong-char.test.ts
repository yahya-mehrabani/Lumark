import { describe, it, expect } from 'vitest';
import {
  detectFirstStrongDirection,
  getTextDirection,
  isRtlText,
  stripHtmlTags,
} from './autoDirection';

describe('Unicode First Strong Character Detector (US-017.1 / FR-DIR-001)', () => {
  describe('Basic Script Detection', () => {
    it('accurately identifies Persian / Arabic text as RTL', () => {
      expect(detectFirstStrongDirection('این یک متن آزمایشی است.')).toBe('rtl');
      expect(detectFirstStrongDirection('سلام دنیا')).toBe('rtl');
      expect(detectFirstStrongDirection('مرحبا بالعالم')).toBe('rtl');
    });

    it('accurately identifies Latin text as LTR', () => {
      expect(detectFirstStrongDirection('This is a test document.')).toBe('ltr');
      expect(detectFirstStrongDirection('Hello world')).toBe('ltr');
      expect(detectFirstStrongDirection('Bonjour le monde')).toBe('ltr');
    });

    it('accurately identifies Hebrew text as RTL', () => {
      expect(detectFirstStrongDirection('שלום עולם')).toBe('rtl');
    });

    it('accurately identifies other LTR scripts (Cyrillic, Greek, CJK)', () => {
      expect(detectFirstStrongDirection('Привет мир')).toBe('ltr');
      expect(detectFirstStrongDirection('Γειά σου κόσμε')).toBe('ltr');
      expect(detectFirstStrongDirection('你好世界')).toBe('ltr');
      expect(detectFirstStrongDirection('안녕하세요')).toBe('ltr');
    });
  });

  describe('Leading Neutral and Weak Character Handling', () => {
    it('skips leading ASCII digits and dots to find first strong character (AC 3)', () => {
      expect(detectFirstStrongDirection('123. فارسی')).toBe('rtl');
      expect(detectFirstStrongDirection('1. This is a list item')).toBe('ltr');
      expect(detectFirstStrongDirection('42: راهنمای استفاده')).toBe('rtl');
    });

    it('skips leading Persian / Arabic-Indic digits to find first strong character', () => {
      expect(detectFirstStrongDirection('۱۲۳. سلام')).toBe('rtl');
      expect(detectFirstStrongDirection('٠١٢. مرحبا')).toBe('rtl');
      expect(detectFirstStrongDirection('۱۲۳. English text')).toBe('ltr');
    });

    it('skips leading punctuation (periods, brackets, quotes, dashes, markdown hashes)', () => {
      expect(detectFirstStrongDirection('...سلام')).toBe('rtl');
      expect(detectFirstStrongDirection('--- Hello')).toBe('ltr');
      expect(detectFirstStrongDirection('(مهم) توجه فرمایید')).toBe('rtl');
      expect(detectFirstStrongDirection('[Important] Notice here')).toBe('ltr');
      expect(detectFirstStrongDirection('«متن فارسی داخل گیومه»')).toBe('rtl');
      expect(detectFirstStrongDirection('"Quoted English text"')).toBe('ltr');
      expect(detectFirstStrongDirection('# عنوان یک')).toBe('rtl');
      expect(detectFirstStrongDirection('## Heading Two')).toBe('ltr');
      expect(detectFirstStrongDirection('> نقل قول فارسی')).toBe('rtl');
      expect(detectFirstStrongDirection('> English blockquote')).toBe('ltr');
      expect(detectFirstStrongDirection('**متن پررنگ**')).toBe('rtl');
      expect(detectFirstStrongDirection('**Bold English**')).toBe('ltr');
    });

    it('skips leading emojis and symbols', () => {
      expect(detectFirstStrongDirection('✨ سلام دنیا')).toBe('rtl');
      expect(detectFirstStrongDirection('🚀 Launching soon')).toBe('ltr');
      expect(detectFirstStrongDirection('🔥🌟 نکته کلیدی')).toBe('rtl');
      expect(detectFirstStrongDirection('💡 Tip for developers')).toBe('ltr');
      expect(detectFirstStrongDirection('⚠️ اخطار امنیتی')).toBe('rtl');
    });

    it('skips leading whitespace, tabs, and newlines', () => {
      expect(detectFirstStrongDirection('   \t\n  سلام')).toBe('rtl');
      expect(detectFirstStrongDirection('   \t\n  Hello')).toBe('ltr');
    });
  });

  describe('Mixed Language Paragraphs (AC 4)', () => {
    it('resolves Persian-first sentence with English technical terms to RTL', () => {
      expect(
        detectFirstStrongDirection('از ابزار Docker استفاده کنید.')
      ).toBe('rtl');
      expect(
        detectFirstStrongDirection('برای اجرای پروژه دستور npm start را بزنید.')
      ).toBe('rtl');
      expect(
        detectFirstStrongDirection('کتابخانه React بسیار محبوب است.')
      ).toBe('rtl');
    });

    it('resolves English-first sentence with Persian terms to LTR', () => {
      expect(
        detectFirstStrongDirection('Use the فارسی keyboard layout.')
      ).toBe('ltr');
      expect(
        detectFirstStrongDirection('The word سلام means hello.')
      ).toBe('ltr');
    });
  });

  describe('HTML Tag Handling', () => {
    it('skips leading HTML tags when detecting direction', () => {
      expect(
        detectFirstStrongDirection('<span class="highlight">متن آزمایشی</span>')
      ).toBe('rtl');
      expect(
        detectFirstStrongDirection('<b>سلام</b>')
      ).toBe('rtl');
      expect(
        detectFirstStrongDirection('<p dir="auto">این متن است</p>')
      ).toBe('rtl');
      expect(
        detectFirstStrongDirection('<em>Hello world</em>')
      ).toBe('ltr');
    });

    it('can strip HTML tags cleanly using stripHtmlTags', () => {
      expect(stripHtmlTags('<div class="doc"><p>Hello <b>World</b></p></div>')).toBe(
        'Hello World'
      );
    });
  });

  describe('Neutral-Only and Empty Strings Fallback', () => {
    it('returns null by default when no strong characters are present', () => {
      expect(detectFirstStrongDirection('')).toBeNull();
      expect(detectFirstStrongDirection('   ')).toBeNull();
      expect(detectFirstStrongDirection('1234567890')).toBeNull();
      expect(detectFirstStrongDirection('۱۲۳۴۵')).toBeNull();
      expect(detectFirstStrongDirection('!@#$%^&*()_+-=')).toBeNull();
      expect(detectFirstStrongDirection('🎉✨🚀')).toBeNull();
    });

    it('respects custom fallback when provided', () => {
      expect(detectFirstStrongDirection('', { fallback: 'rtl' })).toBe('rtl');
      expect(detectFirstStrongDirection('12345', { fallback: 'ltr' })).toBe('ltr');
      expect(detectFirstStrongDirection('🎉🚀', { fallback: 'rtl' })).toBe('rtl');
    });

    it('getTextDirection returns fallback direction (default ltr) when no strong character', () => {
      expect(getTextDirection('12345')).toBe('ltr');
      expect(getTextDirection('12345', 'rtl')).toBe('rtl');
      expect(getTextDirection('سلام')).toBe('rtl');
      expect(getTextDirection('Hello')).toBe('ltr');
    });

    it('isRtlText helper returns true only for RTL strong text', () => {
      expect(isRtlText('سلام')).toBe(true);
      expect(isRtlText('Hello')).toBe(false);
      expect(isRtlText('12345')).toBe(false);
    });
  });
});
