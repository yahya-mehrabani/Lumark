import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { triggerPrint, isPrintSupported, usePrint } from './printController';
import { AppShell } from '../shell/AppShell';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { TabStore } from '../tabs/tabStore';

describe('Print Page Break Rules & Command Dispatcher (US-024.2, FR-NAV-006)', () => {
  const originalPrint = window.print;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.print = originalPrint;
  });

  describe('Page Break Avoidance CSS Verification', () => {
    const printCssPath = path.resolve(__dirname, '../../styles/print.css');
    const printCss = fs.readFileSync(printCssPath, 'utf-8');

    it('attaches break-after: avoid to all headings h1-h6', () => {
      // Must avoid page breaks directly after headings so they do not orphan at page bottoms
      expect(printCss).toMatch(/h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6/);
      expect(printCss).toMatch(/page-break-after:\s*avoid\s*!important/);
      expect(printCss).toMatch(/break-after:\s*avoid\s*!important/);
    });

    it('attaches break-inside: avoid to code blocks (pre)', () => {
      expect(printCss).toMatch(/page-break-inside:\s*avoid\s*!important/);
      expect(printCss).toMatch(/break-inside:\s*avoid\s*!important/);
      expect(printCss).toContain('pre');
    });

    it('attaches break-inside: avoid to tables and table rows', () => {
      expect(printCss).toContain('table');
      expect(printCss).toContain('tr');
      expect(printCss).toContain('.table-wrapper');
    });

    it('attaches break-inside: avoid to diagrams and KaTeX display equations', () => {
      expect(printCss).toContain('.mermaid-container');
      expect(printCss).toContain('.katex-display');
      expect(printCss).toContain('figure');
    });

    it('attaches break-inside: avoid to blockquotes', () => {
      expect(printCss).toContain('blockquote');
    });
  });

  describe('Print Command Dispatcher Logic', () => {
    it('detects print support when window.print is available', () => {
      window.print = vi.fn();
      expect(isPrintSupported()).toBe(true);
    });

    it('invokes window.print() successfully when supported', () => {
      const mockPrint = vi.fn();
      window.print = mockPrint;

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const result = triggerPrint({ onSuccess, onError });

      expect(mockPrint).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('handles environments where window.print is not a function', () => {
      // @ts-expect-error simulating missing print
      window.print = undefined;

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const result = triggerPrint({ onSuccess, onError });

      expect(result.success).toBe(false);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Print is not supported'),
        })
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('catches and isolates exceptions thrown by window.print() gracefully', () => {
      window.print = vi.fn(() => {
        throw new Error('WebKitGTK print dialog failed');
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      const result = triggerPrint({ onSuccess, onError });

      expect(result.success).toBe(false);
      expect(result.error).toBe('WebKitGTK print dialog failed');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('WebKitGTK print dialog failed'),
        })
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('usePrint Hook & Keyboard Shortcuts', () => {
    const TestComponent: React.FC<{
      enableShortcuts?: boolean;
      onError?: (err: Error) => void;
      onSuccess?: () => void;
    }> = (props) => {
      const { print, isSupported } = usePrint(props);
      return (
        <div>
          <button data-testid="test-print-btn" onClick={print}>
            Print
          </button>
          <span data-testid="test-print-supported">{String(isSupported)}</span>
        </div>
      );
    };

    it('triggers print on Ctrl+P keyboard shortcut', () => {
      const mockPrint = vi.fn();
      window.print = mockPrint;

      render(<TestComponent />);

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockPrint).toHaveBeenCalledTimes(1);
    });

    it('triggers print on Cmd+P (metaKey) keyboard shortcut', () => {
      const mockPrint = vi.fn();
      window.print = mockPrint;

      render(<TestComponent />);

      const event = new KeyboardEvent('keydown', {
        key: 'P',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(mockPrint).toHaveBeenCalledTimes(1);
    });

    it('does not trigger print on P key when Ctrl/Cmd is not held', () => {
      const mockPrint = vi.fn();
      window.print = mockPrint;

      render(<TestComponent />);

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockPrint).not.toHaveBeenCalled();
    });

    it('respects enableShortcuts: false', () => {
      const mockPrint = vi.fn();
      window.print = mockPrint;

      render(<TestComponent enableShortcuts={false} />);

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(mockPrint).not.toHaveBeenCalled();
    });
  });

  describe('UI Component Integration', () => {
    it('AppShell header omits redundant Print button in favor of document toolbar', () => {
      const onPrint = vi.fn();
      const store = new TabStore();

      render(<AppShell store={store} onPrint={onPrint} />);

      expect(screen.queryByTestId('header-print-btn')).not.toBeInTheDocument();
    });

    it('AppShell global Ctrl+P shortcut triggers onPrint callback', () => {
      const onPrint = vi.fn();
      const store = new TabStore();

      render(<AppShell store={store} onPrint={onPrint} />);

      const event = new KeyboardEvent('keydown', {
        key: 'p',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(onPrint).toHaveBeenCalledTimes(1);
    });

    it('AppShell 3-dot menu includes Print action that invokes onPrint', () => {
      const onPrint = vi.fn();
      const store = new TabStore();

      render(<AppShell store={store} onPrint={onPrint} />);

      // Open 3-dot menu
      const moreMenuBtn = screen.getByTestId('header-menu-btn');
      fireEvent.click(moreMenuBtn);

      const printItem = screen.getByTestId('menu-item-print');
      expect(printItem).toBeInTheDocument();

      fireEvent.click(printItem);
      expect(onPrint).toHaveBeenCalledTimes(1);
    });

    it('MarkdownViewer header toolbar omits Print button in favor of 3-dot menu and Ctrl+P', () => {
      render(
        <MarkdownViewer
          document={{
            filePath: '/test/doc.md',
            filename: 'doc.md',
            content: '# Heading 1\n\nSome paragraph text.',
          }}
        />
      );

      expect(screen.queryByTestId('doc-print-btn')).not.toBeInTheDocument();
    });
  });
});
