import React, { useEffect, useState } from 'react';
import { TabStore, tabStore as defaultStore } from '../tabs/tabStore';
import { useTabStore, useActiveTab, useTabActions } from '../tabs/useTabStore';
import { TabBar } from '../tabs/TabBar';
import { EmptyState, RecentFileItem } from './EmptyState';
import { DropZone } from './DropZone';
import { TabItem } from '../tabs/types';
import { RecentFilesMenu } from '../recents/RecentFilesMenu';
import { TabErrorBoundary } from '../errors';
import { useTheme } from '../viewport/themeStore';
import { Icon } from '../../components/Icon';
import './shell.css';

export interface AppShellProps {
  store?: TabStore;
  onOpenFile?: () => void;
  onPrint?: () => void;
  onOpenSettings?: () => void;
  onFileDrop?: (files: File[]) => void;
  onSelectRecentFile?: (filePath: string) => void;
  onRemoveRecentFile?: (filePath: string) => void;
  onClearRecentFiles?: () => void;
  recentFiles?: RecentFileItem[];
  renderDocument?: (activeTab: TabItem) => React.ReactNode;
  className?: string;
}

interface ActiveTabContentProps {
  tab: TabItem;
  renderDocument?: (activeTab: TabItem) => React.ReactNode;
}

const ActiveTabContent: React.FC<ActiveTabContentProps> = ({ tab, renderDocument }) => {
  if (renderDocument) {
    return <>{renderDocument(tab)}</>;
  }

  return (
    <div
      className="document-container"
      role="region"
      aria-label={`Document: ${tab.displayTitle}`}
      id={`tabpanel-${tab.id}`}
    >
      {tab.status === 'missing' && (
        <div className="document-error-notice" role="alert">
          <strong>Missing File:</strong> {tab.errorMessage || 'This file could not be found on disk.'}
        </div>
      )}
      {tab.status === 'error' && (
        <div className="document-error-notice" role="alert">
          <strong>Error:</strong> {tab.errorMessage || 'Failed to read document.'}
        </div>
      )}

      <div className="document-header">
        <h1 className="document-title">{tab.displayTitle}</h1>
        <div className="document-meta">
          <span>{tab.filePath}</span>
          {tab.fileSizeBytes !== undefined && (
            <span> • {(tab.fileSizeBytes / 1024).toFixed(1)} KB</span>
          )}
        </div>
      </div>

      <div className="document-body">
        <pre>{tab.content || 'Empty document'}</pre>
      </div>
    </div>
  );
};

