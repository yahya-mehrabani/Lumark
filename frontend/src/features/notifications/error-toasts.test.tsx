import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastStore } from './toastStore';
import { ToastContainer } from './ToastContainer';
import { ToastNotification } from './ToastNotification';
import { normalizeErrorMessage } from './normalizeError';

describe('Error Toasts & Notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('normalizeErrorMessage (Plain Language & Stack Trace Stripping)', () => {
    it('normalizes permission denied errors and suggests Choose Another File action', () => {
      const rawError = 'open /root/secret.md: permission denied\n  at DocumentService.LoadFile (service.go:42)\n  goroutine 1 [running]';
      const normalized = normalizeErrorMessage(rawError);

      expect(normalized.message).toBe('Cannot read file: Permission denied');
      expect(normalized.actionLabel).toBe('Choose Another File');
      expect(normalized.isFileError).toBe(true);
      expect(normalized.message).not.toContain('goroutine');
      expect(normalized.message).not.toContain('service.go');
    });

    it('normalizes file not found errors', () => {
      const rawError = new Error('ENOENT: no such file or directory, open /path/missing.md');
      const normalized = normalizeErrorMessage(rawError);

      expect(normalized.message).toBe('Cannot read file: File not found on disk');
      expect(normalized.actionLabel).toBe('Choose Another File');
      expect(normalized.isFileError).toBe(true);
    });

    it('normalizes oversized file errors exceeding 20 MiB limit', () => {
      const rawError = 'DocumentService: file too large (25 MiB exceeds 20 MiB size limit)';
      const normalized = normalizeErrorMessage(rawError);

      expect(normalized.message).toBe('Cannot open file: File exceeds 20 MiB size limit');
      expect(normalized.actionLabel).toBe('Choose Another File');
      expect(normalized.isFileError).toBe(true);
    });

    it('normalizes unsupported file formats', () => {
      const rawError = 'unsupported document format .pdf: expected markdown';
      const normalized = normalizeErrorMessage(rawError);

      expect(normalized.message).toBe('Cannot open file: Unsupported file format');
      expect(normalized.actionLabel).toBe('Choose Another File');
      expect(normalized.isFileError).toBe(true);
    });

    it('strips raw JavaScript stack traces from unexpected errors', () => {
      const rawError = new Error('TypeError: Cannot read properties of undefined (reading "parse")\n    at renderMarkdown (MarkdownViewer.tsx:120:15)\n    at Object.invoke (react-dom.js:4000)');
      const normalized = normalizeErrorMessage(rawError);

      expect(normalized.message).toBe('TypeError: Cannot read properties of undefined (reading "parse")');
      expect(normalized.message).not.toContain('MarkdownViewer.tsx');
      expect(normalized.message).not.toContain('react-dom.js');
    });
  });

  describe('ToastNotification Accessibility & Interaction', () => {
    it('renders with WCAG AA alert role and assertive live region for error toasts', () => {
      const onDismiss = vi.fn();
      render(
        <ToastNotification
          toast={{
            id: 't-1',
            message: 'Cannot read file: Permission denied',
            type: 'error',
            durationMs: 0,
            createdAt: Date.now(),
          }}
          onDismiss={onDismiss}
        />
      );

      const banner = screen.getByRole('alert');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveAttribute('aria-live', 'assertive');
      expect(banner).toHaveAttribute('aria-atomic', 'true');
      expect(screen.getByText('Cannot read file: Permission denied')).toBeInTheDocument();
    });

    it('renders action button and executes callback when clicked', () => {
      const onDismiss = vi.fn();
      const onAction = vi.fn();

      render(
        <ToastNotification
          toast={{
            id: 't-2',
            message: 'Cannot read file: Permission denied',
            type: 'error',
            action: {
              label: 'Choose Another File',
              onClick: onAction,
            },
            durationMs: 0,
            createdAt: Date.now(),
          }}
          onDismiss={onDismiss}
        />
      );

      const actionBtn = screen.getByRole('button', { name: 'Choose Another File' });
      expect(actionBtn).toBeInTheDocument();

      fireEvent.click(actionBtn);
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith('t-2');
    });

    it('auto-dismisses after durationMs elapses', () => {
      const onDismiss = vi.fn();

      render(
        <ToastNotification
          toast={{
            id: 't-auto',
            message: 'Document saved',
            type: 'success',
            durationMs: 3000,
            createdAt: Date.now(),
          }}
          onDismiss={onDismiss}
        />
      );

      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onDismiss).toHaveBeenCalledWith('t-auto');
    });

    it('dismisses when close button is clicked', () => {
      const onDismiss = vi.fn();

      render(
        <ToastNotification
          toast={{
            id: 't-close',
            message: 'Notification with close button',
            type: 'info',
            durationMs: 0,
            createdAt: Date.now(),
          }}
          onDismiss={onDismiss}
        />
      );

      const closeBtn = screen.getByRole('button', { name: /Dismiss notification/i });
      fireEvent.click(closeBtn);

      expect(onDismiss).toHaveBeenCalledWith('t-close');
    });
  });

  describe('ToastStore & ToastContainer Integration', () => {
    it('displays error toast with Choose Another File button when showError is called', () => {
      const store = new ToastStore();
      const onChooseAnother = vi.fn();

      render(<ToastContainer store={store} />);

      expect(screen.queryByTestId('toast-container')).not.toBeInTheDocument();

      // Trigger permission denied error
      act(() => {
        store.showError('open /etc/shadow: permission denied', onChooseAnother);
      });

      expect(screen.getByTestId('toast-container')).toBeInTheDocument();
      expect(screen.getByText('Cannot read file: Permission denied')).toBeInTheDocument();

      const chooseBtn = screen.getByRole('button', { name: 'Choose Another File' });
      expect(chooseBtn).toBeInTheDocument();

      fireEvent.click(chooseBtn);
      expect(onChooseAnother).toHaveBeenCalledTimes(1);
    });

    it('dismisses newest toast on Escape key press', () => {
      const store = new ToastStore();

      render(<ToastContainer store={store} />);

      act(() => {
        store.showInfo('First toast', 0);
        store.showWarning('Second toast', 0);
      });

      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();

      // Press Escape
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      // Second toast is dismissed
      expect(screen.queryByText('Second toast')).not.toBeInTheDocument();
      expect(screen.getByText('First toast')).toBeInTheDocument();
    });

    it('caps visible toasts at MAX_VISIBLE_TOASTS (3) and evicts the oldest', () => {
      const store = new ToastStore();
      render(<ToastContainer store={store} />);

      act(() => {
        store.showInfo('Toast 1', 0);
        store.showInfo('Toast 2', 0);
        store.showInfo('Toast 3', 0);
        store.showInfo('Toast 4', 0);
      });

      // Oldest (Toast 1) should be evicted
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
    });

    it('renders ToastContainer with role="region" and aria-live="polite"', () => {
      const store = new ToastStore();
      render(<ToastContainer store={store} />);

      act(() => {
        store.showInfo('Test notification', 0);
      });

      const container = screen.getByTestId('toast-container');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-live', 'polite');
      expect(container).toHaveAttribute('aria-label', 'Notifications');
    });

    it('never evicts active error toasts when routine success/info toasts arrive at the 3-toast cap', () => {
      const store = new ToastStore();
      render(<ToastContainer store={store} />);

      act(() => {
        store.showError('Critical disk error', undefined, 0);
        store.showSuccess('File A loaded', 0);
        store.showInfo('Indexing complete', 0);
      });

      expect(screen.getByText('Critical disk error')).toBeInTheDocument();
      expect(screen.getByText('File A loaded')).toBeInTheDocument();
      expect(screen.getByText('Indexing complete')).toBeInTheDocument();

      // Now add a 4th routine toast (Success)
      act(() => {
        store.showSuccess('File B loaded', 0);
      });

      // The oldest routine toast ('File A loaded') should be evicted, but 'Critical disk error' MUST remain!
      expect(screen.getByText('Critical disk error')).toBeInTheDocument();
      expect(screen.queryByText('File A loaded')).not.toBeInTheDocument();
      expect(screen.getByText('Indexing complete')).toBeInTheDocument();
      expect(screen.getByText('File B loaded')).toBeInTheDocument();
    });

    it('deduplicates identical active messages instead of stacking duplicate banners', () => {
      const store = new ToastStore();
      render(<ToastContainer store={store} />);

      act(() => {
        store.showSuccess('Loaded doc.md', 0);
        store.showSuccess('Loaded doc.md', 0);
      });

      expect(screen.getAllByText('Loaded doc.md')).toHaveLength(1);
    });

    it('auto-dismisses with default durations: 4s for success, 5s for warning, 6s for error', () => {
      const store = new ToastStore();
      render(<ToastContainer store={store} />);

      act(() => {
        store.showSuccess('Success message');
        store.showWarning('Warning message');
        store.showError('Error message');
      });

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // At 4000ms: success is dismissed
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // At 5000ms: warning is dismissed
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByText('Warning message')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();

      // At 6000ms: error is dismissed
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
    });

    it('dismisses on schedule despite repeated parent re-renders and adding subsequent toasts', () => {
      const store = new ToastStore();
      const { rerender } = render(<ToastContainer store={store} />);

      act(() => {
        store.showSuccess('Toast 1', 4000);
      });
      expect(screen.getByText('Toast 1')).toBeInTheDocument();

      // Advance by 1s, then simulate parent re-render (like App time tick)
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      rerender(<ToastContainer store={store} />);

      // Advance by another 1s (total 2s), then add another toast and re-render
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      act(() => {
        store.showInfo('Toast 2', 4000);
      });
      rerender(<ToastContainer store={store} />);

      // Advance by 1s (total 3s), re-render again
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      rerender(<ToastContainer store={store} />);
      expect(screen.getByText('Toast 1')).toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();

      // Advance by final 1s (total 4s from Toast 1 start): Toast 1 must be dismissed now!
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();

      // Advance by 2s more (total 4s from Toast 2 start): Toast 2 dismissed
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByText('Toast 2')).not.toBeInTheDocument();
    });

    it('pauses timer on hover and resumes with remaining time on mouse leave', () => {
      const store = new ToastStore();
      render(<ToastContainer store={store} />);

      act(() => {
        store.showSuccess('Hoverable toast', 4000);
      });
      const banner = screen.getByText('Hoverable toast').closest('.toast-banner')!;

      // Advance 1.5s
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByText('Hoverable toast')).toBeInTheDocument();

      // Hover over toast
      act(() => {
        fireEvent.mouseEnter(banner);
      });

      // Wait 10s while hovered — should NOT dismiss
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByText('Hoverable toast')).toBeInTheDocument();

      // Mouse leave — resumes remaining 2.5s
      act(() => {
        fireEvent.mouseLeave(banner);
      });

      // Advance 2s — still in document
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText('Hoverable toast')).toBeInTheDocument();

      // Advance remaining 500ms — now dismissed
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.queryByText('Hoverable toast')).not.toBeInTheDocument();
    });

    it('pauses timer on focus and resumes with remaining time on blur', () => {
      const store = new ToastStore();
      render(<ToastContainer store={store} />);

      act(() => {
        store.showSuccess('Focusable toast', 4000);
      });
      const closeBtn = screen.getByTestId('toast-close-button');

      // Advance 1s
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Focus close button inside toast
      act(() => {
        fireEvent.focus(closeBtn);
      });

      // Wait 10s while focused — should NOT dismiss
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByText('Focusable toast')).toBeInTheDocument();

      // Blur
      act(() => {
        fireEvent.blur(closeBtn);
      });

      // Advance 2.5s — still in document
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(screen.getByText('Focusable toast')).toBeInTheDocument();

      // Advance remaining 500ms — dismissed
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(screen.queryByText('Focusable toast')).not.toBeInTheDocument();
    });
  });
});
