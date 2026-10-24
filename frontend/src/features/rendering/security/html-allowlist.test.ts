import { describe, it, expect } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { toHtml } from 'hast-util-to-html';
import { SANITY_HTML_SCHEMA } from './htmlSanitizer';

/**
 * Helper to process markdown through the unified pipeline with raw HTML support and rehypeSanitize schema.
 */
async function processMarkdown(markdown: string): Promise<string> {
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  const hast = await unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, SANITY_HTML_SCHEMA)
    .run(mdast);
  return toHtml(hast);
}

describe('Rehype-Sanitize Schema Allowlist (US-015.1)', () => {
  it('allows safe semantic HTML tags and attributes', async () => {
    const input = '<div dir="rtl" class="highlight" title="box"><span style="color: red;">Text</span></div>';
    const output = await processMarkdown(input);
    expect(output).toContain('<div');
    expect(output).toContain('dir="rtl"');
    expect(output).toContain('class="highlight"');
    expect(output).toContain('title="box"');
    expect(output).toContain('<span');
    expect(output).toContain('style="color: red;"');
    expect(output).toContain('Text</span></div>');
  });

  it('preserves tables, lists, and formatting tags from raw HTML', async () => {
    const input = `
<table class="data-table">
  <thead>
    <tr><th>Col 1</th><th>Col 2</th></tr>
  </thead>
  <tbody>
    <tr><td><em>Italic</em></td><td><strong>Bold</strong></td></tr>
  </tbody>
</table>
<details open><summary>Details</summary><p>More info</p></details>
<figure><figcaption>Caption</figcaption></figure>
`;
    const output = await processMarkdown(input);
    expect(output).toContain('<table class="data-table">');
    expect(output).toContain('<th>Col 1</th>');
    expect(output).toContain('<em>Italic</em>');
    expect(output).toContain('<strong>Bold</strong>');
    expect(output).toContain('<details open><summary>Details</summary>');
    expect(output).toContain('<figure><figcaption>Caption</figcaption></figure>');
  });

  it('completely strips <script> tags and active script content', async () => {
    const input = 'Before<script>alert("xss")</script>After';
    const output = await processMarkdown(input);
    expect(output).not.toContain('<script');
    expect(output).not.toContain('alert("xss")');
    expect(output).toContain('Before');
    expect(output).toContain('After');
  });

  it('strips inline event handler attributes (onerror, onclick, onload)', async () => {
    const input = '<img src="https://example.com/pic.png" onerror="alert(1)"> <a href="https://example.com" onclick="alert(2)">Link</a>';
    const output = await processMarkdown(input);
    expect(output).not.toContain('onerror');
    expect(output).not.toContain('onclick');
    expect(output).toContain('src="https://example.com/pic.png"');
    expect(output).toContain('href="https://example.com"');
  });

  it('strips active executable tags (iframe, object, embed, form, button, base, meta)', async () => {
    const input = `
<iframe src="https://evil.com">hidden frame</iframe>
<object data="malware.swf">fallback</object>
<embed src="plugin.swf">
<form action="/steal"><button type="submit">Submit</button></form>
<base href="https://evil.com/">
<meta http-equiv="refresh" content="0;url=https://evil.com">
`;
    const output = await processMarkdown(input);
    expect(output).not.toContain('<iframe');
    expect(output).not.toContain('hidden frame');
    expect(output).not.toContain('<object');
    expect(output).not.toContain('<embed');
    expect(output).not.toContain('<form');
    expect(output).not.toContain('<button');
    expect(output).not.toContain('<base');
    expect(output).not.toContain('<meta');
  });

  it('strips arbitrary input elements outside of task lists', async () => {
    const input = '<p><input type="text" name="steal" value="secret"></p>';
    const output = await processMarkdown(input);
    expect(output).not.toContain('<input');
    expect(output).not.toContain('name="steal"');
  });

  it('preserves GFM task list checkboxes inside list items', async () => {
    const input = '- [ ] Incomplete task\n- [x] Completed task';
    const output = await processMarkdown(input);
    expect(output).toContain('type="checkbox"');
    expect(output).toContain('disabled');
    expect(output).toContain('Incomplete task');
    expect(output).toContain('Completed task');
  });

  it('strips dangerous href protocols like javascript:, vbscript:, and data:', async () => {
    const input = `
<a href="javascript:alert(1)">JS Link</a>
<a href="vbscript:msgbox(1)">VBS Link</a>
<a href="data:text/html,<script>alert(1)</script>">Data Link</a>
<a href="https://example.com">Safe Link</a>
<a href="mailto:support@example.com">Mailto Link</a>
<a href="./docs/guide.md">Relative Link</a>
<a href="#section-anchor">Anchor Link</a>
`;
    const output = await processMarkdown(input);
    expect(output).not.toContain('href="javascript:');
    expect(output).not.toContain('href="vbscript:');
    expect(output).not.toContain('href="data:');
    expect(output).toContain('href="https://example.com"');
    expect(output).toContain('href="mailto:support@example.com"');
    expect(output).toContain('href="./docs/guide.md"');
    expect(output).toContain('href="#section-anchor"');
  });

  it('preserves safe img src protocols and relative paths while stripping javascript:', async () => {
    const input = `
<img src="javascript:alert(1)" alt="bad">
<img src="https://example.com/image.png" alt="https">
<img src="local-asset:/path/to/img.png" alt="local">
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==" alt="data">
<img src="./assets/chart.png" alt="rel">
`;
    const output = await processMarkdown(input);
    expect(output).not.toContain('src="javascript:');
    expect(output).toContain('src="https://example.com/image.png"');
    expect(output).toContain('src="local-asset:/path/to/img.png"');
    expect(output).toContain('src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="');
    expect(output).toContain('src="./assets/chart.png"');
  });

  it('retains MathML tags and <style> in schema for subsequent pipeline stages', async () => {
    const input = `
<style>.my-box { color: green; }</style>
<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></math>
`;
    const output = await processMarkdown(input);
    expect(output).toContain('<style>.my-box { color: green; }</style>');
    expect(output).toContain('<math');
    expect(output).toContain('<mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></math>');
  });
});
