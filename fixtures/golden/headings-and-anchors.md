# Headings and Anchors Golden Fixture

Baseline golden fixture for deterministic unique heading slug generation, duplicate disambiguation, Unicode preservation, and in-document anchor navigation.

[Jump to Introduction](#introduction) | [Jump to Duplicate 1](#duplicate-section) | [Jump to Duplicate 2](#duplicate-section-1) | [Jump to Duplicate 3](#duplicate-section-2) | [Jump to Persian](#راهنمای-جامع-کاربری)

---

## Level 2 Heading

This is a level 2 heading section.

### Level 3 Heading

This is a level 3 heading section.

#### Level 4 Heading

This is a level 4 heading section.

##### Level 5 Heading

This is a level 5 heading section.

###### Level 6 Heading

This is a level 6 heading section with subtle gray typography.

---

## Duplicate Section

First instance of the duplicate section heading.

## Duplicate Section

Second instance of the duplicate section heading. Expected anchor ID: `duplicate-section-1`.

## Duplicate Section

Third instance of the duplicate section heading. Expected anchor ID: `duplicate-section-2`.

---

## Headings with Inline Formatting: *Italic*, **Bold**, and `Code`

This heading contains nested Markdown formatting elements. The slug generator must extract plain text: `headings-with-inline-formatting-italic-bold-and-code`.

## Heading with Punctuation & Special Symbols: C++ / C# & v2.0 (New!)

Punctuation marks must be safely stripped or hyphenated.

---

# راهنمای جامع کاربری

این بخش با حروف و زبان فارسی نوشته شده است و باید شناسه لنگر معتبر با حفظ کاراکترهای یونیکد داشته باشد: `راهنمای-جامع-کاربری`.

## ویژگی‌های سیستم

ویژگی‌های پیشرفته با نیم‌فاصله یونیکد.

## Über die Entwickler

European accented characters test: `über-die-entwickler`.

## ユーザーガイド

Japanese CJK characters test: `ユーザーガイド`.

---

## Navigation Links

- [Back to Top](#headings-and-anchors-golden-fixture)
- [Go to Level 6 Heading](#level-6-heading)
- [Go to Persian Guide](#راهنمای-جامع-کاربری)
- [Go to Inline Formatting Heading](#headings-with-inline-formatting-italic-bold-and-code)
