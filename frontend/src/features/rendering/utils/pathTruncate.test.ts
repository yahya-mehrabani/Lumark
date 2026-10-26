import { describe, it, expect } from 'vitest';
import { truncateMiddlePath } from './pathTruncate';

describe('truncateMiddlePath (Item 11)', () => {
  it('returns short paths without truncation', () => {
    expect(truncateMiddlePath('/docs/intro.md', 38)).toBe('/docs/intro.md');
    expect(truncateMiddlePath('README.md', 38)).toBe('README.md');
  });

  it('middle-truncates long POSIX paths keeping filename and leading root visible', () => {
    const longPath = '/home/repos/personal/markdown-go/fixtures/security/mermaid-injection.md';
    const truncated = truncateMiddlePath(longPath, 38);

    expect(truncated).toContain('mermaid-injection.md');
    expect(truncated).toContain('/home/.../');
    expect(truncated.length).toBeLessThanOrEqual(38);
  });

  it('middle-truncates Windows paths with backslashes', () => {
    const winPath = 'C:\\Users\\Developer\\Projects\\markdown-go\\deep\\folder\\guide.md';
    const truncated = truncateMiddlePath(winPath, 35);

    expect(truncated).toContain('guide.md');
    expect(truncated).toContain('C:\\...\\');
    expect(truncated.length).toBeLessThanOrEqual(35);
  });

  it('handles very long filenames by middle-truncating the filename itself', () => {
    const longFilenamePath = '/docs/super-extraordinarily-unbelievably-long-filename-document-spec.md';
    const truncated = truncateMiddlePath(longFilenamePath, 35);

    expect(truncated.length).toBeLessThanOrEqual(35);
    expect(truncated).toContain('...');
    expect(truncated.startsWith('/docs')).toBe(true);
  });
});
