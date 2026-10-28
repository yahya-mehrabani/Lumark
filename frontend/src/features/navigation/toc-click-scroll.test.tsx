import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { defaultToastStore } from '../notifications';
import { zoomController } from '../viewport/zoomController';

describe('Table of Contents Click Navigation & Geometry Synchronization', () => {
  let scrollToMock: ReturnType<typeof vi.fn>;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    scrollToMock = vi.fn();
    window.HTMLElement.prototype.scrollTo =
      scrollToMock as unknown as typeof Element.prototype.scrollTo;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    localStorage.clear();
    zoomController.resetZoom();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    zoomController.resetZoom();
  });

  it('scrolls document container to computed relative offset with smooth behavior and synchronizes active outline state', () => {
    const markdown = `
# Getting Started

Welcome to the guide.

## Installation

Run the installer.

## Configuration

Set options.
`;

    render(
      <MarkdownViewer
        document={{ filename: 'guide.md', content: markdown }}
        showToc={true}
      />
    );

    const installLink = screen.getByTestId('toc-link-installation');
    expect(installLink).toBeInTheDocument();
    expect(installLink).not.toHaveClass('active');

    const installHeading = document.getElementById('installation');
    expect(installHeading).not.toBeNull();

    const container = screen.getByTestId('markdown-content');
    expect(container).toBeInTheDocument();

    // Mock geometry
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 600,
      left: 0,
      right: 800,
      width: 800,
      height: 500,
      x: 0,
      y: 100,
      toJSON: () => {},
    });

    vi.spyOn(installHeading!, 'getBoundingClientRect').mockReturnValue({
      top: 350,
      bottom: 380,
      left: 0,
      right: 800,
      width: 800,
      height: 30,
      x: 0,
      y: 350,
      toJSON: () => {},
    });

    container.scrollTop = 50;

    // Click Installation outline link
    fireEvent.click(installLink);

    // Expected target top: container.scrollTop (50) + (350 - 100) / 1.0 - 80 = 50 + 250 - 80 = 220
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 220,
      behavior: 'smooth',
    });

    // Verify active class immediately updated
    expect(installLink).toHaveClass('active');
    expect(installLink).toHaveAttribute('aria-current', 'location');
  });

  it('correctly accounts for zoom levels (150% and 75%) when computing scroll offset', () => {
    const markdown = `
# Introduction

Paragraph.

## Deep Section

Deep content.
`;

    zoomController.setZoom(150);

    const { unmount } = render(
      <MarkdownViewer
        document={{ filename: 'zoom-test.md', content: markdown }}
        showToc={true}
      />
    );

    const container = screen.getByTestId('markdown-content');
    const targetHeading = document.getElementById('deep-section')!;
    const deepLink = screen.getByTestId('toc-link-deep-section');

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 80,
      bottom: 580,
      left: 0,
      right: 800,
      width: 800,
      height: 500,
      x: 0,
      y: 80,
      toJSON: () => {},
    });

    // Screen delta = 380 - 80 = 300px
    vi.spyOn(targetHeading, 'getBoundingClientRect').mockReturnValue({
      top: 380,
      bottom: 410,
      left: 0,
      right: 800,
      width: 800,
      height: 30,
      x: 0,
      y: 380,
      toJSON: () => {},
    });

    container.scrollTop = 0;
    scrollToMock.mockClear();

    fireEvent.click(deepLink);

    // Delta: 300 / 1.5 = 200. Target top: 0 + 200 - 80 = 120
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 120,
      behavior: 'smooth',
    });

    unmount();

    // Zoom test at 75%
    zoomController.setZoom(75);

    render(
      <MarkdownViewer
        document={{ filename: 'zoom-test-2.md', content: markdown }}
        showToc={true}
      />
    );

    const container75 = screen.getByTestId('markdown-content');
    const targetHeading75 = document.getElementById('deep-section')!;
    const deepLink75 = screen.getByTestId('toc-link-deep-section');

    vi.spyOn(container75, 'getBoundingClientRect').mockReturnValue({
      top: 80,
      bottom: 580,
      left: 0,
      right: 800,
      width: 800,
      height: 500,
      x: 0,
      y: 80,
      toJSON: () => {},
    });

    // Screen delta at 75% = 150px (230 - 80)
    vi.spyOn(targetHeading75, 'getBoundingClientRect').mockReturnValue({
      top: 230,
      bottom: 260,
      left: 0,
      right: 800,
      width: 800,
      height: 30,
      x: 0,
      y: 230,
      toJSON: () => {},
    });

    container75.scrollTop = 0;
    scrollToMock.mockClear();

    fireEvent.click(deepLink75);

    // Delta: 150 / 0.75 = 200. Target top: 0 + 200 - 80 = 120
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 120,
      behavior: 'smooth',
    });
  });

  it('respects prefers-reduced-motion with behavior auto', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const markdown = `# Title\n\n## Next`;
    render(<MarkdownViewer document={{ filename: 'motion.md', content: markdown }} showToc={true} />);

    const container = screen.getByTestId('markdown-content');
    const nextHeading = document.getElementById('next')!;
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 500, left: 0, right: 500, width: 500, height: 500, x: 0, y: 0, toJSON: () => {} });
    vi.spyOn(nextHeading, 'getBoundingClientRect').mockReturnValue({ top: 200, bottom: 230, left: 0, right: 500, width: 500, height: 30, x: 0, y: 200, toJSON: () => {} });

    scrollToMock.mockClear();
    fireEvent.click(screen.getByTestId('toc-link-next'));

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 120,
      behavior: 'auto',
    });
  });

  it('triggers diagnostic toast notification when localStorage.debugOutline is enabled', async () => {
    localStorage.setItem('debugOutline', '1');
    const toastSpy = vi.spyOn(defaultToastStore, 'showInfo');

    const markdown = `# Title\n\n## Section One`;
    render(<MarkdownViewer document={{ filename: 'diag.md', content: markdown }} showToc={true} />);

    const container = screen.getByTestId('markdown-content');
    Object.defineProperty(container, 'scrollHeight', { value: 1200, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });

    fireEvent.click(screen.getByTestId('toc-link-section-one'));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(1);
      expect(toastSpy.mock.calls[0][0]).toContain('[Outline Debug]');
      expect(toastSpy.mock.calls[0][0]).toContain('Target: "section-one"');
      expect(toastSpy.mock.calls[0][0]).toContain('Scrollable: true');
    });
  });

  it('calculates scroll position from target.offsetTop minus HEADER_OFFSET without calling scrollIntoView', () => {
    const markdown = `# Title\n\n## Custom Offset Heading`;
    render(<MarkdownViewer document={{ filename: 'offset.md', content: markdown }} showToc={true} />);

    const container = screen.getByTestId('markdown-content');
    const targetHeading = document.getElementById('custom-offset-heading')!;

    // Simulate real browser offsetTop
    Object.defineProperty(targetHeading, 'offsetTop', { value: 450, configurable: true });
    Object.defineProperty(targetHeading, 'offsetParent', { value: container, configurable: true });

    const scrollIntoViewSpy = vi.fn();
    targetHeading.scrollIntoView = scrollIntoViewSpy;

    scrollToMock.mockClear();
    fireEvent.click(screen.getByTestId('toc-link-custom-offset-heading'));

    // offsetTop (450) - HEADER_OFFSET (80) = 370
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 370,
      behavior: 'smooth',
    });
    expect(scrollIntoViewSpy).not.toHaveBeenCalled();
  });
});
