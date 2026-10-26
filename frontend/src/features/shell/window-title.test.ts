import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TabStore } from '../tabs/tabStore';
import { Window } from '@wailsio/runtime';

vi.mock('@wailsio/runtime', () => ({
  Window: {
    SetTitle: vi.fn().mockResolvedValue(undefined),
  },
  Events: {
    On: vi.fn(),
  },
  WML: {
    Reload: vi.fn(),
  },
}));

describe('Window Title Synchronization (Item 15)', () => {
  let store: TabStore;

  const syncWindowTitle = (tabStore: TabStore) => {
    const activeTab = tabStore.getActiveTab();
    const title = activeTab
      ? `${activeTab.filename || activeTab.displayTitle} — Markdown Viewer`
      : 'Markdown Viewer';

    if (typeof document !== 'undefined') {
      document.title = title;
    }
    try {
      Window?.SetTitle?.(title)?.catch?.(() => {});
    } catch {
      // Ignore
    }
    return title;
  };

  beforeEach(() => {
    store = new TabStore();
    document.title = 'Markdown Viewer';
    vi.clearAllMocks();
  });

  it('initializes with default "Markdown Viewer" when no tabs are open', () => {
    const title = syncWindowTitle(store);
    expect(title).toBe('Markdown Viewer');
    expect(document.title).toBe('Markdown Viewer');
    expect(Window.SetTitle).toHaveBeenCalledWith('Markdown Viewer');
  });

  it('synchronizes title with active tab filename when tab is opened', () => {
    store.openTab({
      filePath: '/home/user/notes.md',
      filename: 'notes.md',
      content: '# Notes',
    });

    const title = syncWindowTitle(store);
    expect(title).toBe('notes.md — Markdown Viewer');
    expect(document.title).toBe('notes.md — Markdown Viewer');
    expect(Window.SetTitle).toHaveBeenCalledWith('notes.md — Markdown Viewer');
  });

  it('updates title when active tab switches', () => {
    const tab1 = store.openTab({
      filePath: '/docs/first.md',
      filename: 'first.md',
      content: '# First',
    });
    store.openTab({
      filePath: '/docs/second.md',
      filename: 'second.md',
      content: '# Second',
    });

    syncWindowTitle(store);
    expect(document.title).toBe('second.md — Markdown Viewer');

    // Switch back to first tab
    store.switchTab(tab1.id);
    syncWindowTitle(store);
    expect(document.title).toBe('first.md — Markdown Viewer');
  });

  it('reverts title to "Markdown Viewer" when all tabs are closed', () => {
    const tab = store.openTab({
      filePath: '/docs/temp.md',
      filename: 'temp.md',
      content: 'temp',
    });
    syncWindowTitle(store);
    expect(document.title).toBe('temp.md — Markdown Viewer');

    store.closeTab(tab.id);
    syncWindowTitle(store);
    expect(document.title).toBe('Markdown Viewer');
  });
});
