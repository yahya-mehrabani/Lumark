import { describe, it, expect, beforeEach } from 'vitest';
import { createTabStore, TabStore } from './tabStore';
import { renderHook, act } from '@testing-library/react';
import { useTabStore, useActiveTab, useTabActions } from './useTabStore';

describe('TabStateStore (US-007.1)', () => {
  let store: TabStore;

  beforeEach(() => {
    store = createTabStore();
  });

  it('initializes with empty state (0 tabs, activeTabId = null)', () => {
    const state = store.getState();
    expect(state.tabs).toEqual([]);
    expect(state.activeTabId).toBeNull();
    expect(store.getActiveTab()).toBeNull();
  });

  it('opens a tab and sets it as active', () => {
    const tab = store.openTab({
      filePath: '/home/user/docs/guide.md',
      content: '# Guide',
    });

    expect(tab.filename).toBe('guide.md');
    expect(tab.parentDir).toBe('docs');
    expect(tab.displayTitle).toBe('guide.md');
    expect(tab.content).toBe('# Guide');
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().activeTabId).toBe(tab.id);
    expect(store.getActiveTab()?.id).toBe(tab.id);
  });

  it('opens multiple tabs sequentially and updates active tab to the latest opened', () => {
    const tab1 = store.openTab({ filePath: '/a/one.md', content: '1' });
    const tab2 = store.openTab({ filePath: '/b/two.md', content: '2' });

    const state = store.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.tabs[0].id).toBe(tab1.id);
    expect(state.tabs[1].id).toBe(tab2.id);
    expect(state.activeTabId).toBe(tab2.id);
  });

  it('prevents duplicate tabs and focuses existing tab without altering order', () => {
    const tab1 = store.openTab({ filePath: '/docs/intro.md', content: 'Intro' });
    const tab2 = store.openTab({ filePath: '/docs/setup.md', content: 'Setup' });
    expect(store.getState().activeTabId).toBe(tab2.id);

    // Attempt to open intro.md again
    const reopened = store.openTab({ filePath: '/docs/intro.md', content: 'Updated Intro' });

    expect(reopened.id).toBe(tab1.id);
    expect(store.getState().tabs).toHaveLength(2);
    // Tab order preserved: intro is still index 0
    expect(store.getState().tabs[0].id).toBe(tab1.id);
    expect(store.getState().tabs[1].id).toBe(tab2.id);
    // Active tab switched to intro.md
    expect(store.getState().activeTabId).toBe(tab1.id);
    expect(reopened.content).toBe('Updated Intro');
  });

  it('normalizes paths with backslashes and redundant slashes for duplicate detection', () => {
    const tab1 = store.openTab({ filePath: 'C:\\Users\\docs\\test.md', content: 'Windows' });
    expect(store.getState().tabs).toHaveLength(1);

    // Open same file with forward slashes and case variation
    const reopened = store.openTab({ filePath: 'c:/Users/docs/test.md' });
    expect(reopened.id).toBe(tab1.id);
    expect(store.getState().tabs).toHaveLength(1);
  });

  it('focusExistingTab returns true and focuses tab if present, false otherwise', () => {
    const tab1 = store.openTab({ filePath: '/docs/alpha.md' });
    store.openTab({ filePath: '/docs/beta.md' });

    expect(store.focusExistingTab('/docs/alpha.md')).toBe(true);
    expect(store.getState().activeTabId).toBe(tab1.id);

    expect(store.focusExistingTab('/docs/nonexistent.md')).toBe(false);
  });

  it('switches active tab cleanly', () => {
    const tab1 = store.openTab({ filePath: '/1.md' });
    const tab2 = store.openTab({ filePath: '/2.md' });
    expect(store.getState().activeTabId).toBe(tab2.id);

    const ok = store.switchTab(tab1.id);
    expect(ok).toBe(true);
    expect(store.getState().activeTabId).toBe(tab1.id);

    const invalid = store.switchTab('unknown-id');
    expect(invalid).toBe(false);
  });

  it('closes a tab and focuses adjacent tab', () => {
    const tab1 = store.openTab({ filePath: '/tab1.md' });
    const tab2 = store.openTab({ filePath: '/tab2.md' });
    const tab3 = store.openTab({ filePath: '/tab3.md' });

    // Active tab is tab3 (index 2). Close tab3:
    store.closeTab(tab3.id);
    expect(store.getState().tabs).toHaveLength(2);
    // Next active should be tab2 (index 1)
    expect(store.getState().activeTabId).toBe(tab2.id);

    // Active is tab2 (index 1). Switch to tab1 (index 0) and close tab1:
    store.switchTab(tab1.id);
    store.closeTab(tab1.id);
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().activeTabId).toBe(tab2.id);
  });

  it('closing the last remaining tab returns to empty state (0 tabs, activeTabId = null)', () => {
    const tab = store.openTab({ filePath: '/lone.md', content: 'lone content' });
    expect(store.getState().tabs).toHaveLength(1);

    store.closeTab(tab.id);

    expect(store.getState().tabs).toHaveLength(0);
    expect(store.getState().activeTabId).toBeNull();
    expect(store.getActiveTab()).toBeNull();
  });

  it('disambiguates tab display titles when filenames collide across directories', () => {
    const tabA = store.openTab({ filePath: '/project-a/README.md' });
    const tabB = store.openTab({ filePath: '/project-b/README.md' });

    const state = store.getState();
    const updatedA = state.tabs.find((t) => t.id === tabA.id);
    const updatedB = state.tabs.find((t) => t.id === tabB.id);

    expect(updatedA?.displayTitle).toBe('README.md — project-a');
    expect(updatedB?.displayTitle).toBe('README.md — project-b');

    // Close one: the other returns to clean filename title
    store.closeTab(tabB.id);
    expect(store.getState().tabs[0].displayTitle).toBe('README.md');
  });

  it('updates tab status badge and error message', () => {
    const tab = store.openTab({ filePath: '/missing.md' });
    store.setTabStatus(tab.id, 'missing', 'File not found on disk');

    const updated = store.getState().tabs[0];
    expect(updated.status).toBe('missing');
    expect(updated.errorMessage).toBe('File not found on disk');
  });

  it('closeAllTabs clears all tabs and returns to empty state', () => {
    store.openTab({ filePath: '/1.md' });
    store.openTab({ filePath: '/2.md' });
    expect(store.getState().tabs).toHaveLength(2);

    store.closeAllTabs();
    expect(store.getState().tabs).toHaveLength(0);
    expect(store.getState().activeTabId).toBeNull();
  });

  it('integrates with React hook useTabStore', () => {
    const testStore = createTabStore();
    const { result } = renderHook(() => ({
      state: useTabStore(testStore),
      activeTab: useActiveTab(testStore),
      actions: useTabActions(testStore),
    }));

    expect(result.current.state.tabs).toHaveLength(0);
    expect(result.current.activeTab).toBeNull();

    act(() => {
      result.current.actions.openTab({ filePath: '/hook-test.md', content: 'Hello Hook' });
    });

    expect(result.current.state.tabs).toHaveLength(1);
    expect(result.current.activeTab?.filename).toBe('hook-test.md');
    expect(result.current.activeTab?.content).toBe('Hello Hook');

    act(() => {
      result.current.actions.closeTab(result.current.state.tabs[0].id);
    });

    expect(result.current.state.tabs).toHaveLength(0);
    expect(result.current.activeTab).toBeNull();
  });
});
