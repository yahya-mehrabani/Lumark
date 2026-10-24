# GitHub Flavored Markdown Extensions

This fixture validates standard CommonMark and GFM rendering support.

## 1. Tables and Column Alignment

| Left Aligned | Center Aligned | Right Aligned | Default |
| :--- | :---: | ---: | --- |
| Row 1 Left | Row 1 Center | $100.00 | Normal text |
| Row 2 Left | Row 2 Center | $25.50 | Longer sample description |
| Wide cell content that verifies horizontal scrolling within table wrapper without breaking layout | Centered | $1,250.00 | Data |

## 2. Task Lists (Checklists)

- [x] Initial design specifications
- [x] Technical feasibility spike
- [ ] Cross-platform binary packaging
  - [x] Linux Ubuntu package
  - [ ] Windows NSIS installer
  - [ ] macOS app bundle
- [ ] Final release hardening

## 3. Inline GFM Formats

This line demonstrates ~~obsolete deprecated content~~ marked with strikethrough.

Autolink test: Visit https://github.com/wailsapp/wails or write to support@example.com for questions.

## 4. Blockquotes and Formatting

> Markdown is designed to be readable as-is.
>
> It handles **bold**, *italics*, and `inline code` cleanly.
