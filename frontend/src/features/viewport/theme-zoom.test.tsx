import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { AppShell } from '../shell/AppShell';
import { themeStore } from './themeStore';
import { zoomController } from './zoomController';
import { detectAppTheme } from '../rendering/mermaid-adapter';
import fs from 'fs';
import path from 'path';

describe('Document Viewport Controls: Themes & Zoom Integration Suite (US-023.4)', () => {
  let matchesDark = true;

  beforeEach(() => {
    matchesDark = true;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark') ? matchesDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    themeStore.setTheme('system');
    themeStore.initMediaListener();
    themeStore.applyToDom();
    zoomController.resetZoom();
  });

  afterEach(() => {
    themeStore.setTheme('system');
    zoomController.resetZoom();
    vi.restoreAllMocks();
  });

  describe('Theme Controls and DOM Synchronization', () => {
    it('cycles theme between light and dark via toolbar button with override from system', async () => {
      render(<AppShell />);

      const themeBtn = screen.getByTestId('top-theme-toggle');
      expect(themeBtn).toBeInTheDocument();

      // Default system with dark OS
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);

      // 1. Click to toggle -> Light
      fireEvent.click(themeBtn);
      expect(themeStore.getPreference()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.body.classList.contains('theme-light')).toBe(true);
      expect(document.body.classList.contains('theme-dark')).toBe(false);

      // 2. Click to toggle -> Dark
      fireEvent.click(themeBtn);
      expect(themeStore.getPreference()).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.body.classList.contains('theme-dark')).toBe(true);

      // 3. Click to toggle -> Light (cycles only between light and dark)
      fireEvent.click(themeBtn);
      expect(themeStore.getPreference()).toBe('light');
    });

    it('adapts Mermaid diagram theme dynamically when themeStore changes', async () => {
      // Start in dark mode
      themeStore.setTheme('dark');
      expect(detectAppTheme()).toBe('dark');

      const markdown = `
# Architecture Diagram

\`\`\`mermaid
graph TD
    Client --> Server
    Server --> Database
\`\`\`
`;

      render(
        <MarkdownViewer
          document={{
            filename: 'diag.md',
            filePath: '/docs/diag.md',
            content: markdown,
          }}
        />
      );

      // Wait for initial Mermaid diagram mount
      await waitFor(() => {
        const container = screen.getByTestId('mermaid-container');
        expect(container).toHaveAttribute('data-mermaid-theme', 'dark');
      });

      // Switch theme to light via store
      act(() => {
        themeStore.setTheme('light');
      });

      expect(detectAppTheme()).toBe('default');

      // Diagram container detects DOM attribute change and updates to default (light) theme
      await waitFor(() => {
        const container = screen.getByTestId('mermaid-container');
        expect(container).toHaveAttribute('data-mermaid-theme', 'default');
      });
    });

    it('ensures Shiki code syntax rules include dual-theme selectors in markdown.css', () => {
      const cssPath = path.resolve(__dirname, '../rendering/markdown.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      expect(cssContent).toContain('.shiki span');
      expect(cssContent).toContain('--shiki-dark');
      expect(cssContent).toContain('[data-theme="light"] .shiki span');
      expect(cssContent).toContain('--shiki-light');
    });
  });

  describe('Zoom Controls and Value Bounds', () => {
    it('initializes at 100% zoom and increments/decrements in 10% steps', () => {
      render(
        <MarkdownViewer
          document={{
            filename: 'test.md',
            filePath: '/docs/test.md',
            content: '# Zoomable Document',
          }}
        />
      );

      const zoomInBtn = screen.getByTestId('doc-zoom-in');
      const zoomOutBtn = screen.getByTestId('doc-zoom-out');
      const zoomDisplay = screen.getByTestId('doc-zoom-reset');
      const viewportBody = screen.getByTestId('markdown-viewport-body');

      expect(zoomDisplay).toHaveTextContent('100%');
      expect(viewportBody.style.zoom).toBe('1');

      // Zoom In -> 110%
      fireEvent.click(zoomInBtn);
      expect(zoomDisplay).toHaveTextContent('110%');
      expect(viewportBody.style.zoom).toBe('1.1');

      // Zoom Out -> 100% -> 90%
      fireEvent.click(zoomOutBtn);
      expect(zoomDisplay).toHaveTextContent('100%');
      expect(viewportBody.style.zoom).toBe('1');

      fireEvent.click(zoomOutBtn);
      expect(zoomDisplay).toHaveTextContent('90%');
      expect(viewportBody.style.zoom).toBe('0.9');

      // Reset
      fireEvent.click(zoomDisplay);
      expect(zoomDisplay).toHaveTextContent('100%');
      expect(viewportBody.style.zoom).toBe('1');
    });

    it('enforces upper bound clamping at 250% and disables zoom in button', () => {
      render(
        <MarkdownViewer
          document={{
            filename: 'test.md',
            filePath: '/docs/test.md',
            content: '# Max Zoom Document',
          }}
        />
      );

      const zoomInBtn = screen.getByTestId('doc-zoom-in');
      const zoomDisplay = screen.getByTestId('doc-zoom-reset');

      // Set zoom to 240%
      act(() => {
        zoomController.setZoom(240);
      });

      expect(zoomDisplay).toHaveTextContent('240%');
      expect(zoomInBtn).not.toBeDisabled();

      // Click to reach 250%
      fireEvent.click(zoomInBtn);
      expect(zoomDisplay).toHaveTextContent('250%');
      expect(zoomInBtn).toBeDisabled();

      // Additional clicks do not exceed 250%
      fireEvent.click(zoomInBtn);
      expect(zoomDisplay).toHaveTextContent('250%');
      expect(zoomController.getZoom()).toBe(250);
    });

    it('enforces lower bound clamping at 50% and disables zoom out button', () => {
      render(
        <MarkdownViewer
          document={{
            filename: 'test.md',
            filePath: '/docs/test.md',
            content: '# Min Zoom Document',
          }}
        />
      );

      const zoomOutBtn = screen.getByTestId('doc-zoom-out');
      const zoomDisplay = screen.getByTestId('doc-zoom-reset');

      // Set zoom to 60%
      act(() => {
        zoomController.setZoom(60);
      });

      expect(zoomDisplay).toHaveTextContent('60%');
      expect(zoomOutBtn).not.toBeDisabled();

      // Click to reach 50%
      fireEvent.click(zoomOutBtn);
      expect(zoomDisplay).toHaveTextContent('50%');
      expect(zoomOutBtn).toBeDisabled();

      // Additional clicks do not go below 50%
      fireEvent.click(zoomOutBtn);
      expect(zoomDisplay).toHaveTextContent('50%');
      expect(zoomController.getZoom()).toBe(50);
    });

    it('handles keyboard shortcuts for zoom in, zoom out, and reset', () => {
      render(
        <MarkdownViewer
          document={{
            filename: 'test.md',
            filePath: '/docs/test.md',
            content: '# Shortcut Zoom Document',
          }}
        />
      );

      const zoomDisplay = screen.getByTestId('doc-zoom-reset');
      const viewportBody = screen.getByTestId('markdown-viewport-body');

      expect(zoomDisplay).toHaveTextContent('100%');

      // Ctrl + '=' (Zoom in)
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: '=', ctrlKey: true, bubbles: true })
        );
      });
      expect(zoomDisplay).toHaveTextContent('110%');
      expect(viewportBody.style.zoom).toBe('1.1');

      // Ctrl + '-' (Zoom out)
      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: '-', ctrlKey: true, bubbles: true })
        );
      });
      expect(zoomDisplay).toHaveTextContent('100%');
      expect(viewportBody.style.zoom).toBe('1');

      // Ctrl + '0' (Reset zoom from 140%)
      act(() => {
        zoomController.setZoom(140);
      });
      expect(zoomDisplay).toHaveTextContent('140%');

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: '0', ctrlKey: true, bubbles: true })
        );
      });
      expect(zoomDisplay).toHaveTextContent('100%');
      expect(viewportBody.style.zoom).toBe('1');
    });
  });
});