export const AppShell: React.FC<AppShellProps> = ({
  store = defaultStore,
  onOpenFile,
  onPrint,
  onOpenSettings,
  onFileDrop,
  onSelectRecentFile,
  onRemoveRecentFile,
  onClearRecentFiles,
  recentFiles = [],
  renderDocument,
  className = '',
}) => {
  const state = useTabStore(store);
  const activeTab = useActiveTab(store);
  const actions = useTabActions(store);
  const { theme, toggleTheme } = useTheme();
  const [, setIsFocusMode] = useState(false);

  const exitFocusMode = () => {
    document.body.classList.remove('focus-mode');
    setIsFocusMode(false);
    window.dispatchEvent(new CustomEvent('focus-mode-change', { detail: false }));
  };

  useEffect(() => {
    const handleFocusChange = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      setIsFocusMode(custom.detail ?? document.body.classList.contains('focus-mode'));
    };
    window.addEventListener('focus-mode-change', handleFocusChange);
    return () => window.removeEventListener('focus-mode-change', handleFocusChange);
  }, []);

  // Global shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        onOpenFile?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        onPrint?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        onOpenSettings?.();
      } else if (e.key === 'Escape' && document.body.classList.contains('focus-mode')) {
        e.preventDefault();
        exitFocusMode();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [onOpenFile, onPrint, onOpenSettings]);

  const hasTabs = state.tabs.length > 0;

  return (
    <DropZone
      onFilesDropped={(files) => onFileDrop?.(files)}
      className={`app-shell-root app-window ${className}`.trim()}
      testId="app-shell-root"
    >
      {/* Floating Exit Button for Focus Mode */}
      <button
        type="button"
        className="focus-exit-btn"
        id="exitFocusBtn"
        title="Exit Focus Mode (Esc)"
        onClick={exitFocusMode}
        aria-label="Exit Focus Mode"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
        <span>Exit Focus</span>
        <kbd>Esc</kbd>
      </button>

      {/* Top Bar Header */}
      <header className="top-bar app-header app-chrome" role="banner">
        <div className="top-bar-left">
          <div
            className={`app-brand ${!hasTabs ? 'no-divider' : ''}`}
            id="appBrand"
            role="button"
            tabIndex={0}
            onClick={onOpenFile}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenFile?.();
              }
            }}
            title="Open a new Markdown file (Ctrl+O)"
            aria-label="Open a new Markdown file (Ctrl+O)"
          >
            <svg
              className="brand-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <span>Markdown Viewer</span>
          </div>

          {/* Render TabBar inside top-bar-left when tabs exist */}
          {hasTabs && (
            <TabBar
              tabs={state.tabs}
              activeTabId={state.activeTabId}
              onSelectTab={actions.switchTab}
              onCloseTab={actions.closeTab}
              onOpenFile={onOpenFile}
            />
          )}
        </div>

        <div className="top-bar-right header-actions">
          <button
            type="button"
            className="ghost-btn header-btn"
            id="topOpenBtn"
            onClick={onOpenFile}
            aria-label="Open document file (Ctrl+O)"
            title="Open document file (Ctrl+O)"
          >
            <Icon name="folder-open" size={14} />
            <span>Open</span>
          </button>

          <button
            type="button"
            className="ghost-btn header-btn theme-toggle-btn"
            id="topThemeBtn"
            onClick={toggleTheme}
            aria-label={`Theme: ${theme === 'system' ? 'Auto (System)' : theme === 'dark' ? 'Dark' : 'Light'}. Click to toggle.`}
            title={`Theme: ${theme === 'system' ? 'Auto (System)' : theme === 'dark' ? 'Dark' : 'Light'} (Click to toggle)`}
            data-testid="top-theme-toggle"
            data-theme-mode={theme}
          >
            <Icon name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'monitor'} size={14} />
            <span>{theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'Auto'}</span>
          </button>

          <RecentFilesMenu
            recentFiles={recentFiles}
            onSelectFile={onSelectRecentFile}
            onRemoveFile={onRemoveRecentFile}
            onClearFiles={onClearRecentFiles}
          />

          <button
            type="button"
            className="ghost-btn header-btn"
            id="openPrefsBtn"
            onClick={onOpenSettings}
            aria-label="Preferences and settings (Ctrl+,)"
            title="Preferences and settings (Ctrl+,)"
            data-testid="header-settings-btn"
          >
            <Icon name="settings" size={14} />
            <span>Preferences</span>
          </button>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="app-viewport main-stage" role="main">
        {!hasTabs || !activeTab ? (
          <EmptyState
            onOpenFile={onOpenFile}
            onFileDrop={onFileDrop}
            onSelectRecentFile={onSelectRecentFile}
            onRemoveRecentFile={onRemoveRecentFile}
            onClearRecentFiles={onClearRecentFiles}
            recentFiles={recentFiles}
          />
        ) : (
          <TabErrorBoundary
            tabId={activeTab.id}
            tabTitle={activeTab.displayTitle}
            onCloseTab={() => actions.closeTab(activeTab.id)}
          >
            <ActiveTabContent tab={activeTab} renderDocument={renderDocument} />
          </TabErrorBoundary>
        )}
      </main>

      {/* Status Bar */}
      <footer className="status-bar app-status-bar app-chrome" role="status">
        <div className="status-left">
          <span>{activeTab ? activeTab.filePath : 'Ready'}</span>
        </div>
        <div className="status-center">
          <span>
            {state.tabs.length === 0
              ? 'No document open'
              : `${state.tabs.length} tab${state.tabs.length > 1 ? 's' : ''} open`}
          </span>
        </div>
        <div className="status-right">
          <span>
            <span className={`status-dot ${!activeTab ? 'inactive' : ''}`} />
            {activeTab && activeTab.isReadOnly ? 'Read-Only' : 'Markdown'}
          </span>
        </div>
      </footer>
    </DropZone>
  );
};
