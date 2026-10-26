import React, { useEffect, useRef } from 'react';
import { TabItem as TabItemData } from './types';
import { TabItem } from './TabItem';
import './tabs.css';

export interface TabBarProps {
  tabs: TabItemData[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectAndFocusTab = (tabId: string) => {
    onSelectTab(tabId);
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(`#tab-${tabId}`);
      el?.focus();
    });
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
    <div
      ref={containerRef}
      className={`tab-bar-container app-chrome ${className}`.trim()}
      role="region"
      aria-label="Document tabs"
    >
      <div
        className="tab-list"
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
      </div>
    </div>
  );
};
