import React, { useEffect } from 'react';
import { TabStore, tabStore as defaultStore } from '../tabs/tabStore';
import { useTabStore, useActiveTab, useTabActions } from '../tabs/useTabStore';
import { TabBar } from '../tabs/TabBar';
import { EmptyState, RecentFileItem } from './EmptyState';
import { DropZone } from './DropZone';
import { TabItem } from '../tabs/types';
import './shell.css';

export interface AppShellProps {
  store?: TabStore;
  onOpenFile?: () => void;
  onPrint?: () => void;
  onFileDrop?: (files: File[]) => void;
  onSelectRecentFile?: (filePath: string) => void;
  recentFiles?: RecentFileItem[];
  renderDocument?: (activeTab: TabItem) => React.ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  store = defaultStore,
  onOpenFile,
  onPrint,
  onFileDrop,
  onSelectRecentFile,
  recentFiles = [],
  renderDocument,
  className = '',
}) => {
  const state = useTabStore(store);
  const activeTab = useActiveTab(store);
  const actions = useTabActions(store);

  // Global Ctrl+O shortcut to open file, Ctrl+P to print
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        onOpenFile?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        onPrint?.();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [onOpenFile, onPrint]);

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
            recentFiles={recentFiles}
          />
        ) : renderDocument ? (
          renderDocument(activeTab)
        ) : (
          <div
            className="document-container"
            role="region"
            aria-label={`Document: ${activeTab.displayTitle}`}
            id={`tabpanel-${activeTab.id}`}
          >
            {activeTab.status === 'missing' && (
              <div className="document-error-notice" role="alert">
                <strong>Missing File:</strong> {activeTab.errorMessage || 'This file could not be found on disk.'}
              </div>
            )}
            {activeTab.status === 'error' && (
              <div className="document-error-notice" role="alert">
                <strong>Error:</strong> {activeTab.errorMessage || 'Failed to read document.'}
              </div>
            )}

            <div className="document-header">
              <h1 className="document-title">{activeTab.displayTitle}</h1>
              <div className="document-meta">
                <span>{activeTab.filePath}</span>
                {activeTab.fileSizeBytes !== undefined && (
                  <span> • {(activeTab.fileSizeBytes / 1024).toFixed(1)} KB</span>
                )}
              </div>
            </div>

            <div className="document-body">
              <pre>{activeTab.content || 'Empty document'}</pre>
            </div>
          </div>
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
