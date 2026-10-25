# ساختار فهرست‌های تو‌در‌تو و جهت‌بندی چندگانه (Nested Bidi Lists)

این سند الگوهای پیچیدهٔ فهرست‌ها و عناصر تو‌در‌تو (Nested Elements) را با جهت‌های متضاد و ناهمگن آزمایش می‌کند. هدف، اعتبارسنجی پایداری نشانگرهای بالت، شماره‌گذاری‌ها، چک‌باکس‌ها، تورفتگی‌ها و نقل‌قول‌های درونی است.

---

## ۱. فهرست مرتب فارسی با زیرفهرست‌های فنی انگلیسی

۱. مرحلهٔ نخست: آماده‌سازی محیط و نیازمندی‌ها
   * Install Linux development dependencies:
     * `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`
     * `libgtk-4-dev` and `libwebkitgtk-6.0-dev`
   * Configure Go toolchain to version `go1.26.10`.
۲. مرحلهٔ دوم: کامپایل و اعتبارسنجی بسته‌های محلی
   * Run unit tests: `npm run test:unit`
   * Run static analysis: `golangci-lint run`
۳. مرحلهٔ سوم: تولید خروجی اجرایی و بسته‌بندی

---

## ۲. فهرست وظایف (Task List) در بستر راست‌به‌چپ

- [x] پیاده‌سازی موتور تشخیص جهت خودکار با الگوریتم نویسهٔ قوی یونی‌کد
- [x] پشتیبانی از ویژگی صریح `dir="rtl"` و `dir="ltr"` در تگ‌های HTML
- [x] استخراج کلاس‌های جهت‌بندی از بلوک‌های استایل ایمن
- [ ] بازبینی نهایی در محیط‌های چندسکویی و سیستم‌عامل ویندوز
  - [x] Linux WebKitGTK under WSL2/WSLg
  - [ ] Windows WebView2 native execution (Deferred to post-implementation)

---

## ۳. نقل‌قول‌های درون‌فهرستی با جهت‌های متفاوت

* نکته اول در خصوص طراحی رابط کاربری:
  > رعایت جهت‌بندی متن تنها به معنای چیدن کلمات از راست به چپ نیست، بلکه ترتیب بصری آیکون‌ها و فاصله‌گذاری‌ها را نیز شامل می‌شود.
* نکته دوم در خصوص مدیریت خطا:
  > Exception handling must never expose internal memory dumps to end users:
  > ```text
  > [CRITICAL] 2026-10-25T08:00:00Z Connection refused: 127.0.0.1:8080
  > ```
* نکته سوم در خصوص عملکرد بهینه:
  > استفاده از کش محلی سرعت بارگذاری اسناد بزرگ را تا ۳۰۰٪ افزایش می‌دهد.

---

## ۴. فهرست انگلیسی حاوی آیتم‌های فارسی و ترتیبات معکوس

1. Primary Application Architecture:
   - Presentation layer built with React and TypeScript.
   - لایهٔ هسته اجرایی و تعامل با سیستم‌عامل که با زبان Go پیاده‌سازی شده است.
   - Local asset serving via custom secure protocol scheme (`/local-asset/`).
2. Internationalization Standards:
   - W3C Internationalization (i18n) Best Practices for Bidi text.
   - استانداردهای استانداردسازی یونی‌کد (Unicode Standard Annex #9).
3. Security Boundaries:
   - Disallow external network fetch and remote script execution.
   - پالایش کامل کدهای HTML مخرب و تگ‌های اجرایی مانند `<script>`.
