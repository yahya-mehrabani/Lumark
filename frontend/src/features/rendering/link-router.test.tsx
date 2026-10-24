import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Browser } from '@wailsio/runtime';
import { classifyLink, resolveRelativePath, dispatchLink } from './link-router';
import { MarkdownLink } from './components/MarkdownLink';
import { MarkdownViewer } from './MarkdownViewer';

vi.mock('@wailsio/runtime', () => ({
  Browser: {
    OpenURL: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Link Router & Protocol Dispatcher (US-011.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveRelativePath', () => {
    it('resolves relative paths against base directory', () => {
      expect(resolveRelativePath('/home/user/docs', './guide.md')).toBe('/home/user/docs/guide.md');
      expect(resolveRelativePath('/home/user/docs', 'guide.md')).toBe('/home/user/docs/guide.md');
      expect(resolveRelativePath('/home/user/docs', '../readme.md')).toBe('/home/user/readme.md');
      expect(resolveRelativePath('/home/user/docs', '../../root.md')).toBe('/home/root.md');
      expect(resolveRelativePath('/home/user/docs', 'sub/nested.markdown')).toBe(
        '/home/user/docs/sub/nested.markdown'
      );
    });

    it('works when base directory is empty', () => {
      expect(resolveRelativePath('', './guide.md')).toBe('guide.md');
      expect(resolveRelativePath('', 'sub/doc.md')).toBe('sub/doc.md');
    });

    it('normalizes Windows-style backslashes', () => {
      expect(resolveRelativePath('C:/Users/docs', '.\\guide.md')).toBe('C:/Users/docs/guide.md');
      expect(resolveRelativePath('C:/Users/docs', '..\\notes.md')).toBe('C:/Users/notes.md');
    });
  });

  describe('classifyLink', () => {
    it('classifies external HTTP, HTTPS, and mailto links', () => {
      const httpsLink = classifyLink('https://example.com');
      expect(httpsLink.type).toBe('external');
      expect(httpsLink.isBlocked).toBe(false);
      expect(httpsLink.url).toBe('https://example.com');

      const httpLink = classifyLink('http://insecure.org/path');
      expect(httpLink.type).toBe('external');
      expect(httpLink.url).toBe('http://insecure.org/path');

      const mailtoLink = classifyLink('mailto:support@example.com');
      expect(mailtoLink.type).toBe('external');
      expect(mailtoLink.url).toBe('mailto:support@example.com');
    });

    it('classifies relative Markdown document links with extensions .md, .markdown, .mdown, .mkd', () => {
      const docDir = '/workspace/docs';

      const mdLink = classifyLink('./chapter2.md', docDir);
      expect(mdLink.type).toBe('markdown');
      expect(mdLink.isBlocked).toBe(false);
      expect(mdLink.targetPath).toBe('/workspace/docs/chapter2.md');

      const markdownLink = classifyLink('reference.markdown#syntax', docDir);
      expect(markdownLink.type).toBe('markdown');
      expect(markdownLink.targetPath).toBe('/workspace/docs/reference.markdown');
      expect(markdownLink.anchor).toBe('syntax');

      const mdownLink = classifyLink('../guide.mdown', docDir);
      expect(mdownLink.type).toBe('markdown');
      expect(mdownLink.targetPath).toBe('/workspace/guide.mdown');

      const mkdLink = classifyLink('spec.mkd', docDir);
      expect(mkdLink.type).toBe('markdown');
    });

    it('classifies in-page anchor links', () => {
      const anchor = classifyLink('#section-summary');
      expect(anchor.type).toBe('anchor');
      expect(anchor.anchor).toBe('section-summary');
      expect(anchor.isBlocked).toBe(false);
    });

    it('classifies other local non-markdown files', () => {
      const pdfLink = classifyLink('./manual.pdf', '/workspace/docs');
      expect(pdfLink.type).toBe('local_other');
      expect(pdfLink.targetPath).toBe('/workspace/docs/manual.pdf');
    });

    it('strictly blocks dangerous schemes (AC 6)', () => {
      const jsLink = classifyLink('javascript:alert(1)');
      expect(jsLink.type).toBe('blocked');
      expect(jsLink.isBlocked).toBe(true);

      const dataLink = classifyLink('data:text/html,<script>alert(1)</script>');
      expect(dataLink.type).toBe('blocked');
      expect(dataLink.isBlocked).toBe(true);

      const fileLink = classifyLink('file:///etc/passwd');
      expect(fileLink.type).toBe('blocked');
      expect(fileLink.isBlocked).toBe(true);

      const unknownLink = classifyLink('customapp://run-shell');
      expect(unknownLink.type).toBe('blocked');
      expect(unknownLink.isBlocked).toBe(true);
    });
  });

  describe('dispatchLink', () => {
    it('delegates external links to Browser.OpenURL (AC 5)', async () => {
      const res = await dispatchLink('https://example.com');
      expect(res.type).toBe('external');
      expect(Browser.OpenURL).toHaveBeenCalledWith('https://example.com');
    });

    it('delegates external links to custom onOpenExternal callback if provided', async () => {
      const onOpenExternal = vi.fn();
      await dispatchLink('https://example.com', { onOpenExternal });
      expect(onOpenExternal).toHaveBeenCalledWith('https://example.com');
      expect(Browser.OpenURL).not.toHaveBeenCalled();
    });

    it('routes relative markdown link to onOpenMarkdown (AC 4)', async () => {
      const onOpenMarkdown = vi.fn();
      const res = await dispatchLink('./chapter2.md#intro', {
        docDir: '/workspace/docs',
        onOpenMarkdown,
      });

      expect(res.type).toBe('markdown');
      expect(onOpenMarkdown).toHaveBeenCalledWith('/workspace/docs/chapter2.md', 'intro');
    });

    it('blocks dangerous link, logs warning, and does not invoke open handlers (AC 6)', async () => {
      const onOpenExternal = vi.fn();
      const onOpenMarkdown = vi.fn();

      const res = await dispatchLink('javascript:alert(1)', {
        onOpenExternal,
        onOpenMarkdown,
      });

      expect(res.isBlocked).toBe(true);
      expect(onOpenExternal).not.toHaveBeenCalled();
      expect(onOpenMarkdown).not.toHaveBeenCalled();
      expect(Browser.OpenURL).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[Security] Blocked navigation attempt to unsafe link')
      );
    });
  });

  describe('MarkdownLink Component & MarkdownViewer Integration', () => {
    it('intercepts click on relative Markdown link and invokes onOpenMarkdown (AC 4)', () => {
      const onOpenMarkdown = vi.fn();
      render(
        <MarkdownLink
          href="./chapter2.md"
          docDir="/docs"
          onOpenMarkdown={onOpenMarkdown}
        >
          Next Document
        </MarkdownLink>
      );

      const link = screen.getByRole('link', { name: /Next Document/i });
      fireEvent.click(link);

      expect(onOpenMarkdown).toHaveBeenCalledWith('/docs/chapter2.md', undefined);
    });

    it('intercepts click on external link and delegates to OS browser (AC 5)', () => {
      const onOpenExternal = vi.fn();
      render(
        <MarkdownLink
          href="https://example.com"
          onOpenExternal={onOpenExternal}
        >
          External Site
        </MarkdownLink>
      );

      const link = screen.getByRole('link', { name: /External Site/i });
      fireEvent.click(link);

      expect(onOpenExternal).toHaveBeenCalledWith('https://example.com');
      expect(link).toHaveClass('external-link');
    });

    it('blocks click on javascript: XSS link and logs security warning (AC 6)', () => {
      const onOpenExternal = vi.fn();
      const onOpenMarkdown = vi.fn();

      render(
        <MarkdownLink
          href="javascript:alert(1)"
          onOpenExternal={onOpenExternal}
          onOpenMarkdown={onOpenMarkdown}
        >
          Malicious Link
        </MarkdownLink>
      );

      const link = screen.getByRole('link', { name: /Malicious Link/i });
      fireEvent.click(link);

      expect(onOpenExternal).not.toHaveBeenCalled();
      expect(onOpenMarkdown).not.toHaveBeenCalled();
      expect(Browser.OpenURL).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[Security] Blocked navigation attempt')
      );
    });

    it('integrates with MarkdownViewer end-to-end for links', () => {
      const onOpenDocument = vi.fn();
      const onOpenExternalUrl = vi.fn();

      const markdown = `
# Links Test

Read the [Next Chapter](./chapter2.md).
Visit our [Official Website](https://markdown-viewer.dev).
Try this [Evil Action](javascript:maliciousCode()).
`;

      render(
        <MarkdownViewer
          document={{
            filePath: '/home/user/docs/index.md',
            filename: 'index.md',
            dir: '/home/user/docs',
            content: markdown,
          }}
          onOpenDocument={onOpenDocument}
          onOpenExternalUrl={onOpenExternalUrl}
        />
      );

      // 1. Click relative link -> calls onOpenDocument with resolved path
      const docLink = screen.getByRole('link', { name: /Next Chapter/i });
      fireEvent.click(docLink);
      expect(onOpenDocument).toHaveBeenCalledWith('/home/user/docs/chapter2.md', undefined);

      // 2. Click external link -> calls onOpenExternalUrl
      const webLink = screen.getByRole('link', { name: /Official Website/i });
      fireEvent.click(webLink);
      expect(onOpenExternalUrl).toHaveBeenCalledWith('https://markdown-viewer.dev');

      // 3. Click javascript link -> blocked
      const xssLink = screen.getByRole('link', { name: /Evil Action/i });
      fireEvent.click(xssLink);
      expect(onOpenDocument).toHaveBeenCalledTimes(1);
      expect(onOpenExternalUrl).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
