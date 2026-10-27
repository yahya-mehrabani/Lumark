import { useSyncExternalStore } from 'react';
import './theme.css';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  systemDark: boolean;
}

export const THEME_STORAGE_KEY = 'markdown-viewer-theme';

function getStoredTheme(): ThemePreference | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const val = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (val === 'light' || val === 'dark' || val === 'system') {
        return val as ThemePreference;
      }
    } catch {
      // ignore in environments without localStorage
    }
  }
  return null;
}

function persistStoredTheme(pref: ThemePreference): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // ignore in environments without localStorage
    }
  }
}

export class ThemeStore {
  private preference: ThemePreference;
  private systemDark: boolean;
  private state: ThemeState;
  private listeners: Set<(state: ThemeState) => void> = new Set();
  private mediaQueryCleanup: (() => void) | null = null;

  constructor(initialPreference?: ThemePreference) {
    const stored = getStoredTheme();
    this.preference = initialPreference ?? (stored ?? 'system');
    this.systemDark = this.detectSystemDark();
    this.state = {
      preference: this.preference,
      resolved: this.calculateResolvedTheme(this.preference, this.systemDark),
      systemDark: this.systemDark,
    };
    this.initMediaListener();
    this.applyToDom();
  }

  private detectSystemDark(): boolean {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        return mql.matches;
      } catch (err) {
        console.warn('Failed to query matchMedia:', err);
      }
    }
    return true; // default dark mode fallback
  }

  private calculateResolvedTheme(pref: ThemePreference, isDark: boolean): ResolvedTheme {
    if (pref === 'light') return 'light';
    if (pref === 'dark') return 'dark';
    return isDark ? 'dark' : 'light';
  }

  public initMediaListener(): void {
    this.cleanupMediaListener();

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        this.systemDark = mql.matches;

        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
          this.systemDark = e.matches;
          if (this.preference === 'system') {
            this.updateState();
            this.applyToDom();
            this.notify();
          }
        };

        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', handleChange);
          this.mediaQueryCleanup = () => mql.removeEventListener('change', handleChange);
        } else if (typeof mql.addListener === 'function') {
          mql.addListener(handleChange);
          this.mediaQueryCleanup = () => mql.removeListener(handleChange);
        }
      } catch (err) {
        console.warn('Failed to register prefers-color-scheme media listener:', err);
      }
    }
  }

  public cleanupMediaListener(): void {
    if (this.mediaQueryCleanup) {
      this.mediaQueryCleanup();
      this.mediaQueryCleanup = null;
    }
  }

  public getPreference(): ThemePreference {
    return this.preference;
  }

  public getResolvedTheme(): ResolvedTheme {
    return this.state.resolved;
  }

  public getState(): ThemeState {
    return this.state;
  }

  private updateState(): void {
    this.state = {
      preference: this.preference,
      resolved: this.calculateResolvedTheme(this.preference, this.systemDark),
      systemDark: this.systemDark,
    };
  }

  public setTheme(preference: ThemePreference): void {
    this.preference = preference;
    persistStoredTheme(preference);
    this.updateState();
    this.applyToDom();
    this.notify();
  }

  public toggleTheme(): void {
    const next: Record<ThemePreference, ThemePreference> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    this.setTheme(next[this.preference]);
  }

  public applyToDom(): void {
    if (typeof document !== 'undefined' && document.documentElement) {
      const resolved = this.getResolvedTheme();
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.style.colorScheme = resolved;

      if (document.body) {
        if (resolved === 'dark') {
          document.body.classList.add('theme-dark');
          document.body.classList.remove('theme-light');
        } else {
          document.body.classList.add('theme-light');
          document.body.classList.remove('theme-dark');
        }
      }

      const rootEl = document.getElementById('root');
      if (rootEl) {
        if (resolved === 'dark') {
          rootEl.classList.add('theme-dark');
          rootEl.classList.remove('theme-light');
        } else {
          rootEl.classList.add('theme-light');
          rootEl.classList.remove('theme-dark');
        }
      }
    }
  }

  public subscribe(listener: (state: ThemeState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in themeStore subscriber:', err);
      }
    });
  }
}

export const themeStore = new ThemeStore();

/**
 * React hook for consuming and updating theme state.
 */
export function useTheme(store: ThemeStore = themeStore): {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  systemDark: boolean;
  setTheme: (t: ThemePreference) => void;
  toggleTheme: () => void;
} {
  const state = useSyncExternalStore(
    (onStoreChange) => store.subscribe(onStoreChange),
    () => store.getState(),
    () => store.getState()
  );

  return {
    theme: state.preference,
    resolvedTheme: state.resolved,
    systemDark: state.systemDark,
    setTheme: (t: ThemePreference) => store.setTheme(t),
    toggleTheme: () => store.toggleTheme(),
  };
}
