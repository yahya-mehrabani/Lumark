import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TabStore } from './tabStore';
import {
  captureScrollState,
  restoreScrollState,
  handleFileChanged,
  ScrollState,
} from './tabReload';
import { InMemoryWatcherAdapter, syncTabWatches } from './tabWatcher';

describe('tabReload & Scroll Preservation', () => {
  let tabStore: TabStore;

  beforeEach(() => {
    tabStore = new TabStore();
  });

  describe('captureScrollState and restoreScrollState', () => {
    it('captures scrollTop and restores it to the container', () => {
      const container = document.createElement('div');
      container.scrollTop = 420;

      const state: ScrollState = captureScrollState(container);
      expect(state.scrollTop).toBe(420);

      const target = document.createElement('div');
      target.scrollTop = 0;
      restoreScrollState(state, target);

      expect(target.scrollTop).toBe(420);
    });

    it('captures top-most visible heading ID when present', () => {
      const container = document.createElement('div');
      container.scrollTop = 150;

      // Mock getBoundingClientRect for container and headings
      container.getBoundingClientRect = () => ({
        top: 0,
        bottom: 500,
        left: 0,
        right: 800,
        width: 800,
        height: 500,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const h1 = document.createElement('h1');
      h1.id = 'section-one';
      h1.getBoundingClientRect = () => ({
        top: 25,
        bottom: 55,
        left: 0,
        right: 800,
        width: 800,
        height: 30,
        x: 0,
        y: 25,
        toJSON: () => {},
      });

      container.appendChild(h1);

      const state = captureScrollState(container);
      expect(state.scrollTop).toBe(150);
      expect(state.topHeadingId).toBe('section-one');
    });

    it('handles null container gracefully without crashing', () => {
      const state = captureScrollState(null);
      expect(state).toEqual({ scrollTop: 0 });
      expect(() => restoreScrollState(state, null)).not.toThrow();
    });
  });

  describe('handleFileChanged - Modification & Scroll Preservation', () => {
    it('reloads active tab content and restores scroll position', async () => {
      const initialTab = tabStore.openTab({
        filePath: '/workspace/doc.md',
        content: '# Original Content\n\nInitial paragraph text.',
      });

      const container = document.createElement('div');
      container.className = 'app-viewport';
      container.scrollTop = 350;
      document.body.appendChild(container);

      const onReloadSuccess = vi.fn();
      const onFileMissing = vi.fn();

      const loadDocument = vi.fn().mockResolvedValue({
        content: '# Updated Content\n\nInitial paragraph text.\n\nAdded paragraph at bottom.',
        filename: 'doc.md',
      });

      const reloaded = await handleFileChanged(
        {
          path: '/workspace/doc.md',
          type: 'modified',
        },
        {
          tabStore,
          loadDocument,
          getScrollContainer: () => container,
          onReloadSuccess,
          onFileMissing,
        }
      );

      expect(reloaded).toBe(true);
      expect(loadDocument).toHaveBeenCalledWith('/workspace/doc.md');

      const updatedTab = tabStore.getActiveTab();
      expect(updatedTab?.content).toContain('Added paragraph at bottom.');
      expect(updatedTab?.status).toBe('ready');

      expect(onReloadSuccess).toHaveBeenCalledWith(initialTab.id, 'doc.md');
      expect(onFileMissing).not.toHaveBeenCalled();

      // Wait for post-render RAF/timeout to restore scroll position
      await new Promise((r) => setTimeout(r, 10));
      expect(container.scrollTop).toBe(350);

      document.body.removeChild(container);
    });

    it('reloads background tabs without affecting active tab or scrolling', async () => {
      const tabA = tabStore.openTab({
        filePath: '/workspace/tabA.md',
        content: '# Tab A content',
      });
      const tabB = tabStore.openTab({
        filePath: '/workspace/tabB.md',
        content: '# Tab B content',
      });

      // Active tab is Tab B
      expect(tabStore.getState().activeTabId).toBe(tabB.id);

      const loadDocument = vi.fn().mockResolvedValue({
        content: '# Tab A updated content',
      });

      const reloaded = await handleFileChanged(
        {
          path: '/workspace/tabA.md',
          type: 'modified',
        },
        {
          tabStore,
          loadDocument,
        }
      );

      expect(reloaded).toBe(true);

      // Verify Tab A updated
      const state = tabStore.getState();
      const updatedTabA = state.tabs.find((t) => t.id === tabA.id);
      expect(updatedTabA?.content).toBe('# Tab A updated content');

      // Verify active tab remains Tab B and is untouched
      expect(state.activeTabId).toBe(tabB.id);
      const tabBState = state.tabs.find((t) => t.id === tabB.id);
      expect(tabBState?.content).toBe('# Tab B content');
    });

    it('ignores modification events for files that are not open', async () => {
      tabStore.openTab({
        filePath: '/workspace/open.md',
        content: 'content',
      });

      const loadDocument = vi.fn();
      const result = await handleFileChanged(
        {
          path: '/workspace/not-open.md',
          type: 'modified',
        },
        {
          tabStore,
          loadDocument,
        }
      );

      expect(result).toBe(false);
      expect(loadDocument).not.toHaveBeenCalled();
    });
  });

  describe('handleFileChanged - External File Deletion', () => {
    it('updates tab status to missing and preserves document text buffer on disk deletion', async () => {
      const tab = tabStore.openTab({
        filePath: '/workspace/important.md',
        content: '# Critical document content\n\nMust not be deleted from buffer.',
      });

      const onFileMissing = vi.fn();
      const loadDocument = vi.fn();

      const handled = await handleFileChanged(
        {
          path: '/workspace/important.md',
          type: 'deleted',
        },
        {
          tabStore,
          loadDocument,
          onFileMissing,
        }
      );

      expect(handled).toBe(true);
      expect(loadDocument).not.toHaveBeenCalled();
      expect(onFileMissing).toHaveBeenCalledWith(tab.id, 'important.md');

      const updatedTab = tabStore.getActiveTab();
      expect(updatedTab?.status).toBe('missing');
      expect(updatedTab?.errorMessage).toContain('deleted or moved');
      // Buffer must remain intact per PRD FR-OPEN-007
      expect(updatedTab?.content).toBe(
        '# Critical document content\n\nMust not be deleted from buffer.'
      );
    });

    it('clears missing status when a previously missing file is reloaded upon creation/modification', async () => {
      tabStore.openTab({
        filePath: '/workspace/recreated.md',
        content: 'Old text',
        status: 'missing',
        errorMessage: 'File was deleted',
      });

      expect(tabStore.getActiveTab()?.status).toBe('missing');

      const loadDocument = vi.fn().mockResolvedValue({
        content: 'Brand new text after recreation',
      });

      await handleFileChanged(
        {
          path: '/workspace/recreated.md',
          type: 'modified',
        },
        {
          tabStore,
          loadDocument,
        }
      );

      const refreshed = tabStore.getActiveTab();
      expect(refreshed?.status).toBe('ready');
      expect(refreshed?.errorMessage).toBeUndefined();
      expect(refreshed?.content).toBe('Brand new text after recreation');
    });
  });

  describe('syncTabWatches', () => {
    it('watches newly opened tabs and un-watches closed tabs', async () => {
      const adapter = new InMemoryWatcherAdapter();
      let watched = new Set<string>();

      // Initially no tabs
      watched = syncTabWatches(tabStore, adapter, watched);
      expect(adapter.getWatchedFiles()).toEqual([]);

      // Open tab 1 and tab 2
      tabStore.openTab({ filePath: '/workspace/file1.md', content: '' });
      tabStore.openTab({ filePath: '/workspace/file2.md', content: '' });

      watched = syncTabWatches(tabStore, adapter, watched);
      expect(adapter.getWatchedFiles()).toContain('/workspace/file1.md');
      expect(adapter.getWatchedFiles()).toContain('/workspace/file2.md');
      expect(adapter.getWatchedFiles()).toHaveLength(2);

      // Close tab 1
      const tab1 = tabStore.getState().tabs.find((t) => t.filePath === '/workspace/file1.md');
      if (tab1) {
        tabStore.closeTab(tab1.id);
      }

      watched = syncTabWatches(tabStore, adapter, watched);
      expect(adapter.getWatchedFiles()).not.toContain('/workspace/file1.md');
      expect(adapter.getWatchedFiles()).toContain('/workspace/file2.md');
      expect(adapter.getWatchedFiles()).toHaveLength(1);

      // Close all tabs
      tabStore.closeAllTabs();
      watched = syncTabWatches(tabStore, adapter, watched);
      expect(adapter.getWatchedFiles()).toHaveLength(0);
    });
  });
});
