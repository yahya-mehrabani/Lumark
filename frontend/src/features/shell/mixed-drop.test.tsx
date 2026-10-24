import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TabStore } from '../tabs/tabStore';
import {
  isSupportedMarkdownFile,
  partitionFiles,
  formatRejectedFilesMessage,
  loadDroppedFiles,
} from './batchLoader';

describe('Multi-File Batch Loader & Error Notifier', () => {
  let store: TabStore;

  beforeEach(() => {
    store = new TabStore();
  });

  describe('isSupportedMarkdownFile', () => {
    it('accepts standard markdown extensions case-insensitively', () => {
      expect(isSupportedMarkdownFile('document.md')).toBe(true);
      expect(isSupportedMarkdownFile('README.MARKDOWN')).toBe(true);
      expect(isSupportedMarkdownFile('notes.Mdown')).toBe(true);
      expect(isSupportedMarkdownFile('changelog.mkd')).toBe(true);
    });

    it('rejects unsupported extensions and empty strings', () => {
      expect(isSupportedMarkdownFile('')).toBe(false);
      expect(isSupportedMarkdownFile('binary.exe')).toBe(false);
      expect(isSupportedMarkdownFile('data.bin')).toBe(false);
      expect(isSupportedMarkdownFile('image.png')).toBe(false);
      expect(isSupportedMarkdownFile('script.sh')).toBe(false);
      expect(isSupportedMarkdownFile('document.txt')).toBe(false);
    });
  });

  describe('partitionFiles', () => {
    it('correctly splits valid and invalid files', () => {
      const valid1 = new File(['# Doc 1'], 'doc1.md', { type: 'text/markdown' });
      const valid2 = new File(['# Doc 2'], 'doc2.markdown', { type: 'text/markdown' });
      const invalid1 = new File(['binary'], 'virus.exe', { type: 'application/octet-stream' });
      const invalid2 = new File(['archive'], 'bundle.zip', { type: 'application/zip' });

      const { validFiles, rejectedFiles } = partitionFiles([valid1, invalid1, valid2, invalid2]);

      expect(validFiles).toHaveLength(2);
      expect(validFiles[0].name).toBe('doc1.md');
      expect(validFiles[1].name).toBe('doc2.markdown');

      expect(rejectedFiles).toHaveLength(2);
      expect(rejectedFiles[0].name).toBe('virus.exe');
      expect(rejectedFiles[1].name).toBe('bundle.zip');
    });
  });

  describe('formatRejectedFilesMessage', () => {
    it('formats single unsupported file notification', () => {
      const file = new File([''], 'app.exe');
      const msg = formatRejectedFilesMessage([file]);
      expect(msg).toContain("Unsupported file 'app.exe'");
      expect(msg).toContain('Only Markdown files (.md, .markdown, .mdown, .mkd) are supported');
    });

    it('formats multiple unsupported files notification', () => {
      const f1 = new File([''], 'app.exe');
      const f2 = new File([''], 'data.bin');
      const msg = formatRejectedFilesMessage([f1, f2]);
      expect(msg).toContain("2 unsupported files ('app.exe', 'data.bin') were skipped");
    });
  });

  describe('loadDroppedFiles', () => {
    it('opens 3 valid .md files in the specified order (Acceptance Criteria 4)', async () => {
      const file1 = new File(['# First Document'], 'first.md', { type: 'text/markdown' });
      const file2 = new File(['# Second Document'], 'second.markdown', { type: 'text/markdown' });
      const file3 = new File(['# Third Document'], 'third.mkd', { type: 'text/markdown' });

      const notifyWarning = vi.fn();
      const notifySuccess = vi.fn();

      const result = await loadDroppedFiles([file1, file2, file3], {
        store,
        notifyWarning,
        notifySuccess,
        readFileContent: async (f) => `# Content of ${f.name}`,
      });

      expect(result.openedCount).toBe(3);
      expect(result.rejectedCount).toBe(0);
      expect(notifyWarning).not.toHaveBeenCalled();
      expect(notifySuccess).toHaveBeenCalledWith('Opened 3 Markdown files');

      const tabs = store.getState().tabs;
      expect(tabs).toHaveLength(3);
      expect(tabs[0].filename).toBe('first.md');
      expect(tabs[0].content).toBe('# Content of first.md');
      expect(tabs[1].filename).toBe('second.markdown');
      expect(tabs[1].content).toBe('# Content of second.markdown');
      expect(tabs[2].filename).toBe('third.mkd');
      expect(tabs[2].content).toBe('# Content of third.mkd');

      // The last opened tab is the active tab
      expect(store.getActiveTab()?.filename).toBe('third.mkd');
    });

    it('handles mixed valid and invalid drop: opens valid file and notifies warning without crashing (Acceptance Criteria 5)', async () => {
      // Pre-populate store with an existing document to ensure it remains intact
      store.openTab({
        filePath: '/existing/guide.md',
        filename: 'guide.md',
        content: '# Existing Guide',
        status: 'ready',
      });
      expect(store.getState().tabs).toHaveLength(1);

      const validFile = new File(['# Valid Note'], 'note.md', { type: 'text/markdown' });
      const invalidFile = new File(['MZ binary payload'], 'malware.exe', { type: 'application/octet-stream' });

      const notifyWarning = vi.fn();
      const notifySuccess = vi.fn();

      const result = await loadDroppedFiles([validFile, invalidFile], {
        store,
        notifyWarning,
        notifySuccess,
        readFileContent: async (f) => `# Content of ${f.name}`,
      });

      // Valid file opened, invalid file rejected
      expect(result.openedCount).toBe(1);
      expect(result.rejectedCount).toBe(1);
      expect(result.rejectedNames).toEqual(['malware.exe']);

      // Warning notification triggered for rejected file
      expect(notifyWarning).toHaveBeenCalledTimes(1);
      expect(notifyWarning.mock.calls[0][0]).toContain("Unsupported file 'malware.exe'");

      // Existing open document remains intact along with new valid tab
      const tabs = store.getState().tabs;
      expect(tabs).toHaveLength(2);
      expect(tabs[0].filename).toBe('guide.md');
      expect(tabs[1].filename).toBe('note.md');
      expect(tabs[1].content).toBe('# Content of note.md');
      expect(store.getActiveTab()?.filename).toBe('note.md');
    });

    it('displays warning and opens zero tabs when all dropped files are unsupported', async () => {
      const invalid1 = new File([''], 'archive.zip');
      const invalid2 = new File([''], 'music.mp3');

      const notifyWarning = vi.fn();

      const result = await loadDroppedFiles([invalid1, invalid2], {
        store,
        notifyWarning,
      });

      expect(result.openedCount).toBe(0);
      expect(result.rejectedCount).toBe(2);
      expect(store.getState().tabs).toHaveLength(0);
      expect(notifyWarning).toHaveBeenCalledTimes(1);
      expect(notifyWarning.mock.calls[0][0]).toContain("2 unsupported files ('archive.zip', 'music.mp3') were skipped");
    });

    it('handles empty dropped files list without state change or error', async () => {
      const notifyWarning = vi.fn();

      const result = await loadDroppedFiles([], {
        store,
        notifyWarning,
      });

      expect(result.openedCount).toBe(0);
      expect(result.rejectedCount).toBe(0);
      expect(notifyWarning).not.toHaveBeenCalled();
      expect(store.getState().tabs).toHaveLength(0);
    });

    it('refocuses existing tab when dropping an already-opened file without duplicating tabs', async () => {
      const file = new File(['# Document'], 'notes.md', { type: 'text/markdown' });
      (file as any).path = '/home/user/notes.md';

      // First drop
      await loadDroppedFiles([file], {
        store,
        readFileContent: async () => '# Document',
      });
      expect(store.getState().tabs).toHaveLength(1);

      // Open second doc
      const file2 = new File(['# Other'], 'other.md', { type: 'text/markdown' });
      (file2 as any).path = '/home/user/other.md';
      await loadDroppedFiles([file2], {
        store,
        readFileContent: async () => '# Other',
      });
      expect(store.getState().tabs).toHaveLength(2);
      expect(store.getActiveTab()?.filename).toBe('other.md');

      // Drop first file again -> should refocus notes.md without duplicate tab
      await loadDroppedFiles([file], {
        store,
        readFileContent: async () => '# Document',
      });
      expect(store.getState().tabs).toHaveLength(2);
      expect(store.getActiveTab()?.filename).toBe('notes.md');
    });
  });
});
