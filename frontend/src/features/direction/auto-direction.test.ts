import { describe, it, expect } from 'vitest';
import {
  detectFirstStrongDirection,
  getTextDirection,
  isRtlText,
  stripHtmlTags,
} from './autoDirection';

describe('Multilingual Bidi Resolution Test Suite (US-017.4 / FR-DIR-001)', () => {
  describe('1. Persian Prose Cases (RTL)', () => {
    it('resolves simple Persian prose', () => {
      expect(detectFirstStrongDirection('این یک پاراگراف به زبان فارسی است.')).toBe('rtl');
    });

    it('resolves Persian prose containing embedded English technical terms (AC 4)', () => {
      expect(detectFirstStrongDirection('از ابزار Docker و React استفاده کنید.')).toBe('rtl');
      expect(detectFirstStrongDirection('پروژه با فریم‌ورک Wails v3 ساخته شده است.')).toBe('rtl');
    });

    it('resolves Persian prose with Persian-Arabic digits', () => {
      expect(detectFirstStrongDirection('قیمت کتاب ۱۲۰۰ تومان است.')).toBe('rtl');
    });

    it('resolves Persian prose with ASCII digits', () => {
      expect(detectFirstStrongDirection('تعداد کاربران ما 500 نفر است.')).toBe('rtl');
    });

    it('resolves Persian prose with leading quotes', () => {
      expect(detectFirstStrongDirection('«سلام دنیا» یک عبارت معروف در برنامه‌نویسی است.')).toBe('rtl');
    });

    it('resolves Persian prose with leading emojis', () => {
      expect(detectFirstStrongDirection('⭐ نکات مهم در خصوص نرم‌افزار')).toBe('rtl');
    });

    it('resolves Persian prose with leading parentheses or brackets', () => {
      expect(detectFirstStrongDirection('(هشدار) لطفاً پیش از ادامه فایل را ذخیره نمایید.')).toBe('rtl');
      expect(detectFirstStrongDirection('[یادداشت] این یک متن مهم است.')).toBe('rtl');
    });
  });

  describe('2. Arabic Prose Cases (RTL)', () => {
    it('resolves standard Arabic sentences', () => {
      expect(detectFirstStrongDirection('هذا نص باللغة العربية للاختبار.')).toBe('rtl');
    });

    it('resolves Arabic sentences with embedded English technical terms', () => {
      expect(detectFirstStrongDirection('يستخدم نظام Linux في الخوادم والسحابة.')).toBe('rtl');
    });

    it('resolves Arabic sentences with numbers and dates', () => {
      expect(detectFirstStrongDirection('تم تحديث 25 ملفاً في المستودع.')).toBe('rtl');
    });

    it('resolves Arabic sentences with leading punctuation', () => {
      expect(detectFirstStrongDirection('...مرحبا بكم في التطبيق')).toBe('rtl');
    });
  });

  describe('3. Hebrew Prose Cases (RTL)', () => {
    it('resolves standard Hebrew prose', () => {
      expect(detectFirstStrongDirection('זהו משפט בעברית לבדיקה.')).toBe('rtl');
    });

    it('resolves Hebrew prose with embedded English technical terms', () => {
      expect(detectFirstStrongDirection('אנחנו משתמשים ב-TypeScript לפיתוח.')).toBe('rtl');
    });

    it('resolves Hebrew prose with numbers', () => {
      expect(detectFirstStrongDirection('היו 100 משתתפים בכנס הטכנולוגי.')).toBe('rtl');
    });
  });

  describe('4. Additional Middle Eastern / South Asian RTL Scripts', () => {
    it('resolves Syriac script sentences to RTL', () => {
      expect(detectFirstStrongDirection('ܫܠܡܐ ܥܠܝܟܘܢ')).toBe('rtl');
    });

    it('resolves Thaana (Dhivehi) script sentences to RTL', () => {
      expect(detectFirstStrongDirection('މިއީ ޓެސްޓު ލިޔުމެކެވެ.')).toBe('rtl');
    });
  });

  describe('5. English and Western European Prose Cases (LTR)', () => {
    it('resolves standard English sentences', () => {
      expect(detectFirstStrongDirection('This is a standard English paragraph.')).toBe('ltr');
    });

    it('resolves English sentences containing Persian words', () => {
      expect(detectFirstStrongDirection('The word سلام means peace or hello.')).toBe('ltr');
    });

    it('resolves English sentences containing Arabic words', () => {
      expect(detectFirstStrongDirection('The term مرحبا is commonly used in greeting.')).toBe('ltr');
    });

    it('resolves English sentences with leading numbers', () => {
      expect(detectFirstStrongDirection('2026. The year of modern desktop applications.')).toBe('ltr');
    });

    it('resolves English sentences with leading emojis', () => {
      expect(detectFirstStrongDirection('🚀 Building high performance Markdown viewers.')).toBe('ltr');
    });

    it('resolves English sentences with leading brackets', () => {
      expect(detectFirstStrongDirection('[INFO] All tests are passing successfully.')).toBe('ltr');
    });

    it('resolves French sentences with diacritics', () => {
      expect(detectFirstStrongDirection("C'est un paragraphe en français avec des accents: é, è, ê, ç.")).toBe('ltr');
    });

    it('resolves German sentences with umlauts', () => {
      expect(detectFirstStrongDirection('Dies ist ein deutscher Text mit Umlauten: ä, ö, ü, ß.')).toBe('ltr');
    });

    it('resolves Spanish sentences with inverted question marks', () => {
      expect(detectFirstStrongDirection('¿Cómo estás hoy? Todo bien.')).toBe('ltr');
    });
  });

  describe('6. Eastern European and Asian LTR Scripts', () => {
    it('resolves Russian (Cyrillic) sentences to LTR', () => {
      expect(detectFirstStrongDirection('Это предложение на русском языке для проверки направления.')).toBe('ltr');
    });

    it('resolves Greek sentences to LTR', () => {
      expect(detectFirstStrongDirection('Αυτό είναι ένα κείμενο στα ελληνικά.')).toBe('ltr');
    });

    it('resolves Chinese (Simplified) ideographic sentences to LTR', () => {
      expect(detectFirstStrongDirection('这是一个用于测试的双向文本段落。')).toBe('ltr');
    });

    it('resolves Japanese (Kana + Kanji) sentences to LTR', () => {
      expect(detectFirstStrongDirection('これは日本語のテスト文章です。')).toBe('ltr');
    });

    it('resolves Korean (Hangul) sentences to LTR', () => {
      expect(detectFirstStrongDirection('이것은 테스트를 위한 한국어 문장입니다.')).toBe('ltr');
    });
  });

  describe('7. Markdown Syntax & Formatting Cases', () => {
    it('resolves Markdown link syntax based on anchor text', () => {
      expect(detectFirstStrongDirection('[راهنمای پروژه](https://example.com/guide)')).toBe('rtl');
      expect(detectFirstStrongDirection('[Project Guide](https://example.com/guide)')).toBe('ltr');
    });

    it('resolves Markdown inline code formatting based on strong character', () => {
      expect(detectFirstStrongDirection('`سلام` یک کلمه است')).toBe('rtl');
      expect(detectFirstStrongDirection('`npm test` runs the test suite')).toBe('ltr');
    });

    it('resolves bold and italic Markdown markers cleanly', () => {
      expect(detectFirstStrongDirection('**متن بسیار مهم**')).toBe('rtl');
      expect(detectFirstStrongDirection('*تاکید روی واژه*')).toBe('rtl');
      expect(detectFirstStrongDirection('**Very Important Text**')).toBe('ltr');
      expect(detectFirstStrongDirection('*Emphasis on word*')).toBe('ltr');
    });

    it('handles complex pathological leading characters', () => {
      expect(detectFirstStrongDirection('   * * * ... (1) سلام دنیا')).toBe('rtl');
      expect(detectFirstStrongDirection('   - - - ... [A] Hello World')).toBe('ltr');
    });
  });

  describe('8. Edge Cases & Fallback Configuration', () => {
    it('returns null on empty string', () => {
      expect(detectFirstStrongDirection('')).toBeNull();
    });

    it('returns null on digit-only strings', () => {
      expect(detectFirstStrongDirection('1234567890')).toBeNull();
      expect(detectFirstStrongDirection('۱۲۳۴۵۶۷۸۹۰')).toBeNull();
    });

    it('returns null on punctuation-only strings', () => {
      expect(detectFirstStrongDirection('.,;:!?()[]{}<>-+/*=_~`|\\"\'' )).toBeNull();
    });

    it('returns null on emoji-only strings', () => {
      expect(detectFirstStrongDirection('🔥✨🎉🚀🌟💡⚠️❤️')).toBeNull();
    });

    it('returns null on whitespace-only strings', () => {
      expect(detectFirstStrongDirection('   \t\r\n   ')).toBeNull();
    });

    it('respects custom fallback option', () => {
      expect(detectFirstStrongDirection('12345', { fallback: 'rtl' })).toBe('rtl');
      expect(detectFirstStrongDirection('12345', { fallback: 'ltr' })).toBe('ltr');
      expect(detectFirstStrongDirection('12345', { fallback: null })).toBeNull();
    });

    it('getTextDirection returns default fallback "ltr"', () => {
      expect(getTextDirection('12345')).toBe('ltr');
      expect(getTextDirection('')).toBe('ltr');
    });

    it('getTextDirection respects custom fallback parameter', () => {
      expect(getTextDirection('12345', 'rtl')).toBe('rtl');
      expect(getTextDirection('', 'rtl')).toBe('rtl');
    });

    it('isRtlText helper accurately returns boolean', () => {
      expect(isRtlText('سلام')).toBe(true);
      expect(isRtlText('Hello')).toBe(false);
      expect(isRtlText('12345')).toBe(false);
      expect(isRtlText('')).toBe(false);
    });

    it('stripHtmlTags removes markup while preserving inner content', () => {
      expect(stripHtmlTags('<p>Hello <span class="badge">World</span></p>')).toBe('Hello World');
      expect(stripHtmlTags('<a href="https://example.com">لینک</a>')).toBe('لینک');
    });
  });
});
