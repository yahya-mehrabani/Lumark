import { TabStore } from './tabStore';
import { Call } from '@wailsio/runtime';

export interface WatcherAdapter {
  watchFile: (filePath: string) => Promise<void>;
  unwatchFile: (filePath: string) => Promise<void>;
}

/**
 * In-memory watcher adapter for testing and headless execution.
 */
export class InMemoryWatcherAdapter implements WatcherAdapter {
  private watched = new Set<string>();

  async watchFile(filePath: string): Promise<void> {
    this.watched.add(filePath);
  }

  async unwatchFile(filePath: string): Promise<void> {
    this.watched.delete(filePath);
  }

  isWatching(filePath: string): boolean {
    return this.watched.has(filePath);
  }

  getWatchedFiles(): string[] {
    return Array.from(this.watched);
  }
}

/**
 * Wails v3 backend RPC watcher adapter.
 */
export class WailsWatcherAdapter implements WatcherAdapter {
  async watchFile(filePath: string): Promise<void> {
    try {
      await Call.ByName('markdown-viewer/internal/watcher.Service.WatchFile', filePath);
    } catch (err) {
      console.warn(`Wails watchFile error for ${filePath}:`, err);
    }
  }

  async unwatchFile(filePath: string): Promise<void> {
    try {
      await Call.ByName('markdown-viewer/internal/watcher.Service.UnwatchFile', filePath);
    } catch (err) {
      console.warn(`Wails unwatchFile error for ${filePath}:`, err);
    }
  }
}

/**
 * Synchronizes currently open document tab paths with the watcher adapter.
 * - Files newly opened are registered with watchFile.
 * - Files closed and no longer present in any tab are unregistered with unwatchFile.
 * - Returns the updated Set of watched paths.
 */
export function syncTabWatches(
  tabStore: TabStore,
  adapter: WatcherAdapter,
  previouslyWatched: Set<string>
): Set<string> {
  const currentTabs = tabStore.getState().tabs;
  const currentPaths = new Set(
    currentTabs
      .map((t) => t.filePath)
      .filter((p): p is string => Boolean(p && typeof p === 'string' && p.trim() !== ''))
  );

  // Watch newly opened files
  for (const path of currentPaths) {
    if (!previouslyWatched.has(path)) {
      adapter.watchFile(path).catch((err) => {
        console.warn(`Error registering file watch for ${path}:`, err);
      });
    }
  }

  // Unwatch files that were closed
  for (const path of previouslyWatched) {
    if (!currentPaths.has(path)) {
      adapter.unwatchFile(path).catch((err) => {
        console.warn(`Error unregistering file watch for ${path}:`, err);
      });
    }
  }

  return currentPaths;
}
