import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DropZone } from './DropZone';
import { AppShell } from './AppShell';
import { TabStore } from '../tabs/tabStore';
import { loadDroppedFiles } from './batchLoader';

describe('DropZone & AppShell Drag-and-Drop Integration Tests (US-008.4)', () => {
  let store: TabStore;

  beforeEach(() => {
    store = new TabStore();
  });

  describe('DropZone Drag Event States & Visual Feedback', () => {
    it('initializes in clean state without active overlay', () => {
      render(
        <DropZone onFilesDropped={vi.fn()}>
          <div data-testid="content">Child Content</div>
        </DropZone>
      );

      const dropzone = screen.getByTestId('app-dropzone');
      expect(dropzone).not.toHaveClass('is-drag-over');
      expect(dropzone).toHaveAttribute('aria-dropeffect', 'copy');
      expect(screen.queryByTestId('dropzone-overlay')).toBeNull();
    });

    it('transitions to is-drag-over on dragenter and maintains on dragover', () => {
      render(
        <DropZone onFilesDropped={vi.fn()}>
          <div>Child Content</div>
        </DropZone>
      );

      const dropzone = screen.getByTestId('app-dropzone');

      fireEvent.dragEnter(dropzone);
      expect(dropzone).toHaveClass('is-drag-over');
      expect(screen.getByTestId('dropzone-overlay')).toBeInTheDocument();

      fireEvent.dragOver(dropzone, {
        dataTransfer: { dropEffect: 'none' },
      });
      expect(dropzone).toHaveClass('is-drag-over');
    });

    it('restores normal state on dragleave when boundary counter reaches zero', () => {
      render(
        <DropZone onFilesDropped={vi.fn()}>
          <div>Child Content</div>
        </DropZone>
      );

      const dropzone = screen.getByTestId('app-dropzone');

      fireEvent.dragEnter(dropzone);
      expect(dropzone).toHaveClass('is-drag-over');

      fireEvent.dragLeave(dropzone);
      expect(dropzone).not.toHaveClass('is-drag-over');
      expect(screen.queryByTestId('dropzone-overlay')).toBeNull();
    });

    it('resets drag state and dispatches files on drop', () => {
      const handleFiles = vi.fn();
      render(
        <DropZone onFilesDropped={handleFiles}>
          <div>Child Content</div>
        </DropZone>
      );

      const dropzone = screen.getByTestId('app-dropzone');

      fireEvent.dragEnter(dropzone);
      expect(dropzone).toHaveClass('is-drag-over');

      const file = new File(['# Dropped Doc'], 'dropped.md', { type: 'text/markdown' });
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(dropzone).not.toHaveClass('is-drag-over');
      expect(screen.queryByTestId('dropzone-overlay')).toBeNull();
      expect(handleFiles).toHaveBeenCalledWith([file]);
    });
  });

  describe('Full AppShell Drag-and-Drop & File Filtering Integration', () => {
    it('handles 3 dropped Markdown files opening them as tabs in order (AC 4)', async () => {
      const handleFileDrop = async (files: File[]) => {
        await loadDroppedFiles(files, {
          store,
          readFileContent: async (f) => `# ${f.name} Content`,
        });
      };

      const { container } = render(
        <AppShell store={store} onFileDrop={handleFileDrop} />
      );

      const dropzone = container.querySelector('.app-shell-root') as HTMLElement;
      expect(dropzone).toBeInTheDocument();

      const f1 = new File(['1'], 'doc1.md', { type: 'text/markdown' });
      const f2 = new File(['2'], 'doc2.markdown', { type: 'text/markdown' });
      const f3 = new File(['3'], 'doc3.mkd', { type: 'text/markdown' });

      await act(async () => {
        fireEvent.drop(dropzone, {
          dataTransfer: {
            files: [f1, f2, f3],
          },
        });
      });

      const tabs = store.getState().tabs;
      expect(tabs).toHaveLength(3);
      expect(tabs[0].filename).toBe('doc1.md');
      expect(tabs[1].filename).toBe('doc2.markdown');
      expect(tabs[2].filename).toBe('doc3.mkd');

      // Tab list is rendered in AppShell
      expect(screen.getByRole('tab', { name: /doc1\.md/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /doc2\.markdown/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /doc3\.mkd/i })).toBeInTheDocument();

      // Active tab is the last one opened
      expect(screen.getByRole('heading', { level: 1, name: 'doc3.mkd' })).toBeInTheDocument();
    });

    it('handles mixed drop of valid .md and invalid .exe without crashing (AC 5)', async () => {
      const notifyWarning = vi.fn();
      const handleFileDrop = async (files: File[]) => {
        await loadDroppedFiles(files, {
          store,
          notifyWarning,
          readFileContent: async (f) => `# ${f.name} Content`,
        });
      };

      const { container } = render(
        <AppShell store={store} onFileDrop={handleFileDrop} />
      );

      const dropzone = container.querySelector('.app-shell-root') as HTMLElement;

      const validFile = new File(['# Valid'], 'valid.md', { type: 'text/markdown' });
      const invalidFile = new File(['binary'], 'bad.exe', { type: 'application/octet-stream' });

      await act(async () => {
        fireEvent.drop(dropzone, {
          dataTransfer: {
            files: [validFile, invalidFile],
          },
        });
      });

      // Valid tab opened
      const tabs = store.getState().tabs;
      expect(tabs).toHaveLength(1);
      expect(tabs[0].filename).toBe('valid.md');
      expect(screen.getByRole('tab', { name: /valid\.md/i })).toBeInTheDocument();

      // Warning notification triggered
      expect(notifyWarning).toHaveBeenCalledTimes(1);
      expect(notifyWarning.mock.calls[0][0]).toContain("Unsupported file 'bad.exe'");
    });

    it('triggers onOpenFile when clicking header Open File button or Ctrl+O shortcut', () => {
      const handleOpenFile = vi.fn();
      render(<AppShell store={store} onOpenFile={handleOpenFile} />);

      // Click header button
      const openBtn = screen.getByRole('button', { name: /open document file/i });
      fireEvent.click(openBtn);
      expect(handleOpenFile).toHaveBeenCalledTimes(1);

      // Press Ctrl+O
      fireEvent.keyDown(window, { key: 'o', ctrlKey: true });
      expect(handleOpenFile).toHaveBeenCalledTimes(2);

      // Press Meta+O (Cmd+O on macOS)
      fireEvent.keyDown(window, { key: 'O', metaKey: true });
      expect(handleOpenFile).toHaveBeenCalledTimes(3);
    });

    it('triggers onOpenFile when clicking EmptyState button or dropzone', () => {
      const handleOpenFile = vi.fn();
      render(<AppShell store={store} onOpenFile={handleOpenFile} />);

      const emptyStateBtn = screen.getByRole('button', { name: /open markdown file/i });
      fireEvent.click(emptyStateBtn);
      expect(handleOpenFile).toHaveBeenCalledTimes(1);

      const emptyDropzone = screen.getByLabelText(/dropzone for markdown files/i);
      fireEvent.click(emptyDropzone);
      expect(handleOpenFile).toHaveBeenCalledTimes(2);
    });

    it('supports filenames with spaces and unicode characters', async () => {
      const handleFileDrop = async (files: File[]) => {
        await loadDroppedFiles(files, {
          store,
          readFileContent: async (f) => `# ${f.name} Content`,
        });
      };

      const { container } = render(
        <AppShell store={store} onFileDrop={handleFileDrop} />
      );

      const dropzone = container.querySelector('.app-shell-root') as HTMLElement;

      const unicodeFile = new File(['# فارسی'], 'یادداشت های من (2026).markdown', { type: 'text/markdown' });

      await act(async () => {
        fireEvent.drop(dropzone, {
          dataTransfer: {
            files: [unicodeFile],
          },
        });
      });

      const tabs = store.getState().tabs;
      expect(tabs).toHaveLength(1);
      expect(tabs[0].filename).toBe('یادداشت های من (2026).markdown');
      expect(screen.getByRole('tab', { name: /یادداشت های من/i })).toBeInTheDocument();
    });
  });
});
