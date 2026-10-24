import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Browser } from '@wailsio/runtime';
import { TabStore } from '../tabs/tabStore';
import { MarkdownViewer } from './MarkdownViewer';

vi.mock('@wailsio/runtime', () => ({
  Browser: {
    OpenURL: vi.fn().mockResolvedValue(undefined),
  },
}));

const goldenLinksAndAssetsFixture = `
# Golden Fixture: Links and Local Assets

## 1. Relative Local Images (FR-ASSET-001)

Valid relative images:
- Standard local image: ![Architecture Diagram](./images/arch.png "Architecture")
- Nested subfolder image: ![Sub Component](sub/nested/logo.svg "Component Logo")
- Path with spaces: ![Asset With Spaces](<./assets/spaces in name.png> "Spaces in Path")
- Path with Persian Unicode characters: ![نمودار معماری](<./assets/تصویر فارسی.png> "Persian Image")

## 2. Missing Assets & Error Placeholders (AC 2)

- Missing relative image: ![Missing Diagram](./images/missing-diagram.png "Missing Item")
- Missing deep asset: ![Nonexistent](./does-not-exist.jpg)

## 3. Remote Assets Blocked by Default (FR-ASSET-004)

- Remote HTTPS image: ![Remote CDN](https://cdn.example.com/analytics.png)
- Remote HTTP image: ![Insecure HTTP](http://insecure.org/tracker.gif)
- Protocol relative image: ![Protocol Relative](//cdn.example.com/asset.png)

## 4. Local Markdown Document Links (FR-ASSET-002, AC 4)

- Link to sibling document: [Next Chapter](./chapter2.md)
- Link to parent document: [Project Readme](../README.md)
- Link with anchor fragment: [Section Summary](./guide.markdown#summary)
- Link with .mdown extension: [Quick Reference](./reference.mdown)
- Link with .mkd extension: [Specification](./spec.mkd)

## 5. External Web Hyperlinks (FR-LINK-001, AC 5)

- External HTTPS website: [Wails Project](https://v3.wails.io)
- External HTTP website: [Legacy Site](http://example.org)
- External Email Link: [Contact Support](mailto:support@markdown-viewer.local)

## 6. Dangerous Links & Path Traversal Guards (PRD Section 8.1, AC 3, AC 6)

- XSS JavaScript scheme: [Execute Script](javascript:alert(document.cookie))
- Data URI scheme: [Data Payload](data:text/html,<script>alert(1)</script>)
- Direct local filesystem scheme: [System Passwd](file:///etc/passwd)
- Path traversal image: ![Secret Trap](../../../../etc/shadow)
`;

