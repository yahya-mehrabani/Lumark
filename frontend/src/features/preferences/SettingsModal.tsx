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
      className="settings-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
      data-testid="settings-modal-backdrop"
    >
      <div
        className="settings-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        data-testid="settings-modal"
      >
        {/* Header */}
        <header className="settings-modal-header">
          <h2 id="settings-modal-title" className="settings-modal-title">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Preferences & Settings
          </h2>
          <button
            type="button"
            className="settings-close-btn"
            onClick={onClose}
            aria-label="Close settings (Esc)"
            data-testid="settings-close-btn"
          >
            <svg
              width="18"
              height="18"
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
        <div className="settings-modal-body">
          {/* Theme Preference (FR-SET-001) */}
          <div className="settings-field-group">
            <label htmlFor="settings-theme-select" className="settings-label">
              Theme
            </label>
            <p className="settings-description">
              Select visual interface appearance or follow operating system dark mode.
            </p>
            <select
              id="settings-theme-select"
              className="settings-select"
              value={settings.theme}
              onChange={handleThemeChange}
              data-testid="settings-theme-select"
            >
              <option value="system">System (Follow OS)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Direction Preference (FR-SET-001, FR-DIR-004) */}
          <div className="settings-field-group">
            <label htmlFor="settings-direction-select" className="settings-label">
              Default Text Direction
            </label>
            <p className="settings-description">
              Direction for un-annotated paragraphs and neutral blocks.
            </p>
            <select
              id="settings-direction-select"
              className="settings-select"
              value={settings.defaultDirection}
              onChange={handleDirectionChange}
              data-testid="settings-direction-select"
            >
              <option value="auto">Auto-detect (Unicode First Strong)</option>
              <option value="rtl">Right-to-Left (RTL fallback)</option>
              <option value="ltr">Left-to-Right (LTR fallback)</option>
            </select>
          </div>

          {/* Default Zoom Preference (FR-SET-001, FR-NAV-004) */}
          <div className="settings-field-group">
            <label htmlFor="settings-zoom-select" className="settings-label">
              Default Zoom Level
            </label>
            <p className="settings-description">
              Initial document magnification level (100% is standard).
            </p>
            <select
              id="settings-zoom-select"
              className="settings-select"
              value={settings.defaultZoom.toString()}
              onChange={handleZoomChange}
              data-testid="settings-zoom-select"
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

          {/* Restore Open Tabs (FR-SET-001) */}
          <div className="settings-field-group">
            <label className="settings-checkbox-row">
              <input
                type="checkbox"
                id="settings-restore-tabs"
                className="settings-checkbox"
                checked={settings.restoreOpenTabs}
                onChange={handleRestoreTabsChange}
                data-testid="settings-restore-tabs-checkbox"
              />
              <span className="settings-checkbox-label">
                <span className="settings-label">Restore open tabs on startup</span>
                <span className="settings-description">
                  Automatically reopen previously viewed documents when starting the application.
                </span>
              </span>
            </label>
          </div>

          {/* Max Recent Files (FR-SET-001, FR-OPEN-006) */}
          <div className="settings-field-group">
            <label htmlFor="settings-max-recent-select" className="settings-label">
              Maximum Recent Files
            </label>
            <p className="settings-description">
              Number of recent documents remembered on the empty start screen (default 20).
            </p>
            <select
              id="settings-max-recent-select"
              className="settings-select"
              value={settings.maxRecentFiles}
              onChange={handleMaxRecentChange}
              data-testid="settings-max-recent-select"
            >
              <option value="10">10 files</option>
              <option value="15">15 files</option>
              <option value="20">20 files (Default)</option>
              <option value="30">30 files</option>
              <option value="50">50 files</option>
            </select>
          </div>

          {/* Reset Settings Section (FR-SET-004) */}
          <div className="settings-reset-section">
            <span className="settings-reset-header">Reset Preferences</span>
            <p className="settings-reset-notice">
              Restore all application preferences to defaults. This resets your interface settings only and will never delete, modify, or move any of your document files.
            </p>

            {!showResetConfirm ? (
              <button
                type="button"
                className="settings-reset-btn"
                onClick={() => setShowResetConfirm(true)}
                data-testid="settings-reset-btn"
              >
                Reset to Defaults...
              </button>
            ) : (
              <div className="settings-confirmation-box" role="alert" data-testid="settings-reset-confirm-box">
                <span className="settings-label">
                  Are you sure? All preferences will be reset to default values.
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
          </div>
        </div>

        {/* Footer */}
        <footer className="settings-modal-footer">
          <button
            type="button"
            className="settings-done-btn"
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
