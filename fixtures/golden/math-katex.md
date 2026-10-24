# KaTeX Math Golden Fixture Suite

This document tests offline rendering of mathematical expressions using locally bundled KaTeX per PRD FR-RENDER-006, FR-RENDER-009, and PRD Section 5.4.

## 1. Inline Mathematical Formulas

Mathematical formulas embedded directly within sentences:
- Einstein's mass-energy equivalence: $E = mc^2$
- Pythagorean theorem: $a^2 + b^2 = c^2$
- Greek variables: $\alpha + \beta = \gamma$
- Subscripts and superscripts: $x_i^2 + y_j^3 = z_k^5$

## 2. Display Mathematical Equations

Centrally aligned display equations defined with double dollar delimiters:

$$
f(x) = \int_{-\infty}^\infty \hat{f}(\xi)\,e^{2 \pi i \xi x}\,d\xi
$$

Quadratic equation solution formula:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Matrix notation:

$$
\begin{pmatrix} a & b \\ c & d \end{pmatrix} \begin{pmatrix} x \\ y \end{pmatrix} = \begin{pmatrix} ax + by \\ cx + dy \end{pmatrix}
$$

## 3. Currency Coexistence in Prose

Ordinary currency values in text must never be falsely interpreted as math delimiters:
- The base package costs $10 and $20 for the upgrade.
- Enterprise tier pricing starts at $100 and $200 per seat.
- Minor fees are $5.00 and $10.00 respectively.
- Legitimate math like $x + y = 10$ coexists cleanly with currency amounts of $50 per license.

## 4. Wide Display Equation for Horizontal Scrolling

A wide mathematical equation that tests container horizontal scrolling (`overflow-x: auto`) without clipping:

$$
P(x) = \sum_{k=0}^{n} \binom{n}{k} x^k (1-x)^{n-k} = \frac{n!}{0!(n-0)!}x^0(1-x)^n + \frac{n!}{1!(n-1)!}x^1(1-x)^{n-1} + \cdots + \frac{n!}{n!(n-n)!}x^n(1-x)^0
$$

## 5. Graceful Error Handling and Partial Rendering

Malformed expressions or syntax errors render safe warning badges and isolate errors:
- Malformed inline formula: $\frac{1}{$
- Valid formula in same section: $\sqrt{x^2 + 1}$
- Surrounding paragraphs and subsequent content remain fully functional per FR-RENDER-009.

## 6. Persian / Multilingual Context with Math

Math formulas embedded within Persian RTL text:
- فرمول هم‌ارزی جرم و انرژی اینشتین برابر است با $E = mc^2$ در فیزیک نوین.
- تابع توزیع گاوسی به صورت زیر محاسبه می‌شود:

$$
g(x) = \frac{1}{\sigma \sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}
$$
