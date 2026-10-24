import React from 'react';
import { TabItem as TabItemData } from './types';

export interface TabItemProps {
  tab: TabItemData;
  isActive: boolean;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
}

export const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onSelect, onClose }) => {
  const handleClick = (e: React.MouseEvent) => {
    // Only handle primary click
    if (e.button === 0) {
      onSelect(tab.id);
    }
  };

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      onClose(tab.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(tab.id);
    } else if (e.key === 'Delete') {
      e.preventDefault();
      onClose(tab.id);
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      e.stopPropagation();
      onClose(tab.id);
    }
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  const isMissing = tab.status === 'missing';
  const isError = tab.status === 'error';

  return (
    <div
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${tab.id}`}
      tabIndex={isActive ? 0 : -1}
      className={`tab-item ${isActive ? 'is-active' : ''} ${tab.status !== 'ready' ? `status-${tab.status}` : ''}`}
      onClick={handleClick}
      onMouseDown={handleMiddleClick}
      onAuxClick={handleMiddleClick}
      onKeyDown={handleKeyDown}
      title={tab.filePath}
    >
      {isMissing && (
        <span
          className="tab-status-badge badge-missing"
          role="status"
          aria-label={tab.errorMessage || 'File missing on disk'}
          title={tab.errorMessage || 'File missing on disk'}
        >
          Missing
        </span>
      )}
      {isError && (
        <span
          className="tab-status-badge badge-error"
          role="status"
          aria-label={tab.errorMessage || 'Error loading file'}
          title={tab.errorMessage || 'Error loading file'}
        >
          Error
        </span>
      )}
      <span className="tab-title">{tab.displayTitle}</span>
      <button
        type="button"
        className="tab-close-btn"
        aria-label={`Close tab: ${tab.displayTitle}`}
        title="Close tab (Ctrl+W or Middle-Click)"
        onClick={handleCloseClick}
        tabIndex={-1}
      >
        ×
      </button>
    </div>
  );
};
