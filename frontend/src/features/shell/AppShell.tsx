import React, { useEffect, useState, useRef } from 'react';
import { Window } from '@wailsio/runtime';
import { TabStore, tabStore as defaultStore } from '../tabs/tabStore';
import { useTabStore, useActiveTab, useTabActions } from '../tabs/useTabStore';
import { TabBar } from '../tabs/TabBar';
import { EmptyState, RecentFileItem } from './EmptyState';
import { DropZone } from './DropZone';
import { TabItem } from '../tabs/types';
import { TabErrorBoundary } from '../errors';
import { useTheme } from '../viewport/themeStore';
import { Icon } from '../../components/Icon';
import './shell.css';

export interface AppShellProps {
  store?: TabStore;
  onOpenFile?: () => void;
  onPrint?: () => void;
  onOpenSettings?: () => void;
  onNavigateHome?: () => void;
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
  onNavigateHome,
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
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [, setIsFocusMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecentsSubmenuOpen, setIsRecentsSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleNavigateHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      actions.switchTab(null);
    }
  };

  const handleToggleSearch = () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })
    );
  };

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

  // Close 3-dot dropdown menu on outside click or Escape
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsRecentsSubmenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsRecentsSubmenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Global shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleNavigateHome();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        setIsMenuOpen(true);
        setIsRecentsSubmenuOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
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
  }, [onOpenFile, onPrint, onOpenSettings, onNavigateHome]);

  const hasTabs = state.tabs.length > 0;

  const handleMinimizeWindow = () => {
    try {
      Window.Minimise?.();
    } catch (err) {
      console.warn('Failed to minimize window:', err);
    }
  };

  const handleMaximizeWindow = () => {
    try {
      Window.ToggleMaximise?.();
    } catch (err) {
      console.warn('Failed to toggle maximize window:', err);
    }
  };

  const handleCloseWindow = () => {
    try {
      Window.Close?.();
    } catch (err) {
      console.warn('Failed to close window:', err);
    }
  };

  const readingTime = React.useMemo(() => {
    if (!activeTab || !activeTab.content) return '';
    const words = activeTab.content.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return '';
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  }, [activeTab]);

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
          <button
            type="button"
            className="app-brand-btn"
            id="appBrand"
            onClick={handleNavigateHome}
            aria-label="Home"
            title="Home (Ctrl+Shift+H)"
            data-testid="app-brand-btn"
          >
            <div className="brand-badge">
              <Icon name="book-open" size={15} strokeWidth={2.2} />
            </div>
          </button>

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
            className="ghost-btn header-btn header-icon-btn"
            id="topSearchBtn"
            onClick={handleToggleSearch}
            aria-label="Find in Document (Ctrl+F)"
            title="Find in Document (Ctrl+F)"
            data-testid="header-search-btn"
          >
            <Icon name="search" size={15} strokeWidth={1.9} />
          </button>

          <button
            type="button"
            className="ghost-btn header-btn header-icon-btn theme-toggle-btn"
            id="topThemeBtn"
            onClick={toggleTheme}
            aria-label={`Theme: ${theme === 'system' ? `Auto (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})` : resolvedTheme === 'dark' ? 'Dark' : 'Light'}. Click to toggle.`}
            title={`Theme: ${theme === 'system' ? `Auto (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})` : resolvedTheme === 'dark' ? 'Dark' : 'Light'} (Click to toggle)`}
            data-testid="top-theme-toggle"
            data-theme-mode={theme}
            data-resolved-theme={resolvedTheme}
          >
            <Icon name={resolvedTheme === 'dark' ? 'moon' : 'sun'} size={15} />
          </button>

          <div className="header-menu-container" ref={menuRef}>
            <button
              type="button"
              className={`ghost-btn header-btn header-icon-btn ${isMenuOpen ? 'active' : ''}`}
              id="topMenuBtn"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="More actions"
              title="More actions"
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              data-testid="header-menu-btn"
            >
              <Icon name="more-horizontal" size={16} strokeWidth={2} />
            </button>

            {isMenuOpen && (
              <div
                className="header-dropdown-menu"
                role="menu"
                aria-label="Application menu"
                data-testid="header-dropdown-menu"
              >
                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenFile?.();
                  }}
                  data-testid="menu-item-open"
                >
                  <div className="menu-item-left">
                    <Icon name="folder-open" size={14} />
                    <span>Open File</span>
                  </div>
                  <span className="menu-shortcut">Ctrl O</span>
                </button>

                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleNavigateHome();
                  }}
                  data-testid="menu-item-home"
                >
                  <div className="menu-item-left">
                    <Icon name="home" size={14} />
                    <span>Home</span>
                  </div>
                  <span className="menu-shortcut">Ctrl ⇧ H</span>
                </button>

                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleToggleSearch();
                  }}
                  data-testid="menu-item-find"
                >
                  <div className="menu-item-left">
                    <Icon name="search" size={14} />
                    <span>Find</span>
                  </div>
                  <span className="menu-shortcut">Ctrl F</span>
                </button>

                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onPrint?.();
                  }}
                  data-testid="menu-item-print"
                >
                  <div className="menu-item-left">
                    <Icon name="printer" size={14} />
                    <span>Print</span>
                  </div>
                  <span className="menu-shortcut">Ctrl P</span>
                </button>

                <div className="menu-divider" role="separator" />

                <div
                  className="menu-item-wrapper"
                  onMouseEnter={() => setIsRecentsSubmenuOpen(true)}
                  onMouseLeave={() => setIsRecentsSubmenuOpen(false)}
                >
                  <button
                    type="button"
                    className={`menu-item ${isRecentsSubmenuOpen ? 'active' : ''}`}
                    role="menuitem"
                    aria-haspopup="true"
                    aria-expanded={isRecentsSubmenuOpen}
                    onClick={() => setIsRecentsSubmenuOpen((prev) => !prev)}
                    data-testid="menu-item-recents"
                  >
                    <div className="menu-item-left">
                      <Icon name="clock" size={14} />
                      <span>Recent Files</span>
                    </div>
                    <span className="menu-shortcut">Ctrl ⇧ O</span>
                  </button>

                  {isRecentsSubmenuOpen && (
                    <div
                      className="menu-submenu recents-submenu"
                      role="menu"
                      data-testid="recents-submenu"
                    >
                      <div className="submenu-header">
                        <span>Recent Files</span>
                        {recentFiles.length > 0 && (
                          <button
                            type="button"
                            className="submenu-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearRecentFiles?.();
                            }}
                            data-testid="submenu-clear-recents"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {recentFiles.length === 0 ? (
                        <div className="submenu-empty">No recent documents</div>
                      ) : (
                        <div className="submenu-list">
                          {recentFiles.map((file) => (
                            <button
                              key={file.filePath}
                              type="button"
                              className="submenu-item"
                              role="menuitem"
                              onClick={() => {
                                setIsMenuOpen(false);
                                setIsRecentsSubmenuOpen(false);
                                onSelectRecentFile?.(file.filePath);
                              }}
                              data-testid={`menu-recent-${file.filename}`}
                              title={file.filePath}
                            >
                              <div className="submenu-item-text">
                                <span className="submenu-item-title">{file.filename}</span>
                                <span className="submenu-item-sub">{file.filePath}</span>
                              </div>
                              {file.exists === false && (
                                <span className="submenu-badge-missing">Missing</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="menu-item"
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings?.();
                  }}
                  data-testid="menu-item-preferences"
                >
                  <div className="menu-item-left">
                    <Icon name="settings" size={14} />
                    <span>Preferences</span>
                  </div>
                  <span className="menu-shortcut">Ctrl ,</span>
                </button>
              </div>
            )}
          </div>

          <div className="window-controls-divider" aria-hidden="true" />

          <div
            className="window-controls"
            data-testid="window-controls"
            role="group"
            aria-label="Window Controls"
          >
            <button
              type="button"
              className="window-control-btn window-minimize-btn"
              id="windowMinimizeBtn"
              onClick={handleMinimizeWindow}
              aria-label="Minimize Window"
              title="Minimize Window"
              data-testid="window-minimize-btn"
            >
              <Icon name="minus" size={13} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              className="window-control-btn window-maximize-btn"
              id="windowMaximizeBtn"
              onClick={handleMaximizeWindow}
              aria-label="Maximize / Restore Window"
              title="Maximize / Restore Window"
              data-testid="window-maximize-btn"
            >
              <Icon name="maximize" size={12} strokeWidth={2} />
            </button>

            <button
              type="button"
              className="window-control-btn window-close-btn"
              id="windowCloseBtn"
              onClick={handleCloseWindow}
              aria-label="Close Window"
              title="Close Window"
              data-testid="window-close-btn"
            >
              <Icon name="close" size={13} strokeWidth={2.2} />
            </button>
          </div>
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
        <div className="status-center" />
        <div className="status-right">
          {readingTime && <span>{readingTime}</span>}
        </div>
      </footer>
    </DropZone>
  );
};
