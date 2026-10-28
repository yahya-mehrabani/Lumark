import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { defaultToastStore } from '../notifications';
import { zoomController } from '../viewport/zoomController';

describe('Table of Contents Click Navigation & Native Scroll Alignment', () => {
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

  it('scrolls document target into view with calculated scrollTo behavior and synchronizes active outline state', () => {
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

    // Verify container scrollTo called with calculated top and smooth behavior
    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'smooth',
      })
    );

    // Verify active class immediately updated
    expect(installLink).toHaveClass('active');
    expect(installLink).toHaveAttribute('aria-current', 'location');
  });

  it('invokes container scrollTo reliably across different zoom levels', () => {
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
    scrollToMock.mockClear();

    fireEvent.click(deepLink);

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'smooth',
      })
    );

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
    scrollToMock.mockClear();

    fireEvent.click(deepLink75);

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'smooth',
      })
    );
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

    scrollToMock.mockClear();
    fireEvent.click(screen.getByTestId('toc-link-next'));

    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        behavior: 'auto',
      })
    );
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
      expect(toastSpy.mock.calls[0][0]).toContain('scrollTo dispatched');
    });
  });

  it('calculates exact scrollTo position accounting for floating toolbar offset', () => {
    const markdown = `# Title\n\n## Custom Offset Heading`;
    render(<MarkdownViewer document={{ filename: 'offset.md', content: markdown }} showToc={true} />);

    const targetHeading = document.getElementById('custom-offset-heading')!;
    targetHeading.getBoundingClientRect = vi.fn().mockReturnValue({ top: 350 });
    const viewport = document.querySelector('.markdown-viewport') as HTMLElement;
    const scrollToSpy = vi.fn();
    viewport.scrollTo = scrollToSpy;

    fireEvent.click(screen.getByTestId('toc-link-custom-offset-heading'));

    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 270,
      behavior: 'smooth',
    });
  });
});
