import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { SettingsStore, InMemorySettingsAdapter } from './settingsStore';
import { themeStore } from '../viewport/themeStore';
import { getActiveDirectionPreference } from '../direction/directionPreferences';
import { zoomController } from '../viewport/zoomController';

describe('SettingsModal Component', () => {
  let store: SettingsStore;
  let adapter: InMemorySettingsAdapter;

  beforeEach(() => {
    adapter = new InMemorySettingsAdapter({
      schemaVersion: 1,
      theme: 'system',
      defaultDirection: 'auto',
      defaultZoom: 1.0,
      restoreOpenTabs: true,
      openTabs: [],
      maxRecentFiles: 20,
    });
    store = new SettingsStore(adapter);
    themeStore.setTheme('system');
    zoomController.setZoom(100);
  });

  it('does not render when isOpen is false', () => {
    const handleClose = vi.fn();
    render(<SettingsModal isOpen={false} onClose={handleClose} store={store} />);
    expect(screen.queryByTestId('settings-modal')).toBeNull();
  });

  it('renders modal dialog with accessible attributes when isOpen is true', () => {
    const handleClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={handleClose} store={store} />);

    const dialog = screen.getByTestId('settings-modal');
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Preferences & Settings')).toBeDefined();
  });

  it('renders theme, direction, zoom, tab restore, and recent files controls', () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    expect(screen.getByTestId('settings-theme-select')).toBeDefined();
    expect(screen.getByTestId('settings-direction-select')).toBeDefined();
    expect(screen.getByTestId('settings-zoom-select')).toBeDefined();
    expect(screen.getByTestId('settings-restore-tabs-checkbox')).toBeDefined();
    expect(screen.getByTestId('settings-max-recent-select')).toBeDefined();
  });

  it('updates theme setting and synchronizes with themeStore', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    const themeSelect = screen.getByTestId('settings-theme-select') as HTMLSelectElement;
    expect(themeSelect.value).toBe('system');

    fireEvent.change(themeSelect, { target: { value: 'dark' } });

    await waitFor(() => {
      expect(store.getSettings().theme).toBe('dark');
      expect(themeStore.getPreference()).toBe('dark');
    });
  });

  it('updates direction setting and synchronizes with direction preferences', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    const dirSelect = screen.getByTestId('settings-direction-select') as HTMLSelectElement;
    expect(dirSelect.value).toBe('auto');

    fireEvent.change(dirSelect, { target: { value: 'rtl' } });

    await waitFor(() => {
      expect(store.getSettings().defaultDirection).toBe('rtl');
      expect(getActiveDirectionPreference()).toBe('rtl');
    });
  });

  it('updates TOC position setting via segmented control', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    const rightBtn = screen.getByTestId('settings-toc-pos-right');
    fireEvent.click(rightBtn);

    await waitFor(() => {
      expect(store.getSettings().tocPosition).toBe('right');
    });

    const autoBtn = screen.getByTestId('settings-toc-pos-auto');
    fireEvent.click(autoBtn);

    await waitFor(() => {
      expect(store.getSettings().tocPosition).toBe('auto');
    });

    const leftBtn = screen.getByTestId('settings-toc-pos-left');
    fireEvent.click(leftBtn);

    await waitFor(() => {
      expect(store.getSettings().tocPosition).toBe('left');
    });
  });

  it('updates zoom setting and synchronizes with zoomController', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    const zoomSelect = screen.getByTestId('settings-zoom-select') as HTMLSelectElement;
    expect(zoomSelect.value).toBe('1');

    fireEvent.change(zoomSelect, { target: { value: '1.5' } });

    await waitFor(() => {
      expect(store.getSettings().defaultZoom).toBe(1.5);
      expect(zoomController.getZoom()).toBe(150);
    });
  });

  it('toggles restoreOpenTabs checkbox', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    const checkbox = screen.getByTestId('settings-restore-tabs-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(store.getSettings().restoreOpenTabs).toBe(false);
    });
  });

  it('updates maxRecentFiles setting', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    const recentSelect = screen.getByTestId('settings-max-recent-select') as HTMLSelectElement;
    expect(recentSelect.value).toBe('20');

    fireEvent.change(recentSelect, { target: { value: '10' } });

    await waitFor(() => {
      expect(store.getSettings().maxRecentFiles).toBe(10);
    });
  });

  it('shows clear confirmation when Reset to Defaults is clicked and cancels correctly', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    // Modify a setting first
    const themeSelect = screen.getByTestId('settings-theme-select') as HTMLSelectElement;
    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    await waitFor(() => {
      expect(store.getSettings().theme).toBe('dark');
    });

    // Click Reset
    const resetBtn = screen.getByTestId('settings-reset-btn');
    fireEvent.click(resetBtn);

    // Confirmation dialog appears
    const confirmBox = screen.getByTestId('settings-reset-confirm-box');
    expect(confirmBox).toBeDefined();
    expect(screen.getByTestId('settings-confirm-reset-btn')).toBeDefined();
    expect(screen.getByTestId('settings-cancel-reset-btn')).toBeDefined();

    // Click cancel
    const cancelBtn = screen.getByTestId('settings-cancel-reset-btn');
    fireEvent.click(cancelBtn);

    expect(screen.queryByTestId('settings-reset-confirm-box')).toBeNull();
    // Theme should still be dark
    expect(store.getSettings().theme).toBe('dark');
  });

  it('toggles showTableOfContents checkbox', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    const checkbox = screen.getByTestId('settings-show-toc-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(store.getSettings().showTableOfContents).toBe(false);
    });
  });

  it('resets preferences to canonical defaults on confirmation', async () => {
    render(<SettingsModal isOpen={true} onClose={vi.fn()} store={store} />);

    // Mutate multiple settings
    await act(async () => {
      await store.updateSettings({
        theme: 'dark',
        defaultDirection: 'rtl',
        defaultZoom: 1.5,
        restoreOpenTabs: false,
        maxRecentFiles: 50,
      });
    });

    // Click Reset to Defaults
    fireEvent.click(screen.getByTestId('settings-reset-btn'));

    // Click Confirm Reset
    const confirmBtn = screen.getByTestId('settings-confirm-reset-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      const current = store.getSettings();
      expect(current.theme).toBe('system');
      expect(current.defaultDirection).toBe('auto');
      expect(current.defaultZoom).toBe(1.0);
      expect(current.restoreOpenTabs).toBe(true);
      expect(current.maxRecentFiles).toBe(20);
      expect(themeStore.getPreference()).toBe('system');
      expect(zoomController.getZoom()).toBe(100);
    });
  });

  it('calls onClose when close button or done button is clicked', () => {
    const handleClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={handleClose} store={store} />);

    fireEvent.click(screen.getByTestId('settings-close-btn'));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('settings-done-btn'));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape key press', () => {
    const handleClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={handleClose} store={store} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on clicking the backdrop', () => {
    const handleClose = vi.fn();
    render(<SettingsModal isOpen={true} onClose={handleClose} store={store} />);

    const backdrop = screen.getByTestId('settings-modal-backdrop');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
