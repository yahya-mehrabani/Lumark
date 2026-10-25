import { describe, it, expect, vi } from 'vitest';
import { createTabStore } from './tabStore';
import { restoreTabsOnStartup, saveOpenTabsToSettings, DocumentLoader } from './tabRestore';
import { SettingsStore, InMemorySettingsAdapter } from '../preferences/settingsStore';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../preferences/types';

describe('Tab Restoration Logic (US-026.3)', () => {
  it('restores all persisted tabs in order when restoreOpenTabs is true', async () => {
    const tabStore = createTabStore();
    const initialSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      restoreOpenTabs: true,
      openTabs: ['/docs/intro.md', '/docs/architecture.md', '/docs/summary.md'],
    };
    const settingsStore = new SettingsStore(new InMemorySettingsAdapter(initialSettings));
    await settingsStore.load();

    const mockLoader: DocumentLoader = vi.fn().mockImplementation(async (path: string) => {
      const parts = path.split('/');
      return {
        filePath: path,
        filename: parts[parts.length - 1],
        dir: parts.slice(0, -1).join('/'),
        content: `# Content for ${path}`,
      };
    });

    const result = await restoreTabsOnStartup({
      tabStore,
      settingsStore,
      docLoader: mockLoader,
    });

    expect(result.restoredCount).toBe(3);
    expect(result.restoredPaths).toEqual([
      '/docs/intro.md',
      '/docs/architecture.md',
      '/docs/summary.md',
    ]);
    expect(result.failedPaths).toHaveLength(0);

    const tabs = tabStore.getState().tabs;
    expect(tabs).toHaveLength(3);
    expect(tabs[0].filePath).toBe('/docs/intro.md');
    expect(tabs[0].status).toBe('ready');
    expect(tabs[1].filePath).toBe('/docs/architecture.md');
    expect(tabs[2].filePath).toBe('/docs/summary.md');
  });

  it('does not restore tabs when restoreOpenTabs is false', async () => {
    const tabStore = createTabStore();
    const initialSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      restoreOpenTabs: false,
      openTabs: ['/docs/intro.md', '/docs/architecture.md'],
    };
    const settingsStore = new SettingsStore(new InMemorySettingsAdapter(initialSettings));
    await settingsStore.load();

    const mockLoader: DocumentLoader = vi.fn();

    const result = await restoreTabsOnStartup({
      tabStore,
      settingsStore,
      docLoader: mockLoader,
    });

    expect(result.restoredCount).toBe(0);
    expect(result.restoredPaths).toHaveLength(0);
    expect(mockLoader).not.toHaveBeenCalled();
    expect(tabStore.getState().tabs).toHaveLength(0);
  });

  it('handles missing or corrupted documents by setting missing status without crashing', async () => {
    const tabStore = createTabStore();
    const initialSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      restoreOpenTabs: true,
      openTabs: ['/docs/valid.md', '/docs/deleted.md', '/docs/another-valid.md'],
    };
    const settingsStore = new SettingsStore(new InMemorySettingsAdapter(initialSettings));
    await settingsStore.load();

    const mockLoader: DocumentLoader = vi.fn().mockImplementation(async (path: string) => {
      if (path === '/docs/deleted.md') {
        throw new Error('File not found: /docs/deleted.md');
      }
      return {
        filePath: path,
        filename: path.split('/').pop() || 'doc.md',
        content: '# Valid Document',
      };
    });

    const result = await restoreTabsOnStartup({
      tabStore,
      settingsStore,
      docLoader: mockLoader,
    });

    expect(result.restoredCount).toBe(3);
    expect(result.restoredPaths).toEqual(['/docs/valid.md', '/docs/another-valid.md']);
    expect(result.failedPaths).toEqual(['/docs/deleted.md']);

    const tabs = tabStore.getState().tabs;
    expect(tabs).toHaveLength(3);
    expect(tabs[0].status).toBe('ready');
    expect(tabs[1].filePath).toBe('/docs/deleted.md');
    expect(tabs[1].status).toBe('missing');
    expect(tabs[1].errorMessage).toContain('File not found on disk');
    expect(tabs[2].status).toBe('ready');
  });

  it('saves active open tab paths to settingsStore', async () => {
    const tabStore = createTabStore();
    const settingsStore = new SettingsStore(new InMemorySettingsAdapter());
    await settingsStore.load();

    tabStore.openTab({
      filePath: '/notes/todo.md',
      filename: 'todo.md',
      content: 'Task 1',
    });
    tabStore.openTab({
      filePath: '/notes/meeting.md',
      filename: 'meeting.md',
      content: 'Agenda',
    });

    await saveOpenTabsToSettings(tabStore, settingsStore);

    const saved = settingsStore.getSettings();
    expect(saved.openTabs).toEqual(['/notes/todo.md', '/notes/meeting.md']);

    // Close one tab and resave
    const activeTab = tabStore.getActiveTab();
    if (activeTab) {
      tabStore.closeTab(activeTab.id);
    }
    await saveOpenTabsToSettings(tabStore, settingsStore);
    const updated = settingsStore.getSettings();
    expect(updated.openTabs).toEqual(['/notes/todo.md']);
  });
});
