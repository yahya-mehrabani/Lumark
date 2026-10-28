import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { defaultToastStore } from '../notifications';
import { zoomController } from '../viewport/zoomController';

describe('Table of Contents Click Navigation & Native Scroll Alignment', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView =
      scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;
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

  it('scrolls document target into view with native smooth behavior and synchronizes active outline state', () => {
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

    // Click Installation outline link
    fireEvent.click(installLink);

    // Verify native scrollIntoView called with smooth behavior and start block
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });

    // Verify active class immediately updated
    expect(installLink).toHaveClass('active');
    expect(installLink).toHaveAttribute('aria-current', 'location');
  });

  it('invokes native scrollIntoView reliably across different zoom levels', () => {
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

    const deepLink = screen.getByTestId('toc-link-deep-section');
    scrollIntoViewMock.mockClear();

    fireEvent.click(deepLink);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
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

    const deepLink75 = screen.getByTestId('toc-link-deep-section');
    scrollIntoViewMock.mockClear();

    fireEvent.click(deepLink75);

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
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

    scrollIntoViewMock.mockClear();
    fireEvent.click(screen.getByTestId('toc-link-next'));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });

  it('triggers diagnostic toast notification when localStorage.debugOutline is enabled', async () => {
    localStorage.setItem('debugOutline', '1');
    const toastSpy = vi.spyOn(defaultToastStore, 'showInfo');

    const markdown = `# Title\n\n## Section One`;
    render(<MarkdownViewer document={{ filename: 'diag.md', content: markdown }} showToc={true} />);

    fireEvent.click(screen.getByTestId('toc-link-section-one'));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledTimes(1);
      expect(toastSpy.mock.calls[0][0]).toContain('[Outline Debug]');
      expect(toastSpy.mock.calls[0][0]).toContain('Target: "section-one"');
      expect(toastSpy.mock.calls[0][0]).toContain('scrollIntoView dispatched');
    });
  });

  it('invokes native scrollIntoView on target heading with smooth behavior and start block', () => {
    const markdown = `# Title\n\n## Custom Offset Heading`;
    render(<MarkdownViewer document={{ filename: 'offset.md', content: markdown }} showToc={true} />);

    const targetHeading = document.getElementById('custom-offset-heading')!;
    const scrollIntoViewSpy = vi.fn();
    targetHeading.scrollIntoView = scrollIntoViewSpy;

    fireEvent.click(screen.getByTestId('toc-link-custom-offset-heading'));

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });
});
