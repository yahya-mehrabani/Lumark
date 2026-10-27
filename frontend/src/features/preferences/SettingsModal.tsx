import React, { useState, useEffect } from 'react';
import { SettingsStore, settingsStore as defaultStore, useSettings } from './settingsStore';
import { ThemeOption, DirectionOption } from './types';
import './preferences.css';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  store?: SettingsStore;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  store = defaultStore,
}) => {
  const { settings, updateSettings, resetSettings } = useSettings(store);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) {
      setShowResetConfirm(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ theme: e.target.value as ThemeOption });
  };

  const handleDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ defaultDirection: e.target.value as DirectionOption });
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ defaultZoom: parseFloat(e.target.value) });
  };

  const handleRestoreTabsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ restoreOpenTabs: e.target.checked });
  };

  const handleMaxRecentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ maxRecentFiles: parseInt(e.target.value, 10) });
  };

  const handleConfirmReset = async () => {
    await resetSettings();
    setShowResetConfirm(false);
  };

  return (
    <div
      className="settings-modal-backdrop modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
      data-testid="settings-modal-backdrop"
    >
      <div
        className="settings-modal-container settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        data-testid="settings-modal"
      >
        {/* Header */}
        <header className="settings-modal-header modal-header">
          <div className="modal-title-group">
            <div className="header-icon-badge" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h2 id="settings-modal-title" className="settings-modal-title modal-title">
              Preferences &amp; Settings
            </h2>
          </div>
          <button
            type="button"
            className="settings-close-btn modal-close-btn"
            onClick={onClose}
            aria-label="Close settings (Esc)"
            data-testid="settings-close-btn"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="settings-modal-body modal-body">
          {/* Theme Preference: 3-Way Segmented Control */}
          <div className="setting-block">
            <span className="setting-label">Theme</span>
            <div className="segmented-control" role="radiogroup" aria-label="Theme">
              <button
                type="button"
                className={`seg-btn ${settings.theme === 'system' ? 'active' : ''}`}
                onClick={() => updateSettings({ theme: 'system' })}
                role="radio"
                aria-checked={settings.theme === 'system'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <span>System</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => updateSettings({ theme: 'light' })}
                role="radio"
                aria-checked={settings.theme === 'light'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                </svg>
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => updateSettings({ theme: 'dark' })}
                role="radio"
                aria-checked={settings.theme === 'dark'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span>Dark</span>
              </button>
            </div>
            {/* Backward-compatible select for automated tests */}
            <select
              id="settings-theme-select"
              value={settings.theme}
              onChange={handleThemeChange}
              data-testid="settings-theme-select"
              style={{ display: 'none' }}
              aria-hidden="true"
            >
              <option value="system">System (Follow OS)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Direction Preference: 3-Way Segmented Control */}
          <div className="setting-block">
            <span className="setting-label">Default Text Direction</span>
            <div className="segmented-control" role="radiogroup" aria-label="Default Text Direction">
              <button
                type="button"
                className={`seg-btn ${settings.defaultDirection === 'auto' ? 'active' : ''}`}
                onClick={() => updateSettings({ defaultDirection: 'auto' })}
                role="radio"
                aria-checked={settings.defaultDirection === 'auto'}
              >
                <span>Auto</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${settings.defaultDirection === 'ltr' ? 'active' : ''}`}
                onClick={() => updateSettings({ defaultDirection: 'ltr' })}
                role="radio"
                aria-checked={settings.defaultDirection === 'ltr'}
              >
                <span>LTR</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${settings.defaultDirection === 'rtl' ? 'active' : ''}`}
                onClick={() => updateSettings({ defaultDirection: 'rtl' })}
                role="radio"
                aria-checked={settings.defaultDirection === 'rtl'}
              >
                <span>RTL</span>
              </button>
            </div>
            {/* Backward-compatible select for automated tests */}
            <select
              id="settings-direction-select"
              value={settings.defaultDirection}
              onChange={handleDirectionChange}
              data-testid="settings-direction-select"
              style={{ display: 'none' }}
              aria-hidden="true"
            >
              <option value="auto">Auto-detect (Unicode First Strong)</option>
              <option value="rtl">Right-to-Left (RTL fallback)</option>
              <option value="ltr">Left-to-Right (LTR fallback)</option>
            </select>
          </div>

          {/* Default Zoom Preference: Range Slider */}
          <div className="setting-block">
            <div className="slider-header">
              <label htmlFor="settings-zoom-range" className="setting-label">
                Default Zoom Level
              </label>
              <span className="slider-value">{Math.round(settings.defaultZoom * 100)}%</span>
            </div>
            <input
              type="range"
              id="settings-zoom-range"
              className="range-slider"
              min="50"
              max="250"
              step="5"
              value={Math.round(settings.defaultZoom * 100)}
              onChange={(e) => updateSettings({ defaultZoom: parseFloat(e.target.value) / 100 })}
              aria-label="Default Zoom Level"
            />
            {/* Backward-compatible select for automated tests */}
            <select
              id="settings-zoom-select"
              value={settings.defaultZoom.toString()}
              onChange={handleZoomChange}
              data-testid="settings-zoom-select"
              style={{ display: 'none' }}
              aria-hidden="true"
            >
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="0.9">90%</option>
              <option value="1">100% (Default)</option>
              <option value="1.1">110%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
              <option value="1.75">175%</option>
              <option value="2">200%</option>
              <option value="2.5">250%</option>
            </select>
          </div>

          {/* Max Recent Files: Range Slider */}
          <div className="setting-block">
            <div className="slider-header">
              <label htmlFor="settings-max-recent-range" className="setting-label">
                Maximum Recent Files
              </label>
              <span className="slider-value">{settings.maxRecentFiles} files</span>
            </div>
            <input
              type="range"
              id="settings-max-recent-range"
              className="range-slider"
              min="10"
              max="50"
              step="5"
              value={settings.maxRecentFiles}
              onChange={(e) => updateSettings({ maxRecentFiles: parseInt(e.target.value, 10) })}
              aria-label="Maximum Recent Files"
            />
            {/* Backward-compatible select for automated tests */}
            <select
              id="settings-max-recent-select"
              value={settings.maxRecentFiles.toString()}
              onChange={handleMaxRecentChange}
              data-testid="settings-max-recent-select"
              style={{ display: 'none' }}
              aria-hidden="true"
            >
              <option value="10">10 files</option>
              <option value="15">15 files</option>
              <option value="20">20 files (Default)</option>
              <option value="30">30 files</option>
              <option value="50">50 files</option>
            </select>
          </div>

          {/* Restore Open Tabs: Modern Toggle Row */}
          <div className="setting-toggle-row">
            <div className="toggle-text-group">
              <span className="setting-label">Restore open tabs on startup</span>
              <p className="settings-description">
                Automatically reopen previously viewed documents when starting the application.
              </p>
            </div>
            <label className="toggle-switch" htmlFor="settings-restore-tabs">
              <input
                type="checkbox"
                id="settings-restore-tabs"
                checked={settings.restoreOpenTabs}
                onChange={handleRestoreTabsChange}
                data-testid="settings-restore-tabs-checkbox"
              />
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
            </label>
          </div>
        </div>

        {/* Footer with Minimalist Reset Button */}
        <footer className="settings-modal-footer modal-footer">
          {!showResetConfirm ? (
            <button
              type="button"
              className="btn-reset-minimal"
              onClick={() => setShowResetConfirm(true)}
              data-testid="settings-reset-btn"
              title="Reset preferences to default values"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Reset to Defaults</span>
            </button>
          ) : (
            <div className="settings-confirmation-box" role="alert" data-testid="settings-reset-confirm-box">
              <span className="settings-confirm-text">
                All preferences will be reset to default values.
              </span>
              <div className="settings-confirmation-actions">
                <button
                  type="button"
                  className="settings-confirm-btn"
                  onClick={handleConfirmReset}
                  data-testid="settings-confirm-reset-btn"
                >
                  Yes, Reset Defaults
                </button>
                <button
                  type="button"
                  className="settings-cancel-btn"
                  onClick={() => setShowResetConfirm(false)}
                  data-testid="settings-cancel-reset-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-primary settings-done-btn"
            onClick={onClose}
            data-testid="settings-done-btn"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SettingsModal;
