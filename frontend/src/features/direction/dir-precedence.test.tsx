import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';

describe('US-018.3: Direction Precedence Order Suite', () => {
  // Precedence Rule 1: Explicit HTML dir attribute beats auto-detection
  describe('Rule 1: Explicit HTML dir attribute vs Auto-Detection', () => {
    it('1. explicit dir="rtl" on English paragraph overrides auto LTR', () => {
      const md = '<p dir="rtl">English paragraph with explicit RTL attribute.</p>';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('English paragraph with explicit RTL attribute.');
      expect(el.getAttribute('dir')).toBe('rtl');
    });

    it('2. explicit dir="ltr" on Persian paragraph overrides auto RTL', () => {
      const md = '<p dir="ltr">متن فارسی با جهت صریح چپ‌به‌راست.</p>';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('متن فارسی با جهت صریح چپ‌به‌راست.');
      expect(el.getAttribute('dir')).toBe('ltr');
    });

    it('3. explicit dir="rtl" on Arabic paragraph maintains RTL', () => {
      const md = '<p dir="rtl">نص عربي مع سمة الاتجاه الصريح من اليمين إلى اليسار.</p>';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('نص عربي مع سمة الاتجاه الصريح من اليمين إلى اليسار.');
      expect(el.getAttribute('dir')).toBe('rtl');
    });

    it('4. explicit dir="ltr" on English paragraph maintains LTR', () => {
      const md = '<p dir="ltr">Standard English paragraph explicitly marked as LTR.</p>';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('Standard English paragraph explicitly marked as LTR.');
      expect(el.getAttribute('dir')).toBe('ltr');
    });
  });

  // Precedence Rule 2: Explicit HTML dir attribute beats CSS class direction
  describe('Rule 2: Explicit HTML dir vs CSS class direction', () => {
    it('5. explicit dir="rtl" beats CSS .force-ltr class', () => {
      const md = `
<style>
  .force-ltr { direction: ltr; }
</style>
<p class="force-ltr" dir="rtl">English text with dir="rtl" beating .force-ltr CSS</p>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('English text with dir="rtl" beating .force-ltr CSS');
      expect(el.getAttribute('dir')).toBe('rtl');
    });

    it('6. explicit dir="ltr" beats CSS .force-rtl class', () => {
      const md = `
<style>
  .force-rtl { direction: rtl; }
</style>
<p class="force-rtl" dir="ltr">متن فارسی با ویژگی dir="ltr" که بر سی‌اس‌اس غلبه می‌کند</p>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('متن فارسی با ویژگی dir="ltr" که بر سی‌اس‌اس غلبه می‌کند');
      expect(el.getAttribute('dir')).toBe('ltr');
    });
  });

  // Precedence Rule 3: Inline style direction beats auto-detection
  describe('Rule 3: Inline CSS style direction vs Auto-Detection', () => {
    it('7. inline style="direction: rtl" on English text overrides auto LTR', () => {
      const md = '<p style="direction: rtl;">English paragraph with inline style direction.</p>';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('English paragraph with inline style direction.');
      expect(el.getAttribute('dir')).toBe('rtl');
    });

    it('8. inline style="direction: ltr" on Persian text overrides auto RTL', () => {
      const md = '<p style="direction: ltr;">متن فارسی با استایل درون‌خطی چپ‌به‌راست.</p>';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('متن فارسی با استایل درون‌خطی چپ‌به‌راست.');
      expect(el.getAttribute('dir')).toBe('ltr');
    });
  });

  // Precedence Rule 4: Scoped CSS class direction beats auto-detection
  describe('Rule 4: Scoped CSS class direction vs Auto-Detection', () => {
    it('9. scoped .force-ltr class on Persian text overrides auto RTL', () => {
      const md = `
<style>
  .force-ltr { direction: ltr; }
</style>
<p class="force-ltr">متن فارسی با کلاس اختصاصی چپ‌به‌راست</p>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('متن فارسی با کلاس اختصاصی چپ‌به‌راست');
      expect(el.getAttribute('dir')).toBe('ltr');
    });

    it('10. scoped .force-rtl class on English text overrides auto LTR', () => {
      const md = `
<style>
  .force-rtl { direction: rtl; text-align: right; }
</style>
<p class="force-rtl">English paragraph styled with .force-rtl class.</p>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('English paragraph styled with .force-rtl class.');
      expect(el.getAttribute('dir')).toBe('rtl');
    });
  });

  // Precedence Rule 5: Container direction cascades to children without dir="auto" override
  describe('Rule 5: Container direction cascading to un-directed children', () => {
    it('11. container dir="rtl" cascades to child English paragraph', () => {
      const md = `
<div dir="rtl">
  <p>English text inside RTL container.</p>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('English text inside RTL container.');
      expect(el.parentElement?.getAttribute('dir')).toBe('rtl');
      expect(el.getAttribute('dir')).not.toBe('auto');
    });

    it('12. container dir="ltr" cascades to child Persian paragraph', () => {
      const md = `
<div dir="ltr">
  <p>متن فارسی داخل محفظه چپ‌به‌راست.</p>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('متن فارسی داخل محفظه چپ‌به‌راست.');
      expect(el.parentElement?.getAttribute('dir')).toBe('ltr');
      expect(el.getAttribute('dir')).not.toBe('auto');
    });

    it('13. container CSS class .rtl-box cascades to child English paragraph', () => {
      const md = `
<style>
  .rtl-box { direction: rtl; }
</style>
<div class="rtl-box">
  <p>English text inside CSS-directed RTL box.</p>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('English text inside CSS-directed RTL box.');
      expect(el.parentElement?.getAttribute('dir')).toBe('rtl');
      expect(el.getAttribute('dir')).not.toBe('auto');
    });
  });

  // Precedence Rule 6: Child explicit direction overrides container direction
  describe('Rule 6: Child explicit direction overriding container direction', () => {
    it('14. child dir="ltr" overrides container dir="rtl"', () => {
      const md = `
<div dir="rtl">
  <p dir="ltr">Child overriding to LTR.</p>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('Child overriding to LTR.');
      expect(el.getAttribute('dir')).toBe('ltr');
    });

    it('15. child dir="rtl" overrides container dir="ltr"', () => {
      const md = `
<div dir="ltr">
  <p dir="rtl">فرزند بازنویسی‌کننده به راست‌به‌چپ.</p>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('فرزند بازنویسی‌کننده به راست‌به‌چپ.');
      expect(el.getAttribute('dir')).toBe('rtl');
    });

    it('16. child .force-ltr class overrides container dir="rtl"', () => {
      const md = `
<style>
  .force-ltr { direction: ltr; }
</style>
<div dir="rtl">
  <p class="force-ltr">Child with CSS class overriding container dir.</p>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('Child with CSS class overriding container dir.');
      expect(el.getAttribute('dir')).toBe('ltr');
    });

    it('17. child dir="auto" explicitly opts into auto-direction inside container dir="rtl"', () => {
      const md = `
<div dir="rtl">
  <p dir="auto">English text explicitly opting into auto-direction.</p>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('English text explicitly opting into auto-direction.');
      expect(el.getAttribute('dir')).toBe('auto');
    });
  });

  // Precedence Rule 7: Auto-direction applies only when no explicit direction exists
  describe('Rule 7: Auto-direction on un-directed elements', () => {
    it('18. un-directed Persian paragraph receives dir="auto"', () => {
      const md = 'این یک پاراگراف فارسی بدون جهت صریح است.';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('این یک پاراگراف فارسی بدون جهت صریح است.');
      expect(el.getAttribute('dir')).toBe('auto');
    });

    it('19. un-directed English paragraph receives dir="auto"', () => {
      const md = 'This is an un-directed English paragraph.';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('This is an un-directed English paragraph.');
      expect(el.getAttribute('dir')).toBe('auto');
    });

    it('20. un-directed Hebrew heading receives dir="auto"', () => {
      const md = '# כותרת בעבריت';
      render(<MarkdownViewer content={md} />);
      const el = screen.getByRole('heading', { level: 1 });
      expect(el.getAttribute('dir')).toBe('auto');
    });

    it('21. deeply nested paragraph inside 3 container levels inherits explicit RTL', () => {
      const md = `
<div dir="rtl">
  <div>
    <div>
      <p>Deeply nested English paragraph.</p>
    </div>
  </div>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('Deeply nested English paragraph.');
      expect(el.getAttribute('dir')).not.toBe('auto');
    });

    it('22. deeply nested paragraph inside 3 container levels overrides to LTR', () => {
      const md = `
<div dir="rtl">
  <div>
    <div>
      <p dir="ltr">Deeply nested paragraph overriding to LTR.</p>
    </div>
  </div>
</div>
      `;
      render(<MarkdownViewer content={md} />);
      const el = screen.getByText('Deeply nested paragraph overriding to LTR.');
      expect(el.getAttribute('dir')).toBe('ltr');
    });
  });
});
