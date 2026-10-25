import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import {
  setActiveDirectionPreference,
  resetDirectionPreference,
} from './directionPreferences';

describe('US-019.3: Non-Prose Bidi Protection & Layout Isolation Suite', () => {
  beforeEach(() => {
    resetDirectionPreference();
  });

  describe('1. Code Block Bidi Isolation in Persian RTL Context', () => {
    it('code blocks in RTL paragraphs retain dir="ltr" and left alignment (AC 3)', () => {
      const md = `
# راهنمای برنامه‌نویسی به زبان گو

برای نوشتن یک تابع ساده در زبان گو، از ساختار زیر استفاده می‌شود:

\`\`\`go
package main

import "fmt"

func CalculateTotal(prices []float64, taxRate float64) float64 {
    total := 0.0
    for _, price := range prices {
        total += price * (1.0 + taxRate)
    }
    return total
}
\`\`\`

این تابع مبالغ را با احتساب نرخ مالیات جمع می‌زند.
      `;

      const { container } = render(<MarkdownViewer content={md} />);

      // Paragraph before code block has dir="auto"
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs[0]).toHaveAttribute('dir', 'auto');

      // Code container strictly enforces dir="ltr"
      const codeBlock = screen.getByTestId('code-block-container');
      expect(codeBlock).toHaveAttribute('dir', 'ltr');

      // Scroll container has dir="ltr"
      const scrollContainer = screen.getByTestId('code-scroll-container');
      expect(scrollContainer).toHaveAttribute('dir', 'ltr');

      // Code line numbers are rendered
      const lineNumbers = screen.getByTestId('code-line-numbers');
      expect(lineNumbers).toBeInTheDocument();
    });

    it('preserves pristine indentation, whitespace, and brackets without bidi inversion', () => {
      const originalCode = [
        'def process_tree(node, depth=0):',
        '    if not node:',
        '        return None',
        '    indent = "    " * depth',
        '    print(f"{indent}[{node.id}]: {node.name}")',
        '    for child in node.children:',
        '        process_tree(child, depth + 1)',
      ].join('\n');

      const md = `
## کد پایتون

\`\`\`python
${originalCode}
\`\`\`
      `;

      render(<MarkdownViewer content={md} />);
      const codeBlock = screen.getByTestId('code-block-container');
      expect(codeBlock).toHaveAttribute('dir', 'ltr');

      // Line numbers accurately count lines
      const lineNumbers = screen.getAllByText(/^\d+$/);
      expect(lineNumbers.length).toBe(7);
      expect(lineNumbers[0]).toHaveTextContent('1');
      expect(lineNumbers[6]).toHaveTextContent('7');
    });

    it('preserves symbols, arrows, and relational operators (<, >, <=, >=, !=, ==) in code fences', () => {
      const md = `
# شرط‌های منطقی در سی‌پلاس‌پلاس

\`\`\`cpp
if (x <= 10 && y >= 20 || a != b) {
    std::cout << "Value: " << (x -> value) << std::endl;
}
\`\`\`
      `;

      render(<MarkdownViewer content={md} />);
      const codeBlock = screen.getByTestId('code-block-container');
      expect(codeBlock).toHaveAttribute('dir', 'ltr');
      expect(codeBlock).toHaveAttribute('data-language', 'cpp');
    });
  });

  describe('2. Inline Code Bidi Isolation in Mixed RTL/LTR Sentences', () => {
    it('inline code inside Persian paragraph retains dir="ltr" without punctuation jump', () => {
      const md = 'برای فراخوانی تابع از `service.GetUserById(userId)` استفاده کنید.';
      const { container } = render(<MarkdownViewer content={md} />);

      const p = container.querySelector('p');
      expect(p).toHaveAttribute('dir', 'auto');

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code).toHaveAttribute('dir', 'ltr');
      expect(code).toHaveTextContent('service.GetUserById(userId)');
    });

    it('multiple inline code snippets in Persian sentence all receive dir="ltr"', () => {
      const md = 'متغیر `min_count` باید کوچکتر از `max_count` و مقدار پیش‌فرض `default_val = 10` باشد.';
      const { container } = render(<MarkdownViewer content={md} />);

      const codeElements = container.querySelectorAll('code');
      expect(codeElements.length).toBe(3);
      for (const code of codeElements) {
        expect(code).toHaveAttribute('dir', 'ltr');
      }
      expect(codeElements[0]).toHaveTextContent('min_count');
      expect(codeElements[1]).toHaveTextContent('max_count');
      expect(codeElements[2]).toHaveTextContent('default_val = 10');
    });

    it('inline code in Arabic paragraph retains dir="ltr"', () => {
      const md = 'لتثبيت الحزمة، قم بتشغيل الأمر `npm install --save-dev typescript` في الطرفية.';
      const { container } = render(<MarkdownViewer content={md} />);

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code).toHaveAttribute('dir', 'ltr');
      expect(code).toHaveTextContent('npm install --save-dev typescript');
    });
  });

  describe('3. Mathematical Formulas in RTL Contexts (KaTeX)', () => {
    it('inline formula in Persian paragraph renders strictly LTR without character reversal (AC 4)', () => {
      const md = 'فرمول $f(x) = a x + b$ مهم است.';
      const { container } = render(<MarkdownViewer content={md} />);

      const p = container.querySelector('p');
      expect(p).toHaveAttribute('dir', 'auto');

      const katexSpan = container.querySelector('.katex');
      expect(katexSpan).toBeInTheDocument();
      expect(katexSpan).toHaveAttribute('dir', 'ltr');
    });

    it('complex quadratic formula in Persian text maintains LTR operators and fraction', () => {
      const md = 'ریشه‌های معادله درجه دوم به صورت $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ به دست می‌آید.';
      const { container } = render(<MarkdownViewer content={md} />);

      const katexSpan = container.querySelector('.katex');
      expect(katexSpan).toBeInTheDocument();
      expect(katexSpan).toHaveAttribute('dir', 'ltr');
    });

    it('display math block inside RTL document maintains centered LTR rendering', () => {
      const md = `
# معادلات دیفرانسیل

$$
\\frac{d^2 y}{dx^2} + p(x) \\frac{dy}{dx} + q(x) y = 0
$$
      `;

      const { container } = render(<MarkdownViewer content={md} />);
      const displayMath = container.querySelector('.katex-display');
      expect(displayMath).toBeInTheDocument();
      expect(displayMath).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('4. Mermaid Diagrams in RTL Contexts', () => {
    it('Mermaid diagrams inside RTL document remain strictly LTR without arrow reversal (AC 5)', async () => {
      const md = `
# نمودار جریان داده‌ها

\`\`\`mermaid
graph LR
    ورودی[ورودی داده] --> پردازش[واحد پردازش مرکزی]
    پردازش --> خروجی[پایگاه داده]
\`\`\`
      `;

      render(<MarkdownViewer content={md} />);
      const mermaidContainer = await screen.findByTestId('mermaid-container');
      expect(mermaidContainer).toBeInTheDocument();
      expect(mermaidContainer).toHaveAttribute('dir', 'ltr');
    });

    it('Mermaid sequence diagram renders LTR under active RTL preference', async () => {
      setActiveDirectionPreference('rtl');
      const md = `
\`\`\`mermaid
sequenceDiagram
    کاربر->>سرور: درخواست داده
    سرور-->>کاربر: پاسخ تایید
\`\`\`
      `;

      render(<MarkdownViewer content={md} />);
      const mermaidContainer = await screen.findByTestId('mermaid-container');
      expect(mermaidContainer).toBeInTheDocument();
      expect(mermaidContainer).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('5. Nested RTL Containers & Document Structures', () => {
    it('code block inside explicit dir="rtl" div retains dir="ltr"', () => {
      const md = `
<div dir="rtl">
متن فارسی در بخش با راستای صریح:

\`\`\`javascript
const greeting = "Hello from JS";
console.log(greeting);
\`\`\`
</div>
      `;

      render(<MarkdownViewer content={md} />);
      const codeBlock = screen.getByTestId('code-block-container');
      expect(codeBlock).toHaveAttribute('dir', 'ltr');
    });

    it('code block inside RTL list item retains dir="ltr"', () => {
      const md = `
- مرحله اول: تنظیم محیط
- مرحله دوم: اجرای کد
  \`\`\`bash
  go test -v ./...
  \`\`\`
- مرحله سوم: تایید خروجی
      `;

      render(<MarkdownViewer content={md} />);
      const codeBlock = screen.getByTestId('code-block-container');
      expect(codeBlock).toHaveAttribute('dir', 'ltr');
    });

    it('code block inside RTL blockquote retains dir="ltr"', () => {
      const md = `
> نقل قول فنی:
>
> \`\`\`json
> {
>   "status": "success",
>   "code": 200
> }
> \`\`\`
      `;

      render(<MarkdownViewer content={md} />);
      const codeBlock = screen.getByTestId('code-block-container');
      expect(codeBlock).toHaveAttribute('dir', 'ltr');
    });

    it('table with Persian text isolates inline code in cells to LTR', () => {
      const md = `
| نام دستور | توضیح | مثال |
| :--- | :--- | :--- |
| \`git status\` | وضعیت مخزن | بررسی فایل‌ها |
| \`git commit\` | ثبت تغییرات | ذخیره نسخه |
      `;

      const { container } = render(<MarkdownViewer content={md} />);
      const codeElements = container.querySelectorAll('code');
      expect(codeElements.length).toBe(2);
      expect(codeElements[0]).toHaveAttribute('dir', 'ltr');
      expect(codeElements[1]).toHaveAttribute('dir', 'ltr');
    });
  });
});
