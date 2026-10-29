import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsStore, InMemorySettingsAdapter } from './settingsStore';
import { DEFAULT_APP_SETTINGS } from './types';

describe('SettingsStore tocPosition setting', () => {
  let adapter: InMemorySettingsAdapter;
  let store: SettingsStore;

  beforeEach(() => {
    window.localStorage.clear();
    adapter = new InMemorySettingsAdapter();
    store = new SettingsStore(adapter);
  });

  it('defaults tocPosition to left', () => {
    expect(DEFAULT_APP_SETTINGS.tocPosition).toBe('left');
    const settings = store.getSettings();
    expect(settings.tocPosition).toBe('left');
  });

  it('updates tocPosition to right and auto and notifies listeners', async () => {
    let notifiedPosition = '';
    const unsubscribe = store.subscribe((s) => {
      notifiedPosition = s.tocPosition || '';
    });

    await store.updateSettings({ tocPosition: 'right' });
    expect(store.getSettings().tocPosition).toBe('right');
    expect(notifiedPosition).toBe('right');

    await store.updateSettings({ tocPosition: 'auto' });
    expect(store.getSettings().tocPosition).toBe('auto');
    expect(notifiedPosition).toBe('auto');

    unsubscribe();
  });

  it('resets tocPosition back to default left upon resetSettings', async () => {
    await store.updateSettings({ tocPosition: 'right' });
    expect(store.getSettings().tocPosition).toBe('right');

    await store.resetSettings();
    expect(store.getSettings().tocPosition).toBe('left');
  });

  it('initializes tocPosition from adapter stored settings', async () => {
    const customAdapter = new InMemorySettingsAdapter({
      ...DEFAULT_APP_SETTINGS,
      tocPosition: 'right',
    });
    const customStore = new SettingsStore(customAdapter);
    await customStore.load();
    expect(customStore.getSettings().tocPosition).toBe('right');
  });
});
