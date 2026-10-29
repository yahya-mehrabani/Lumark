import React, { useEffect, useRef, useState } from 'react';
import { TabItem as TabItemData } from './types';
import { TabItem } from './TabItem';
import { Icon } from '../../components/Icon';
import './tabs.css';

export interface TabBarProps {
  tabs: TabItemData[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onOpenFile?: () => void;
  maxVisibleTabs?: number;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseAllTabs,
  onCloseOtherTabs,
  onOpenFile,
  maxVisibleTabs,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => {
      if (el) setContainerWidth(el.clientWidth);
    };

    handleResize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(handleResize);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  // Compute visible tabs vs hidden overflow tabs
  const { visibleTabs, hiddenTabs } = React.useMemo(() => {
    if (tabs.length === 0) {
      return { visibleTabs: [], hiddenTabs: [] };
    }

    let limit = tabs.length;
    if (typeof maxVisibleTabs === 'number' && maxVisibleTabs > 0) {
      limit = Math.min(tabs.length, maxVisibleTabs);
    } else if (containerWidth > 0) {
      // Allow ~150px per tab + 90px reserved for '+' and '+X more' pill
      const computed = Math.floor((containerWidth - 90) / 150);
      if (computed < tabs.length && computed > 0) {
        limit = computed;
      }
    }

    if (limit >= tabs.length) {
      return { visibleTabs: tabs, hiddenTabs: [] };
    }

    // Keep active tab visible in the tab strip
    let visible = tabs.slice(0, limit);
    const hasActive = visible.some((t) => t.id === activeTabId);
    if (activeTabId && !hasActive) {
      const active = tabs.find((t) => t.id === activeTabId);
      if (active) {
        visible = [...tabs.slice(0, Math.max(1, limit - 1)), active];
      }
    }

    const hidden = tabs.filter((t) => !visible.some((v) => v.id === t.id));
    return { visibleTabs: visible, hiddenTabs: hidden };
  }, [tabs, activeTabId, maxVisibleTabs, containerWidth]);

  const selectAndFocusTab = (tabId: string) => {
    onSelectTab(tabId);
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(`#tab-${tabId}`);
      el?.focus();
    });
  };

  // Close overflow menu on outside click or Escape
  useEffect(() => {
    if (!isOverflowOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOverflowOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOverflowOpen]);

  // Context menu dismissal on click outside or Escape
  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu]);

  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, typeof window !== 'undefined' ? window.innerWidth - 160 : e.clientX);
    const y = Math.min(e.clientY, typeof window !== 'undefined' ? window.innerHeight - 120 : e.clientY);
    setContextMenu({ x, y, tabId });
  };

  const handleCloseThisTab = () => {
    if (!contextMenu) return;
    onCloseTab(contextMenu.tabId);
    setContextMenu(null);
  };

  const handleCloseOtherTabs = () => {
    if (!contextMenu) return;
    if (onCloseOtherTabs) {
      onCloseOtherTabs(contextMenu.tabId);
    } else {
      tabs.filter((t) => t.id !== contextMenu.tabId).forEach((t) => onCloseTab(t.id));
    }
    setContextMenu(null);
  };

  const handleCloseAllTabs = () => {
    if (!contextMenu) return;
    if (onCloseAllTabs) {
      onCloseAllTabs();
    } else {
      tabs.forEach((t) => onCloseTab(t.id));
    }
    setContextMenu(null);
  };

  // Keyboard navigation across tablist (Left/Right/Home/End) and global Ctrl/Cmd+W
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((t) => t.id === activeTabId);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      selectAndFocusTab(tabs[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      selectAndFocusTab(tabs[prevIndex].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectAndFocusTab(tabs[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectAndFocusTab(tabs[tabs.length - 1].id);
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      if (activeTabId) {
        onCloseTab(activeTabId);
      }
    }
  };

  // Listen to window-level Ctrl/Cmd+W shortcut to close active tab
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
        if (activeTabId) {
          e.preventDefault();
          onCloseTab(activeTabId);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeTabId, onCloseTab]);

  // Support horizontal mousewheel scrolling on the tab bar
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && e.deltaX === 0) {
        if (el.scrollWidth > el.clientWidth) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Ensure active tab is automatically scrolled into view when selected
  useEffect(() => {
    if (!activeTabId || !containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLElement>(`#tab-${activeTabId}`);
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({
        inline: 'nearest',
        block: 'nearest',
      });
    }
  }, [activeTabId]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className={`tab-bar-wrapper app-chrome ${className}`.trim()}>
      <div
        ref={containerRef}
        className="tab-bar-container"
        role="region"
        aria-label="Document tabs"
      >
        <div
          className="tab-list tabs-list"
          role="tablist"
          aria-orientation="horizontal"
          onKeyDown={handleKeyDown}
        >
          {visibleTabs.map((tab, index) => {
            const isActive = tab.id === activeTabId;
            const prevTab = index > 0 ? visibleTabs[index - 1] : null;
            const isPrevActive = prevTab ? prevTab.id === activeTabId : false;
            const showDivider = index > 0 && !isActive && !isPrevActive;

            return (
              <React.Fragment key={tab.id}>
                {showDivider && <div className="tab-separator" aria-hidden="true" />}
                <TabItem
                  tab={tab}
                  isActive={isActive}
                  onSelect={onSelectTab}
                  onClose={onCloseTab}
                  onContextMenu={handleTabContextMenu}
                />
              </React.Fragment>
            );
          })}

          {/* +X more pill for overflow tabs */}
          {hiddenTabs.length > 0 && (
            <div className="tab-overflow-container" ref={overflowRef}>
              <button
                type="button"
                className={`tab-overflow-pill-btn ${isOverflowOpen ? 'active' : ''}`}
                id="tabOverflowBtn"
                onClick={() => setIsOverflowOpen((prev) => !prev)}
                aria-label={`+${hiddenTabs.length} more tabs`}
                title={`${hiddenTabs.length} more tabs`}
                aria-haspopup="true"
                aria-expanded={isOverflowOpen}
                data-testid="tab-overflow-pill"
              >
                +{hiddenTabs.length} more
              </button>

              {isOverflowOpen && (
                <div
                  className="tab-overflow-menu"
                  id="tabOverflowMenu"
                  role="menu"
                  data-testid="tab-overflow-menu"
                >
                  <div className="overflow-menu-header">Hidden Tabs ({hiddenTabs.length})</div>
                  {hiddenTabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                      <div
                        key={tab.id}
                        className={`overflow-tab-item ${isActive ? 'active' : ''}`}
                        role="menuitem"
                        onClick={() => {
                          onSelectTab(tab.id);
                          setIsOverflowOpen(false);
                        }}
                        data-testid={`overflow-item-${tab.id}`}
                      >
                        <span className="overflow-tab-title">{tab.filename || tab.displayTitle}</span>
                        {tab.status !== 'ready' && (
                          <span className={`tab-status-badge badge-${tab.status}`}>
                            {tab.status === 'missing' ? 'Missing' : 'Error'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="tab-icon-btn tab-add-btn"
            id="addTabBtn"
            onClick={onOpenFile}
            title="Open File (Ctrl+O)"
            aria-label="Open File"
            data-testid="tab-add-btn"
          >
            <Icon name="plus" size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Custom Right-Click Context Menu for Tabs */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="tab-context-menu"
          data-testid="tab-context-menu"
          role="menu"
          aria-label="Tab actions"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <button
            type="button"
            className="context-menu-item"
            data-testid="tab-menu-close"
            role="menuitem"
            onClick={handleCloseThisTab}
          >
            <Icon name="close" size={13} strokeWidth={2.2} />
            <span>Close</span>
          </button>
          <button
            type="button"
            className="context-menu-item"
            data-testid="tab-menu-close-others"
            role="menuitem"
            onClick={handleCloseOtherTabs}
          >
            <span>Close Others</span>
          </button>
          <div className="context-menu-divider" />
          <button
            type="button"
            className="context-menu-item"
            data-testid="tab-menu-close-all"
            role="menuitem"
            onClick={handleCloseAllTabs}
          >
            <span>Close All</span>
          </button>
        </div>
      )}
    </div>
  );
};
