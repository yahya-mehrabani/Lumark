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
  onOpenFile?: () => void;
  maxVisibleTabs?: number;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenFile,
  maxVisibleTabs,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

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
    </div>
  );
};
