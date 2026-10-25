# Explicit HTML `dir` and Scoped CSS Styling Fixture

This fixture tests the precedence rules defined in PRD Section 6.3 (FR-DIR-002, FR-DIR-003) and Section 16:
1. Explicit HTML `dir` attribute on elements.
2. Scoped CSS classes defining `direction: rtl|ltr` and `text-align: right|left`.
3. Cascading container direction.
4. Auto-direction fallback for un-directed blocks.

---

## 1. Explicit HTML `dir` Attributes

<p dir="rtl">
This is an English paragraph explicitly marked with dir="rtl". It must render aligned to the right with a right-to-left base direction despite having English strong characters.
</p>

<p dir="ltr">
این یک پاراگراف به زبان فارسی است که صریحاً با ویژگی dir="ltr" نشانه‌گذاری شده است. این پاراگراف باید با جهت چپ‌به‌راست نمایش داده شود.
</p>

---

## 2. Scoped CSS Classes from Embedded `<style>`

<style>
  .force-ltr {
    direction: ltr;
    text-align: left;
    border-left: 3px solid #2563eb;
    padding-left: 12px;
  }
  .force-rtl {
    direction: rtl;
    text-align: right;
    border-right: 3px solid #16a34a;
    padding-right: 12px;
  }
</style>

<p class="force-ltr">
این متن فارسی با کلاس .force-ltr قالب‌بندی شده است. اولویت قوانین جهت‌بندی باید اطمینان حاصل کند که جهت چپ‌به‌راست اعمال می‌شود و الگوریتم خودکار این کلاس را بازنویسی نمی‌کند.
</p>

<p class="force-rtl">
This English text is formatted with the .force-rtl class. The direction precedence engine must respect this class and keep it aligned to the right.
</p>

---

## 3. Container Cascading & Overrides

<div dir="rtl">
  <p>
    This English paragraph is inside a parent container with dir="rtl". It inherits the RTL direction without dir="auto" interference.
  </p>
  <p dir="ltr">
    This nested paragraph explicitly overrides the parent container back to LTR.
  </p>
</div>

---

## 4. Un-directed Blocks (Auto-Direction)

این یک پاراگراف معمولی فارسی است که هیچ ویژگی یا استایل صریحی ندارد و باید به صورت خودکار با جهت راست‌به‌چپ (RTL) نمایش یابد.

This is a regular English paragraph without explicit markup, which automatically resolves to left-to-right (LTR).
