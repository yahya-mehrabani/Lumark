import React, { useState, useEffect } from 'react';
import { SettingsStore, settingsStore as defaultStore, useSettings } from './settingsStore';
import { ThemeOption, DirectionOption } from './types';
import { Icon } from '../../components/Icon';
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

  const handleTocPositionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ tocPosition: e.target.value as 'left' | 'right' | 'auto' });
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ defaultZoom: parseFloat(e.target.value) });
  };

  const handleRestoreTabsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ restoreOpenTabs: e.target.checked });
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
              <Icon name="settings" size={16} />
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
            <Icon name="close" size={16} />
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
                <Icon name="monitor" size={15} />
                <span>System</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => updateSettings({ theme: 'light' })}
                role="radio"
                aria-checked={settings.theme === 'light'}
              >
                <Icon name="sun" size={15} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => updateSettings({ theme: 'dark' })}
                role="radio"
                aria-checked={settings.theme === 'dark'}
              >
                <Icon name="moon" size={15} />
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
                className={`seg-btn ${settings.defaultDirection === 'ltr' ? 'active' : ''}`}
                onClick={() => updateSettings({ defaultDirection: 'ltr' })}
                role="radio"
                aria-checked={settings.defaultDirection === 'ltr'}
              >
                <span>LTR</span>
              </button>
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

          {/* TOC Position: 3-Way Segmented Control */}
          <div className="setting-block">
            <span className="setting-label">Table of Content Position</span>
            <div className="segmented-control" role="radiogroup" aria-label="Table of Content Position">
              <button
                type="button"
                className={`seg-btn ${settings.tocPosition === 'left' ? 'active' : ''}`}
                onClick={() => updateSettings({ tocPosition: 'left' })}
                role="radio"
                aria-checked={settings.tocPosition === 'left'}
                data-testid="settings-toc-pos-left"
              >
                <span>Left</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${settings.tocPosition === 'auto' ? 'active' : ''}`}
                onClick={() => updateSettings({ tocPosition: 'auto' })}
                role="radio"
                aria-checked={settings.tocPosition === 'auto'}
                data-testid="settings-toc-pos-auto"
              >
                <span>Auto</span>
              </button>
              <button
                type="button"
                className={`seg-btn ${settings.tocPosition === 'right' ? 'active' : ''}`}
                onClick={() => updateSettings({ tocPosition: 'right' })}
                role="radio"
                aria-checked={settings.tocPosition === 'right'}
                data-testid="settings-toc-pos-right"
              >
                <span>Right</span>
              </button>
            </div>
            {/* Backward-compatible select for automated tests */}
            <select
              id="settings-toc-position-select"
              value={settings.tocPosition}
              onChange={handleTocPositionChange}
              data-testid="settings-toc-position-select"
              style={{ display: 'none' }}
              aria-hidden="true"
            >
              <option value="left">Left (Default)</option>
              <option value="right">Right</option>
              <option value="auto">Auto (LTR: Left, RTL: Right)</option>
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

          {/* Minimalist Combined Toggles Card */}
          <div className="setting-toggles-card" data-testid="settings-toggles-card">
            <div className="setting-toggle-row">
              <span className="setting-label">Show Table of Contents</span>
              <label className="toggle-switch" htmlFor="settings-show-toc">
                <input
                  type="checkbox"
                  id="settings-show-toc"
                  checked={settings.showTableOfContents ?? settings.showToc ?? true}
                  onChange={(e) =>
                    updateSettings({
                      showTableOfContents: e.target.checked,
                      showToc: e.target.checked,
                    })
                  }
                  data-testid="settings-show-toc-checkbox"
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>

            <div className="setting-toggle-divider" />

            <div className="setting-toggle-row">
              <span className="setting-label">Restore open tabs on startup</span>
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
        </div>

        {/* Footer with Minimalist Reset Button */}
        <footer className="settings-modal-footer modal-footer">
          <div className="modal-footer-left">
            {!showResetConfirm ? (
              <button
                type="button"
                className="btn-reset-minimal"
                onClick={() => setShowResetConfirm(true)}
                data-testid="settings-reset-btn"
                title="Reset preferences to default values"
              >
                <Icon name="reset" size={14} />
                <span>Reset to Defaults</span>
              </button>
            ) : (
              <div className="settings-confirmation-group" role="alert" data-testid="settings-reset-confirm-box">
                <Icon name="alert" size={14} className="reset-alert-icon" />
                <span className="reset-prompt-label">Reset?</span>
                <button
                  type="button"
                  className="settings-confirm-btn"
                  onClick={handleConfirmReset}
                  data-testid="settings-confirm-reset-btn"
                >
                  Yes
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
            )}
          </div>

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
