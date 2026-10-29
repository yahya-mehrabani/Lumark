import { useState, useEffect, useCallback } from 'react';
import { AppSettings, DEFAULT_APP_SETTINGS } from './types';
import { themeStore } from '../viewport/themeStore';
import { setActiveDirectionPreference } from '../direction/directionPreferences';
import { zoomController } from '../viewport/zoomController';

export interface SettingsBackendAdapter {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  resetSettings: () => Promise<AppSettings>;
}

export const SETTINGS_STORAGE_KEY = 'markdown-viewer-settings';

// In-memory fallback adapter when running without Wails RPC (e.g. tests or headless preview)
export class InMemorySettingsAdapter implements SettingsBackendAdapter {
  private current: AppSettings;

  constructor(initial: AppSettings = DEFAULT_APP_SETTINGS) {
    let stored: Partial<AppSettings> | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          stored = JSON.parse(raw);
        }
      } catch {
        // ignore
      }
    }
    this.current = {
      ...initial,
      ...(stored || {}),
      openTabs: [...(stored?.openTabs || initial.openTabs || [])],
      tocPosition: stored?.tocPosition || initial.tocPosition || 'left',
    };
  }

  async getSettings(): Promise<AppSettings> {
    return { ...this.current, openTabs: [...(this.current.openTabs || [])] };
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    this.current = { ...settings, openTabs: [...(settings.openTabs || [])] };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.current));
      } catch {
        // ignore
      }
    }
  }

  async resetSettings(): Promise<AppSettings> {
    this.current = { ...DEFAULT_APP_SETTINGS, openTabs: [] };
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    return { ...this.current };
  }
}

export class SettingsStore {
  private current: AppSettings;
  private adapter: SettingsBackendAdapter;
  private listeners: Set<(settings: AppSettings) => void> = new Set();
  private isLoaded: boolean = false;

  constructor(adapter: SettingsBackendAdapter = new InMemorySettingsAdapter()) {
    this.adapter = adapter;
    this.current = { ...DEFAULT_APP_SETTINGS, openTabs: [] };

    // Synchronize settings whenever themeStore changes (e.g. top bar toggle)
    themeStore.subscribe((themeState) => {
      if (this.current.theme !== themeState.preference) {
        this.current.theme = themeState.preference;
        this.adapter.saveSettings(this.current).catch(() => {});
      }
    });
  }

  public getSettings(): AppSettings {
    return {
      ...this.current,
      openTabs: [...(this.current.openTabs || [])],
      tocPosition: this.current.tocPosition || 'left',
    };
  }

  public isReady(): boolean {
    return this.isLoaded;
  }

  public setAdapter(adapter: SettingsBackendAdapter): void {
    this.adapter = adapter;
  }

  public applyToApp(settings: AppSettings): void {
    // 1. Synchronize themeStore if different from current preference
    if (settings.theme && themeStore.getPreference() !== settings.theme) {
      themeStore.setTheme(settings.theme);
    }
    // 2. Synchronize direction preferences
    if (settings.defaultDirection) {
      setActiveDirectionPreference(settings.defaultDirection);
    }
    // 3. Synchronize zoom controller
    if (typeof settings.defaultZoom === 'number' && settings.defaultZoom > 0) {
      const zoomVal = settings.defaultZoom <= 2.5 ? Math.round(settings.defaultZoom * 100) : Math.round(settings.defaultZoom);
      zoomController.setZoom(zoomVal);
    }
  }

  public async load(): Promise<AppSettings> {
    try {
      const loaded = await this.adapter.getSettings();
      if (loaded) {
        this.current = { ...loaded, openTabs: [...(loaded.openTabs || [])] };
        this.applyToApp(this.current);
      }
    } catch (err) {
      console.warn('Failed to load settings via backend adapter; using defaults:', err);
      this.current = { ...DEFAULT_APP_SETTINGS, openTabs: [] };
    } finally {
      this.isLoaded = true;
      this.notify();
    }
    return this.getSettings();
  }

  public async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    const updated: AppSettings = {
      ...this.current,
      ...partial,
      openTabs: partial.openTabs !== undefined ? [...partial.openTabs] : [...(this.current.openTabs || [])],
    };

    try {
      await this.adapter.saveSettings(updated);
    } catch (err) {
      console.error('Failed to persist settings to backend:', err);
    }

    this.current = updated;
    this.applyToApp(updated);
    this.notify();
    return this.getSettings();
  }

  public async resetSettings(): Promise<AppSettings> {
    try {
      const defaults = await this.adapter.resetSettings();
      this.current = { ...defaults, openTabs: [...(defaults.openTabs || [])] };
    } catch (err) {
      console.error('Failed to reset settings via backend adapter; falling back to local defaults:', err);
      this.current = { ...DEFAULT_APP_SETTINGS, openTabs: [] };
    }

    this.applyToApp(this.current);
    this.notify();
    return this.getSettings();
  }

  public subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getSettings();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error in settingsStore listener:', err);
      }
    });
  }
}

export const settingsStore = new SettingsStore();

export function useSettings(store: SettingsStore = settingsStore) {
  const [settings, setSettings] = useState<AppSettings>(() => store.getSettings());

  useEffect(() => {
    setSettings(store.getSettings());
    const unsubscribe = store.subscribe((newSettings) => {
      setSettings(newSettings);
    });
    return unsubscribe;
  }, [store]);

  const update = useCallback(
    (partial: Partial<AppSettings>) => store.updateSettings(partial),
    [store]
  );

  const reset = useCallback(() => store.resetSettings(), [store]);

  return {
    settings,
    updateSettings: update,
    resetSettings: reset,
  };
}
