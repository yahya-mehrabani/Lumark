import { TabStore } from './tabStore';
import { SettingsStore, settingsStore as defaultSettingsStore } from '../preferences/settingsStore';

export interface DocumentLoader {
  (path: string): Promise<{
    filePath: string;
    filename: string;
    dir?: string;
    content: string;
  }>;
}

export interface RestoreTabsOptions {
  tabStore: TabStore;
  settingsStore?: SettingsStore;
  docLoader: DocumentLoader;
}

export interface RestoreTabsResult {
  restoredCount: number;
  restoredPaths: string[];
  failedPaths: string[];
}

/**
 * Persists the current list of opened tab file paths to user preferences.
 * Ignores untitled, empty, or temporary tabs.
 */
export async function saveOpenTabsToSettings(
  tabStore: TabStore,
  settingsStore: SettingsStore = defaultSettingsStore
): Promise<void> {
  const currentTabs = tabStore.getState().tabs;
  const paths = currentTabs
    .map((t) => t.filePath)
    .filter((p) => p && !p.startsWith('untitled:') && p.trim().length > 0);

  await settingsStore.updateSettings({ openTabs: paths });
}

/**
 * Reopens previously active tabs on startup if `restoreOpenTabs` is enabled in preferences.
 * Missing files are restored with status 'missing' without crashing.
 */
export async function restoreTabsOnStartup(
  options: RestoreTabsOptions
): Promise<RestoreTabsResult> {
  const settingsStore = options.settingsStore || defaultSettingsStore;
  const settings = settingsStore.getSettings();

  if (!settings.restoreOpenTabs) {
    return { restoredCount: 0, restoredPaths: [], failedPaths: [] };
  }

  const paths = settings.openTabs || [];
  if (paths.length === 0) {
    return { restoredCount: 0, restoredPaths: [], failedPaths: [] };
  }

  const restoredPaths: string[] = [];
  const failedPaths: string[] = [];

  for (const filePath of paths) {
    if (!filePath || !filePath.trim()) continue;

    try {
      const doc = await options.docLoader(filePath);
      options.tabStore.openTab({
        filePath: doc.filePath,
        filename: doc.filename,
        parentDir: doc.dir,
        content: doc.content,
        status: 'ready',
      });
      restoredPaths.push(filePath);
    } catch (err) {
      console.warn(`Failed to restore tab for ${filePath} on startup:`, err);
      const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
      const filename = parts.length > 0 ? parts[parts.length - 1] : 'document.md';
      options.tabStore.openTab({
        filePath,
        filename,
        content: '',
        status: 'missing',
        errorMessage: 'File not found on disk or could not be opened.',
      });
      failedPaths.push(filePath);
    }
  }

  return {
    restoredCount: restoredPaths.length + failedPaths.length,
    restoredPaths,
    failedPaths,
  };
}