describe('Link and Asset Integration Test Suite (US-011.4)', () => {
  let tabStore: TabStore;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});

    tabStore = new TabStore({
      tabs: [
        {
          id: 'tab-1',
          filePath: '/home/user/docs/index.md',
          filename: 'index.md',
          parentDir: '/home/user/docs',
          displayTitle: 'index.md',
          content: '',
          status: 'ready',
        },
      ],
      activeTabId: 'tab-1',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies AC 1: relative image loads with correct /local-asset custom protocol URL and proportional sizing', () => {
    const markdown = '![Logo](./images/logo.png "Company Logo")';

    render(
      <MarkdownViewer
        document={{
          filePath: '/home/user/docs/index.md',
          filename: 'index.md',
          dir: '/home/user/docs',
          content: markdown,
        }}
      />
    );

    const img = screen.getByTestId('markdown-image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/local-asset/images/logo.png');
    expect(img).toHaveAttribute('alt', 'Logo');
    expect(img).toHaveAttribute('title', 'Company Logo');
    expect(img).toHaveClass('markdown-image');
  });

  it('verifies AC 2: missing relative image renders structured placeholder badge with exact text', () => {
    const markdown = '![Missing](./missing.png)';

    render(
      <MarkdownViewer
        document={{
          filePath: '/home/user/docs/index.md',
          filename: 'index.md',
          dir: '/home/user/docs',
          content: markdown,
        }}
      />
    );

    const img = screen.getByTestId('markdown-image');
    // Trigger runtime image load failure (simulating 404 from local-asset handler)
    fireEvent.error(img);

    const placeholder = screen.getByTestId('missing-asset-placeholder');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveClass('not-found-asset');

    const message = screen.getByTestId('missing-asset-message');
    expect(message).toHaveTextContent('Image not found: ./missing.png');
  });

  it('verifies AC 3: path traversal attempts return safe blocked placeholder and do not leak content', () => {
    const markdown = '![Secret](../../../../etc/shadow)';

    render(
      <MarkdownViewer
        document={{
          filePath: '/home/user/docs/index.md',
          filename: 'index.md',
          dir: '/home/user/docs',
          content: markdown,
        }}
      />
    );

    // No network img should be mounted
    expect(screen.queryByTestId('markdown-image')).toBeNull();

    const placeholder = screen.getByTestId('blocked-asset-placeholder');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveClass('blocked-asset');

    const message = screen.getByTestId('missing-asset-message');
    expect(message).toHaveTextContent('Path traversal or absolute filesystem path blocked');
  });

  it('verifies AC 4: clicking relative markdown link resolves path and opens in TabStore', () => {
    const markdown = 'Read the [Next Doc](./chapter2.md) for details.';

    render(
      <MarkdownViewer
        document={{
          filePath: '/home/user/docs/index.md',
          filename: 'index.md',
          dir: '/home/user/docs',
          content: markdown,
        }}
        onOpenDocument={(targetPath) => {
          tabStore.openTab({
            filePath: targetPath,
            content: '# Chapter 2 Content',
            status: 'ready',
          });
        }}
      />
    );

    const link = screen.getByRole('link', { name: /Next Doc/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('data-link-type', 'markdown');

    fireEvent.click(link);

    const state = tabStore.getState();
    expect(state.tabs.length).toBe(2);
    expect(state.tabs[1].filePath).toBe('/home/user/docs/chapter2.md');
    expect(state.activeTabId).toBe(state.tabs[1].id);
  });

  it('verifies AC 5: clicking external link opens in default browser without navigating WebView', () => {
    const markdown = 'Visit the [Website](https://example.com) for updates.';

    render(
      <MarkdownViewer
        document={{
          filePath: '/home/user/docs/index.md',
          filename: 'index.md',
          dir: '/home/user/docs',
          content: markdown,
        }}
      />
    );

    const link = screen.getByRole('link', { name: /Website/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('data-link-type', 'external');
    expect(link).toHaveClass('external-link');

    fireEvent.click(link);

    expect(Browser.OpenURL).toHaveBeenCalledTimes(1);
    expect(Browser.OpenURL).toHaveBeenCalledWith('https://example.com');
  });

  it('verifies AC 6: clicking malicious link (javascript:) does nothing and logs security warning', () => {
    const markdown = 'Click [XSS](javascript:alert(1)) here.';

    render(
      <MarkdownViewer
        document={{
          filePath: '/home/user/docs/index.md',
          filename: 'index.md',
          dir: '/home/user/docs',
          content: markdown,
        }}
      />
    );

    const link = screen.getByRole('link', { name: /XSS/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('data-link-type', 'blocked');
    expect(link).toHaveClass('blocked-link');

    fireEvent.click(link);

    // No navigation or external browser launcher triggered
    expect(Browser.OpenURL).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Security] Blocked navigation attempt to unsafe link: "javascript:alert(1)"')
    );
  });

  it('renders and verifies all constructs from golden links-and-assets.md fixture', () => {
    const openedDocs: string[] = [];

    render(
      <MarkdownViewer
        document={{
          filePath: '/home/user/workspace/docs/guide.md',
          filename: 'guide.md',
          dir: '/home/user/workspace/docs',
          content: goldenLinksAndAssetsFixture,
        }}
        onOpenDocument={(p) => openedDocs.push(p)}
      />
    );

    // 1. Verify valid relative images rendered with /local-asset endpoint
    const images = screen.getAllByTestId('markdown-image');
    expect(images.length).toBeGreaterThanOrEqual(4);
    expect(images[0]).toHaveAttribute('src', '/local-asset/images/arch.png');
    expect(images[1]).toHaveAttribute('src', '/local-asset/sub/nested/logo.svg');
    expect(images[2]).toHaveAttribute('src', '/local-asset/assets/spaces%20in%20name.png');
    expect(images[3]).toHaveAttribute(
      'src',
      `/local-asset/assets/${encodeURIComponent('تصویر فارسی.png')}`
    );

    // 2. Trigger error on missing images to verify fallback badges
    fireEvent.error(images[0]); // simulate missing
    expect(screen.getByText('Image not found: ./images/arch.png')).toBeInTheDocument();

    // 3. Verify remote images blocked by default
    const blockedImages = screen.getAllByTestId('blocked-asset-placeholder');
    expect(blockedImages.length).toBeGreaterThanOrEqual(4); // 3 remote + 1 traversal

    // 4. Test clicking markdown links
    const nextChapterLink = screen.getByRole('link', { name: /Next Chapter/i });
    fireEvent.click(nextChapterLink);
    expect(openedDocs).toContain('/home/user/workspace/docs/chapter2.md');

    const readmeLink = screen.getByRole('link', { name: /Project Readme/i });
    fireEvent.click(readmeLink);
    expect(openedDocs).toContain('/home/user/workspace/README.md');

    // 5. Test clicking external links
    const wailsLink = screen.getByRole('link', { name: /Wails Project/i });
    fireEvent.click(wailsLink);
    expect(Browser.OpenURL).toHaveBeenCalledWith('https://v3.wails.io');

    const mailtoLink = screen.getByRole('link', { name: /Contact Support/i });
    fireEvent.click(mailtoLink);
    expect(Browser.OpenURL).toHaveBeenCalledWith('mailto:support@markdown-viewer.local');

    // 6. Test clicking malicious links
    const xssLink = screen.getByRole('link', { name: /Execute Script/i });
    fireEvent.click(xssLink);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Security] Blocked navigation attempt to unsafe link')
    );
  });
});
