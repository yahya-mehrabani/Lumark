import { OpenTabOptions, TabItem, TabState, TabStatus } from './types';
import { arePathsEqual, disambiguateTitles, extractPathDetails, normalizePath } from './tabUtils';

export class TabStore {
  private state: TabState;
  private listeners: Set<() => void> = new Set();
  private nextTabCounter = 1;

  constructor(initialState?: Partial<TabState>) {
    const rawTabs = initialState?.tabs || [];
    const disambiguated = disambiguateTitles(rawTabs);
    this.state = {
      tabs: disambiguated,
      activeTabId: initialState?.activeTabId !== undefined
        ? initialState.activeTabId
        : (disambiguated.length > 0 ? disambiguated[0].id : null),
    };
  }

  public getState = (): TabState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify = (): void => {
    for (const listener of this.listeners) {
      listener();
    }
  };

  /**
   * Returns the currently active TabItem or null if no tabs are open.
   */
  public getActiveTab = (): TabItem | null => {
    if (!this.state.activeTabId) return null;
    return this.state.tabs.find((t) => t.id === this.state.activeTabId) || null;
  };

  /**
   * Opens a new tab or focuses an existing one if the file is already open.
   * Duplicate paths are detected and focused without altering tab order.
   */
  public openTab = (options: OpenTabOptions): TabItem => {
    const normalizedFilePath = normalizePath(options.filePath);

    // 1. Check if already open
    const existingIndex = this.state.tabs.findIndex((t) => arePathsEqual(t.filePath, normalizedFilePath));
    if (existingIndex !== -1) {
      const existingTab = this.state.tabs[existingIndex];
      const updatedTab: TabItem = {
        ...existingTab,
        content: options.content !== undefined ? options.content : existingTab.content,
        status: options.status || existingTab.status,
        errorMessage: options.errorMessage !== undefined ? options.errorMessage : existingTab.errorMessage,
        lastModified: options.lastModified !== undefined ? options.lastModified : existingTab.lastModified,
        fileSizeBytes: options.fileSizeBytes !== undefined ? options.fileSizeBytes : existingTab.fileSizeBytes,
      };

      const newTabs = [...this.state.tabs];
      newTabs[existingIndex] = updatedTab;

      this.state = {
        tabs: newTabs,
        activeTabId: existingTab.id,
      };
      this.notify();
      return updatedTab;
    }

    // 2. Extract details
    const details = extractPathDetails(normalizedFilePath);
    const filename = options.filename || details.filename;
    const parentDir = options.parentDir || details.parentDir;
    const tabId = `tab-${this.nextTabCounter++}-${Date.now()}`;

    const newTab: TabItem = {
      id: tabId,
      filePath: normalizedFilePath,
      filename,
      parentDir,
      displayTitle: filename,
      content: options.content || '',
      status: options.status || 'ready',
      errorMessage: options.errorMessage,
      lastModified: options.lastModified,
      fileSizeBytes: options.fileSizeBytes,
      isReadOnly: options.isReadOnly,
    };

    const newTabs = disambiguateTitles([...this.state.tabs, newTab]);

    this.state = {
      tabs: newTabs,
      activeTabId: tabId,
    };

    this.notify();
    return newTabs.find((t) => t.id === tabId) || newTab;
  };

  /**
   * Focuses an existing tab if open by path.
   * Returns true if found and focused, false otherwise.
   */
  public focusExistingTab = (filePath: string): boolean => {
    const existing = this.state.tabs.find((t) => arePathsEqual(t.filePath, filePath));
    if (existing) {
      if (this.state.activeTabId !== existing.id) {
        this.state = {
          ...this.state,
          activeTabId: existing.id,
        };
        this.notify();
      }
      return true;
    }
    return false;
  };

  /**
   * Switches the active tab to the specified tabId (or null for empty/home state).
   */
  public switchTab = (tabId: string | null): boolean => {
    if (tabId === null) {
      if (this.state.activeTabId !== null) {
        this.state = {
          ...this.state,
          activeTabId: null,
        };
        this.notify();
      }
      return true;
    }

    const exists = this.state.tabs.some((t) => t.id === tabId);
    if (!exists) return false;

    if (this.state.activeTabId !== tabId) {
      this.state = {
        ...this.state,
        activeTabId: tabId,
      };
      this.notify();
    }
    return true;
  };

  /**
   * Closes a tab by ID.
   * If the closed tab was active, focuses an adjacent tab.
   * If the last tab was closed, activeTabId becomes null (empty state).
   */
  public closeTab = (tabId: string): void => {
    const tabIndex = this.state.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const remaining = this.state.tabs.filter((t) => t.id !== tabId);
    const disambiguated = disambiguateTitles(remaining);

    let nextActiveId: string | null = this.state.activeTabId;

    if (this.state.activeTabId === tabId) {
      if (disambiguated.length === 0) {
        nextActiveId = null;
      } else {
        const nextIndex = Math.min(tabIndex, disambiguated.length - 1);
        nextActiveId = disambiguated[nextIndex].id;
      }
    }

    this.state = {
      tabs: disambiguated,
      activeTabId: nextActiveId,
    };

    this.notify();
  };

  /**
   * Updates a tab's error/status badge.
   */
  public setTabStatus = (tabId: string, status: TabStatus, errorMessage?: string): void => {
    const tabIndex = this.state.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const newTabs = [...this.state.tabs];
    newTabs[tabIndex] = {
      ...newTabs[tabIndex],
      status,
      errorMessage,
    };

    this.state = {
      ...this.state,
      tabs: newTabs,
    };
    this.notify();
  };

  /**
   * Updates tab content in memory, resetting status to 'ready' and clearing error messages.
   */
  public updateTabContent = (tabId: string, content: string, status: TabStatus = 'ready'): void => {
    const tabIndex = this.state.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const newTabs = [...this.state.tabs];
    newTabs[tabIndex] = {
      ...newTabs[tabIndex],
      content,
      status,
      errorMessage: status === 'ready' ? undefined : newTabs[tabIndex].errorMessage,
    };

    this.state = {
      ...this.state,
      tabs: newTabs,
    };
    this.notify();
  };

  /**
   * Closes all tabs and returns to empty state.
   */
  public closeAllTabs = (): void => {
    this.state = {
      tabs: [],
      activeTabId: null,
    };
    this.notify();
  };
}

export function createTabStore(initialState?: Partial<TabState>): TabStore {
  return new TabStore(initialState);
}

// Global default tab store instance
export const tabStore = createTabStore();
