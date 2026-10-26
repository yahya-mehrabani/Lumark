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
  });
});
