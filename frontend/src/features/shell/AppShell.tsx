import React, { useEffect } from 'react';
import { TabStore, tabStore as defaultStore } from '../tabs/tabStore';
import { useTabStore, useActiveTab, useTabActions } from '../tabs/useTabStore';
import { TabBar } from '../tabs/TabBar';
import { EmptyState, RecentFileItem } from './EmptyState';
import { DropZone } from './DropZone';
import { TabItem } from '../tabs/types';
import { RecentFilesMenu } from '../recents/RecentFilesMenu';
import { TabErrorBoundary } from '../errors';
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

  // Global Ctrl+O shortcut to open file, Ctrl+P to print, Ctrl+, for settings
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
      className={`app-shell-root ${className}`}
      testId="app-shell-root"
    >
      {/* Top Header / Menu Bar Chrome */}
      <header className="app-header app-chrome" role="banner">
        <div className="app-brand">
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
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>Markdown Viewer</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="header-btn"
            onClick={onOpenFile}
            aria-label="Open document file (Ctrl+O)"
            title="Open document file (Ctrl+O)"
          >
            Open File
          </button>
          <RecentFilesMenu
            recentFiles={recentFiles}
            onSelectFile={onSelectRecentFile}
            onRemoveFile={onRemoveRecentFile}
            onClearFiles={onClearRecentFiles}
          />
          <button
            type="button"
            className="header-btn"
            onClick={onPrint}
            aria-label="Print document (Ctrl+P)"
            title="Print document (Ctrl+P)"
            data-testid="header-print-btn"
          >
            Print
          </button>
          <button
            type="button"
            className="header-btn"
            onClick={onOpenSettings}
            aria-label="Preferences and settings (Ctrl+,)"
            title="Preferences and settings (Ctrl+,)"
            data-testid="header-settings-btn"
          >
            Preferences
          </button>
        </div>
      </header>

      {/* Tab Strip */}
      <TabBar
        tabs={state.tabs}
        activeTabId={state.activeTabId}
        onSelectTab={actions.switchTab}
        onCloseTab={actions.closeTab}
      />

      {/* Main Viewport Container */}
      <main className="app-viewport" role="main">
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
      <footer className="app-status-bar app-chrome" role="status">
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
          <span>{activeTab && activeTab.isReadOnly ? 'Read-Only' : 'Markdown'}</span>
        </div>
      </footer>
    </DropZone>
  );
};
