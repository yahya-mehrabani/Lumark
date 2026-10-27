import React, { useEffect, useRef, useState } from 'react';
import { TabItem as TabItemData } from './types';
import { TabItem } from './TabItem';
import './tabs.css';

export interface TabBarProps {
  tabs: TabItemData[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onOpenFile?: () => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenFile,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);

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
    <div
      ref={containerRef}
      className={`tab-bar-container app-chrome ${className}`.trim()}
      role="region"
      aria-label="Document tabs"
    >
      <div
        className="tab-list tabs-list"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={onSelectTab}
            onClose={onCloseTab}
          />
        ))}

        {/* Tab Utility Controls: + Open File & Overflow Dropdown */}
        <div className="tab-utility-controls" ref={overflowRef}>
          <button
            type="button"
            className="tab-icon-btn"
            id="addTabBtn"
            onClick={onOpenFile}
            title="Open File (Ctrl+O)"
            aria-label="Open File"
            data-testid="tab-add-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button
            type="button"
            className={`tab-icon-btn ${isOverflowOpen ? 'active' : ''}`}
            id="tabOverflowBtn"
            onClick={() => setIsOverflowOpen((prev) => !prev)}
            title="All Open Tabs"
            aria-haspopup="true"
            aria-expanded={isOverflowOpen}
            data-testid="tab-overflow-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isOverflowOpen && (
            <div className="tab-overflow-menu open" id="tabOverflowMenu" role="menu">
              <div className="overflow-menu-header">Open Tabs ({tabs.length})</div>
              {tabs.map((tab) => {
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
                    <span>{tab.filename || tab.displayTitle}</span>
                    <span className="overflow-tab-dot" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
