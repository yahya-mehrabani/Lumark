import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeStore, useTheme } from './themeStore';

describe('ThemeStore and OS Media Listener (US-023.2)', () => {
  let mediaQueryListeners: ((e: any) => void)[] = [];
  let matchesDark = true;

  beforeEach(() => {
    mediaQueryListeners = [];
    matchesDark = true;

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark') ? matchesDark : false,
      media: query,
      onchange: null,
      addListener: (fn: (e: any) => void) => mediaQueryListeners.push(fn),
      removeListener: (fn: (e: any) => void) => {
        mediaQueryListeners = mediaQueryListeners.filter((l) => l !== fn);
      },
      addEventListener: (evt: string, fn: (e: any) => void) => {
        if (evt === 'change') mediaQueryListeners.push(fn);
      },
      removeEventListener: (evt: string, fn: (e: any) => void) => {
        if (evt === 'change') {
          mediaQueryListeners = mediaQueryListeners.filter((l) => l !== fn);
        }
      },
      dispatchEvent: vi.fn(),
    }));

    document.documentElement.removeAttribute('data-theme');
    document.body.className = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function triggerMediaChange(newMatchesDark: boolean) {
    matchesDark = newMatchesDark;
    const event = { matches: newMatchesDark, media: '(prefers-color-scheme: dark)' };
    for (const listener of mediaQueryListeners) {
      listener(event);
    }
  }

  it('initializes with default system preference and syncs data-theme to documentElement', () => {
    matchesDark = true;
    const store = new ThemeStore('system');

    expect(store.getPreference()).toBe('system');
    expect(store.getResolvedTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    store.cleanupMediaListener();
  });

  it('updates data-theme attribute on documentElement when setting explicit light theme', () => {
    const store = new ThemeStore('system');
    store.setTheme('light');

    expect(store.getPreference()).toBe('light');
    expect(store.getResolvedTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.body.classList.contains('theme-light')).toBe(true);
    expect(document.body.classList.contains('theme-dark')).toBe(false);
    store.cleanupMediaListener();
  });

  it('updates data-theme attribute on documentElement when setting explicit dark theme', () => {
    const store = new ThemeStore('light');
    store.setTheme('dark');

    expect(store.getPreference()).toBe('dark');
    expect(store.getResolvedTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    store.cleanupMediaListener();
  });

  it('cycles through system -> light -> dark -> system via toggleTheme()', () => {
    const store = new ThemeStore('system');

    store.toggleTheme();
    expect(store.getPreference()).toBe('light');

    store.toggleTheme();
    expect(store.getPreference()).toBe('dark');

    store.toggleTheme();
    expect(store.getPreference()).toBe('system');
    store.cleanupMediaListener();
  });

  it('dynamically adapts resolved theme when OS prefers-color-scheme changes under system preference', () => {
    matchesDark = true;
    const store = new ThemeStore('system');
    expect(store.getResolvedTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Simulate OS switching to light mode
    triggerMediaChange(false);
    expect(store.getResolvedTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.body.classList.contains('theme-light')).toBe(true);

    // Simulate OS switching back to dark mode
    triggerMediaChange(true);
    expect(store.getResolvedTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    store.cleanupMediaListener();
  });

  it('ignores OS prefers-color-scheme changes when explicit theme is selected', () => {
    matchesDark = true;
    const store = new ThemeStore('dark');
    store.setTheme('light');
    expect(store.getResolvedTheme()).toBe('light');

    // OS switches to dark mode, but user preference is explicit 'light'
    triggerMediaChange(true);
    expect(store.getPreference()).toBe('light');
    expect(store.getResolvedTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    store.cleanupMediaListener();
  });

  it('notifies subscribers on theme changes', () => {
    const store = new ThemeStore('system');
    const subscriber = vi.fn();
    const unsubscribe = store.subscribe(subscriber);

    store.setTheme('light');
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({
      preference: 'light',
      resolved: 'light',
      systemDark: true,
    });

    unsubscribe();
    store.setTheme('dark');
    expect(subscriber).toHaveBeenCalledTimes(1);
    store.cleanupMediaListener();
  });

  it('useTheme hook tracks store state and triggers re-renders', () => {
    const store = new ThemeStore('system');
    const { result } = renderHook(() => useTheme(store));

    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    store.cleanupMediaListener();
  });
});
