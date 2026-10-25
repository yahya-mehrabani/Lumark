import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useRef } from 'react';
import {
  getSelectedText,
  copySelectionToClipboard,
  useSelectionCopy,
} from './selectionCopy';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import fs from 'fs';
import path from 'path';

describe('Document Viewport: Selection, Copy & Context Menu (US-023.5, FR-NAV-005)', () => {
  let clipboardText = '';

  beforeEach(() => {
    clipboardText = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockImplementation(async (text: string) => {
          clipboardText = text;
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSelectedText & copySelectionToClipboard Unit Tests', () => {
    it('returns empty string when there is no active text selection', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue(null);
      expect(getSelectedText()).toBe('');

      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => '',
      } as unknown as Selection);
      expect(getSelectedText()).toBe('');
    });

    it('returns selected text string when selection exists', () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => 'Hello Markdown Selection',
      } as unknown as Selection);
      expect(getSelectedText()).toBe('Hello Markdown Selection');
    });

    it('copySelectionToClipboard returns false and skips clipboard when selection is empty', async () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => '',
      } as unknown as Selection);

      const result = await copySelectionToClipboard();
      expect(result).toBe(false);
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });

    it('copySelectionToClipboard copies selected text and returns true', async () => {
      const selectedContent = 'Exact Selected Plain Text with Unicode: 🚀 — مرحبا';
      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => selectedContent,
      } as unknown as Selection);

      const result = await copySelectionToClipboard();
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(selectedContent);
      expect(clipboardText).toBe(selectedContent);
    });

    it('handles clipboard write failures gracefully without throwing', async () => {
      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => 'Selected Text',
      } as unknown as Selection);

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
        writable: true,
        configurable: true,
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await copySelectionToClipboard();
      expect(result).toBe(false);
      warnSpy.mockRestore();
    });
  });

  describe('useSelectionCopy Hook', () => {
    const TestComponent: React.FC<{ onCopied?: (text: string) => void }> = ({ onCopied }) => {
      const containerRef = useRef<HTMLDivElement | null>(null);
      useSelectionCopy({ containerRef, onCopied });

      return (
        <div ref={containerRef} data-testid="test-container">
          <p data-testid="p1">Inside container text</p>
        </div>
      );
    };

    it('copies selection on Ctrl+C and invokes onCopied callback', async () => {
      const onCopied = vi.fn();
      render(<TestComponent onCopied={onCopied} />);
      const p = screen.getByTestId('p1');

      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => 'Inside container text',
        anchorNode: p,
      } as unknown as Selection);

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);

      // Event should NOT be defaultPrevented (preserves native copy behavior)
      expect(event.defaultPrevented).toBe(false);

      await vi.waitFor(() => {
        expect(onCopied).toHaveBeenCalledWith('Inside container text');
      });
      expect(clipboardText).toBe('Inside container text');
    });

    it('copies selection on Cmd+C (macOS metaKey)', async () => {
      const onCopied = vi.fn();
      render(<TestComponent onCopied={onCopied} />);
      const p = screen.getByTestId('p1');

      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => 'Meta copy text',
        anchorNode: p,
      } as unknown as Selection);

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);

      await vi.waitFor(() => {
        expect(onCopied).toHaveBeenCalledWith('Meta copy text');
      });
      expect(clipboardText).toBe('Meta copy text');
    });

    it('ignores plain "c" key without modifier', async () => {
      const onCopied = vi.fn();
      render(<TestComponent onCopied={onCopied} />);

      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => 'Should not copy',
      } as unknown as Selection);

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(onCopied).not.toHaveBeenCalled();
      expect(clipboardText).toBe('');
    });

    it('ignores Ctrl+C if selection is outside containerRef', async () => {
      const onCopied = vi.fn();
      render(
        <div>
          <TestComponent onCopied={onCopied} />
          <div data-testid="outside">Outside node</div>
        </div>
      );
      const outsideNode = screen.getByTestId('outside');

      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => 'Outside node text',
        anchorNode: outsideNode,
      } as unknown as Selection);

      const event = new KeyboardEvent('keydown', {
        key: 'c',
        ctrlKey: true,
        bubbles: true,
      });
      window.dispatchEvent(event);

      expect(onCopied).not.toHaveBeenCalled();
      expect(clipboardText).toBe('');
    });
  });

  describe('Native Context Menu Preservation', () => {
    it('does not prevent contextmenu event across the document viewport', () => {
      render(
        <MarkdownViewer
          document={{
            filename: 'context-test.md',
            filePath: '/docs/context-test.md',
            content: '# Context Menu Title\n\nRight click me here.',
          }}
        />
      );

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toBeInTheDocument();

      const contextMenuEvent = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });

      const dispatched = markdownContent.dispatchEvent(contextMenuEvent);
      // Verify Wails runtime does not prevent default when --default-contextmenu is preserved
      expect(dispatched).toBe(true);
      expect(contextMenuEvent.defaultPrevented).toBe(false);
    });
  });

  describe('CSS User-Select and Highlight Selection Rules (FR-NAV-005)', () => {
    it('verifies markdown.css defines user-select: text across all content nodes', () => {
      const cssPath = path.resolve(__dirname, '../rendering/markdown.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Check root markdown content user-select: text
      expect(cssContent).toMatch(/\.markdown-content\s*\{[^}]*user-select:\s*text;/s);
      expect(cssContent).toMatch(/\.markdown-content\s*\{[^}]*-webkit-user-select:\s*text;/s);

      // Check child element rule: p, h1-h6, li, blockquote, td, th, pre, code, a
      expect(cssContent).toContain('.markdown-content p,');
      expect(cssContent).toContain('.markdown-content h1,');
      expect(cssContent).toContain('.markdown-content code,');
      expect(cssContent).toContain('.markdown-content td,');

      // Check ::selection styling for dark and light themes
      expect(cssContent).toContain('.markdown-content ::selection');
      expect(cssContent).toContain('[data-theme="light"] .markdown-content ::selection');
    });
  });

  describe('MarkdownViewer Full Selection and Copy Integration', () => {
    it('copies selected markdown text via Ctrl+C shortcut', async () => {
      render(
        <MarkdownViewer
          document={{
            filename: 'guide.md',
            filePath: '/docs/guide.md',
            content: '# User Guide\n\nThis is sample paragraph text to be copied.\n\n```go\nfmt.Println("test")\n```',
          }}
        />
      );

      const contentEl = screen.getByTestId('markdown-content');
      const paragraph = contentEl.querySelector('p');
      expect(paragraph).toBeInTheDocument();

      vi.spyOn(window, 'getSelection').mockReturnValue({
        toString: () => 'This is sample paragraph text to be copied.',
        anchorNode: paragraph,
      } as unknown as Selection);

      fireEvent.keyDown(window, { key: 'c', ctrlKey: true });

      await vi.waitFor(() => {
        expect(clipboardText).toBe('This is sample paragraph text to be copied.');
      });
    });
  });
});
