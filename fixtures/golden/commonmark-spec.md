# CommonMark Baseline Specification Fixture

Comprehensive golden fixture covering core CommonMark syntax elements: headings, blockquotes, lists, emphasis, links, horizontal rules, and paragraph breaks.

---

## 1. Typography and Paragraph Formatting

Paragraphs in CommonMark are separated by one or more blank lines. Consecutive lines within a paragraph are treated as soft line breaks unless two spaces or a backslash end the line.

Here is a paragraph with *italic text* using asterisks, _italic text_ using underscores, **bold text** using double asterisks, and __bold text__ using double underscores. We can also combine them: ***bold italic text***.

Inline `code snippets` are written with backticks and must retain exact character formatting without evaluation.

---

## 2. Blockquotes

> Blockquotes can be single level.
> They contain standard paragraphs and typography.
>
> > Nested blockquotes are created by stacking additional greater-than characters.
> > They can span multiple paragraphs.
>
> Back to the outer blockquote.

---

## 3. Ordered and Unordered Lists

### Unordered Lists
* Item Alpha
* Item Beta
  * Sub-item Beta-1
  * Sub-item Beta-2
* Item Gamma with a [Local Reference](#1-typography-and-paragraph-formatting)

### Ordered Lists
1. First step: Initialize workspace.
2. Second step: Load Markdown document into AST.
3. Third step: Render sanitized DOM components.
   1. Sub-step A: Attach unique anchor IDs.
   2. Sub-step B: Highlight fenced code blocks.

---

## 4. Horizontal Rules

Three or more hyphens, asterisks, or underscores on a line create a thematic break:

---

***

___

---

## 5. Inline Links and Images

Standard inline link: [CommonMark Official Specification](https://spec.commonmark.org/).

Reference to internal anchor: [Jump to Blockquotes](#2-blockquotes).
