import { describe, it, expect, beforeEach } from 'vitest';
import {
  initMermaid,
  getMermaidConfig,
  renderMermaid,
  parseMermaid,
} from './mermaid-adapter';
import { sanitizeSvg } from './utils/sanitize-svg';

describe('Mermaid Adapter & Strict Configuration (US-013.1)', () => {
  beforeEach(() => {
    initMermaid();
  });

  it('initializes Mermaid with strict security configuration and manual loading', () => {
    const config = getMermaidConfig();
    expect(config.securityLevel).toBe('strict');
    expect(config.startOnLoad).toBe(false);
    expect(config.suppressErrorRendering).toBe(true);
    expect(config.flowchart?.htmlLabels).toBe(false);
  });

  it('forces a Vazirmatn font stack so Persian diagram text stays readable', () => {
    const config = getMermaidConfig();
    // themeVariables override every built-in theme (whose defaults are Latin-only
    // stacks like "trebuchet ms", so Persian falls back to a generic system font).
    expect(config.themeVariables?.fontFamily).toContain('Vazirmatn');
    expect(config.fontFamily).toContain('Vazirmatn');
    // Sequence diagrams bypass themeVariables via per-diagram font keys
    // (actorFontFamily/noteFontFamily/messageFontFamily).
    expect(config.sequence?.actorFontFamily).toContain('Vazirmatn');
    expect(config.sequence?.noteFontFamily).toContain('Vazirmatn');
    expect(config.sequence?.messageFontFamily).toContain('Vazirmatn');
  });

  it('emits the Vazirmatn font stack into rendered flowchart and sequence SVG text', async () => {
    const flowResult = await renderMermaid(
      'graph TD\n  سند[بارگذاری سند] --> تشخیص{مسیر /*check*/ معیار}'
    );
    expect(flowResult.svg).toContain('font-family');
    expect(flowResult.svg).toContain('Vazirmatn');

    const seqResult = await renderMermaid(
      'sequenceDiagram\n    علی-->>رضا: سلام رضا\n    رضا-->>علی: سلام علی'
    );
    expect(seqResult.svg).toContain('font-family');
    expect(seqResult.svg).toContain('Vazirmatn');
  });

  it('enforces securityLevel: strict even if caller attempts to override with loose settings', () => {
    // Attempting to downgrade security
    const config = initMermaid({
      securityLevel: 'loose',
      startOnLoad: true,
    });

    expect(config.securityLevel).toBe('strict');
    expect(config.startOnLoad).toBe(false);
  });

  it('renders a basic flowchart into valid SVG offline', async () => {
    const code = `
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Result 1]
  B -->|No| D[Result 2]
`;
    const result = await renderMermaid(code);
    expect(result).toBeDefined();
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('Start');
    expect(result.svg).toContain('Decision');
  });

  it('renders sequence diagrams and class diagrams offline', async () => {
    const sequenceCode = `
sequenceDiagram
  Alice->>Bob: Hello Bob
  Bob-->>Alice: Hi Alice
`;
    const seqResult = await renderMermaid(sequenceCode);
    expect(seqResult.svg).toContain('<svg');
    expect(seqResult.svg).toContain('Alice');
    expect(seqResult.svg).toContain('Bob');

    const classCode = `
classDiagram
  class Animal {
    +int age
    +String gender
    +isMammal()
  }
`;
    const classResult = await renderMermaid(classCode);
    expect(classResult.svg).toContain('<svg');
    expect(classResult.svg).toContain('Animal');
  });

  it('sanitizes rendered SVG by removing script tags and event handlers', async () => {
    // Test the SVG sanitizer directly to guarantee SEC-INVAR-07
    const maliciousSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <script>alert("XSS")</script>
  <circle cx="50" cy="50" r="40" onclick="alert(1)" onload="alert(2)" />
  <a href="javascript:alert(3)"><text>Click</text></a>
</svg>
`;
    const cleaned = sanitizeSvg(maliciousSvg);
    expect(cleaned).not.toContain('<script');
    expect(cleaned).not.toContain('onclick');
    expect(cleaned).not.toContain('onload');
    expect(cleaned).not.toContain('javascript:');
    expect(cleaned).toContain('<circle');
  });

  it('throws an error and cleans up temporary DOM nodes on invalid diagram syntax', async () => {
    const invalidCode = 'graph TD; A -->;';
    await expect(renderMermaid(invalidCode)).rejects.toThrow();

    // Verify no unhandled error containers left in body
    const errorContainers = document.querySelectorAll('.error-icon, [id^="dmermaid-"]');
    expect(errorContainers.length).toBe(0);
  });

  it('parses valid diagrams successfully via parseMermaid', async () => {
    const valid = 'graph LR; X --> Y;';
    const parsed = await parseMermaid(valid);
    expect(parsed).toBe(true);
  });
});
