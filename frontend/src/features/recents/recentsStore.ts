import { useState, useEffect, useCallback } from 'react';
import { RecentFileItem } from './types';

export interface RecentsBackendAdapter {
  getRecentFiles: () => Promise<RecentFileItem[]>;
  addRecentFile: (filePath: string) => Promise<RecentFileItem>;
  removeRecentFile: (filePath: string) => Promise<void>;
  clearRecentFiles: () => Promise<void>;
}

export class InMemoryRecentsAdapter implements RecentsBackendAdapter {
  private items: RecentFileItem[] = [];
  private maxItems: number;

  constructor(initial: RecentFileItem[] = [], maxItems: number = 20) {
    this.items = [...initial];
    this.maxItems = maxItems;
  }

  async getRecentFiles(): Promise<RecentFileItem[]> {
    return [...this.items];
  }

  async addRecentFile(filePath: string): Promise<RecentFileItem> {
    const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
    const filename = parts.length > 0 ? parts[parts.length - 1] : 'document.md';
    const now = new Date().toISOString();

    const existingIndex = this.items.findIndex(
      (it) => it.filePath.toLowerCase() === filePath.toLowerCase()
    );

    const exists = existingIndex !== -1 ? (this.items[existingIndex].exists ?? true) : true;

    const newEntry: RecentFileItem = {
      filePath,
      filename,
      lastOpenedAt: now,
      exists,
    };

    const filtered = this.items.filter(
      (it) => it.filePath.toLowerCase() !== filePath.toLowerCase()
    );

    this.items = [newEntry, ...filtered].slice(0, this.maxItems);
    return newEntry;
  }

  async removeRecentFile(filePath: string): Promise<void> {
    this.items = this.items.filter(
      (it) => it.filePath.toLowerCase() !== filePath.toLowerCase()
    );
  }

  async clearRecentFiles(): Promise<void> {
    this.items = [];
  }
}

export class RecentsStore {
  private items: RecentFileItem[] = [];
  private adapter: RecentsBackendAdapter;
  private listeners: Set<(items: RecentFileItem[]) => void> = new Set();
  private isLoaded: boolean = false;

  constructor(adapter: RecentsBackendAdapter = new InMemoryRecentsAdapter()) {
    this.adapter = adapter;
  }

  public getRecentFiles(): RecentFileItem[] {
    return [...this.items];
  }

  public isReady(): boolean {
    return this.isLoaded;
  }

  public setAdapter(adapter: RecentsBackendAdapter): void {
    this.adapter = adapter;
  }

  public async load(): Promise<RecentFileItem[]> {
    try {
      const loaded = await this.adapter.getRecentFiles();
      if (loaded) {
        this.items = [...loaded];
      }
    } catch (err) {
      console.warn('Failed to load recent files from backend adapter:', err);
    } finally {
      this.isLoaded = true;
      this.notify();
    }
    return this.getRecentFiles();
  }

  public async addRecentFile(filePath: string): Promise<RecentFileItem> {
    try {
      const added = await this.adapter.addRecentFile(filePath);
      const updated = await this.adapter.getRecentFiles();
      this.items = [...updated];
      this.notify();
      return added;
    } catch (err) {
      console.error('Failed to add recent file via adapter:', err);
      // Local optimistic fallback
      const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
      const filename = parts.length > 0 ? parts[parts.length - 1] : 'document.md';
      const fallback: RecentFileItem = {
        filePath,
        filename,
        lastOpenedAt: new Date().toISOString(),
        exists: true,
      };
      const filtered = this.items.filter(
        (it) => it.filePath.toLowerCase() !== filePath.toLowerCase()
      );
      this.items = [fallback, ...filtered].slice(0, 20);
      this.notify();
      return fallback;
    }
  }

  public async removeRecentFile(filePath: string): Promise<void> {
    try {
      await this.adapter.removeRecentFile(filePath);
      const updated = await this.adapter.getRecentFiles();
      this.items = [...updated];
    } catch (err) {
      console.error('Failed to remove recent file via adapter:', err);
      this.items = this.items.filter(
        (it) => it.filePath.toLowerCase() !== filePath.toLowerCase()
      );
    }
    this.notify();
  }

  public async clearRecentFiles(): Promise<void> {
    try {
      await this.adapter.clearRecentFiles();
    } catch (err) {
      console.error('Failed to clear recent files via adapter:', err);
    }
    this.items = [];
    this.notify();
  }

  public subscribe(listener: (items: RecentFileItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getRecentFiles();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error in recentsStore listener:', err);
      }
    });
  }
}

export const recentsStore = new RecentsStore();

export function useRecentFiles(store: RecentsStore = recentsStore) {
  const [items, setItems] = useState<RecentFileItem[]>(() => store.getRecentFiles());

  useEffect(() => {
    setItems(store.getRecentFiles());
    const unsubscribe = store.subscribe((newItems) => {
      setItems(newItems);
    });
    return unsubscribe;
  }, [store]);

  const add = useCallback((filePath: string) => store.addRecentFile(filePath), [store]);
  const remove = useCallback((filePath: string) => store.removeRecentFile(filePath), [store]);
  const clear = useCallback(() => store.clearRecentFiles(), [store]);

  return {
    recentFiles: items,
    addRecentFile: add,
    removeRecentFile: remove,
    clearRecentFiles: clear,
  };
}
