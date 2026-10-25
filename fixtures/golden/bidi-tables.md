# جداول داده‌ای دوزبانه و ترازبندی سلول‌ها (Bidi Tables)

این سند ویژگی‌های پیشرفتهٔ جداول مارک‌داون (GFM Tables) را در محیط‌های راست‌به‌چپ و دوزبانه مورد آزمایش قرار می‌دهد. در جداول با محتوای مختلط، ستون‌های متنی فارسی باید راست‌چین، ستون‌های کد و لاتین چپ‌چین، و مقادیر عددی یا وضعیت‌ها در مرکز تراز گردند.

---

## ۱. جدول ماتریس نیازمندی‌ها و وضعیت پیاده‌سازی

| شناسه نیازمندی | عنوان قابلیت و شرح کارکرد | اولویت | وضعیت پیاده‌سازی | ماژول مسئول |
| :--- | :--- | :---: | :---: | ---: |
| `FR-DIR-001` | تشخیص خودکار جهت بلوک‌ها با الگوریتم کاراکتر قوی | P0 | پیاده‌سازی شده | `frontend/direction` |
| `FR-DIR-002` | پشتیبانی از ویژگی صریح `dir="rtl"` و `dir="ltr"` | P0 | پیاده‌سازی شده | `resolver.ts` |
| `FR-DIR-003` | اعمال کلاس‌های استایل محلی از بلوک‌های `<style>` | P0 | پیاده‌سازی شده | `resolver.ts` |
| `FR-DIR-004` | تنظیم جهت پیش‌فرض کاربر (`auto`، `rtl`، `ltr`) | P0 | پیاده‌سازی شده | `directionPreferences` |
| `FR-DIR-005` | انزوای قطعی LTR برای کد، فرمول‌های ریاضی و دیاگرام‌ها | P0 | پیاده‌سازی شده | `resolver.ts` |
| `FR-DIR-006` | آزمون‌های جامع رگرسیون بر روی نمونه اسناد طلایی | P0 | در حال اجرا | `fixtures/golden` |

---

## ۲. جدول ارزیابی عملکرد و تأخیر ماژول‌ها در بارگذاری اسناد

| نام آزمون عملکردی | حجم سند (کیلوبایت) | تعداد گره‌های AST | میانگین زمان رندر (ms) | وضعیت ارزیابی |
| :--- | :---: | :---: | :---: | :---: |
| سند متنی فارسی ساده (`persian-prose.md`) | ۲.۵ | ۴۵ | ۱.۲ | **تأیید شد** |
| سند متنی عربی با تشکیل (`arabic-prose.md`) | ۳.۱ | ۵۲ | ۱.۵ | **تأیید شد** |
| سند فنی مختلط (`mixed-bidi-tech.md`) | ۴.۸ | ۸۵ | ۳.۱ | **تأیید شد** |
| جداول داده‌ای با تراز مرکب (`bidi-tables.md`) | ۳.۴ | ۶۰ | ۱.۸ | **تأیید شد** |
| ماتریس استایل و جهت‌بندی صریح (`explicit-dir-styling.md`) | ۲.۴ | ۴۰ | ۱.۱ | **تأیید شد** |

---

## ۳. جدول لاتین با سلول‌های چندزبانه و نشانه‌گذاری فنی

| Component Name | Technical Spec | Supported Scripts | Memory Footprint |
| :--- | :--- | :--- | ---: |
| `DirectionEngine` | Unicode Bidi Algorithm & First-Strong Detection | لاتین، فارسی، عربی، عبری | `< 1 MB` |
| `StyleParser` | CSS Scoped Classes with `.markdown-content` prefix | Standard CSS3 Syntax | `< 500 KB` |
| `CodeHighlighter` | Shiki Syntax Engine with LTR strict containment | Go, TypeScript, Python, Shell | `~ 15 MB` |
| `MermaidRenderer` | Offline SVG diagram rendering | Pure Vector Graphics | `~ 8 MB` |
| `MathRenderer` | KaTeX TeX Engine with isolated math typography | AMS-LaTeX / TeX Math | `~ 4 MB` |

---

## ۴. جدول ترکیبی با پیوندها، کدها و برچسب‌ها

| ابزار ارزیابی | فرمان اجرایی در محیط ترمینال | کارکرد در پایپ‌لاین | مستندات مرجع |
| :--- | :--- | :--- | :--- |
| Vitest Runner | `npm run test:unit -- bidi` | آزمون سریع واحد مؤلفه‌ها | [Vitest Guide](https://vitest.dev) |
| Go Test | `go test -v ./...` | بررسی سرویس‌های نیتیو بک‌اند | [Go Package Testing](https://golang.org) |
| Linter | `golangci-lint run` | بررسی قواعد کدنویسی و کیفیت | [Golangci-lint Manual](https://golangci-lint.run) |
