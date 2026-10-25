import React, { useState, useRef, useEffect } from 'react';
import { RecentFileItem } from './types';
import './recents.css';

export interface RecentFilesMenuProps {
  recentFiles: RecentFileItem[];
  onSelectFile?: (filePath: string) => void;
  onRemoveFile?: (filePath: string) => void;
  onClearFiles?: () => void;
  className?: string;
}

export const RecentFilesMenu: React.FC<RecentFilesMenuProps> = ({
  recentFiles = [],
  onSelectFile,
  onRemoveFile,
  onClearFiles,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (filePath: string) => {
    setIsOpen(false);
    onSelectFile?.(filePath);
  };

  const handleRemove = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    onRemoveFile?.(filePath);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClearFiles?.();
    setIsOpen(false);
  };

  return (
    <div className={`recents-menu-wrapper ${className}`} ref={containerRef}>
      <button
        type="button"
        className="header-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        data-testid="header-recents-btn"
        title="View recently opened Markdown files"
      >
        Recent Files
      </button>

      {isOpen && (
        <div
          className="recents-dropdown"
          role="menu"
          aria-label="Recent files menu"
          data-testid="recents-dropdown"
        >
          <div className="recents-menu-header">
            <span className="recents-menu-title">Recent Files</span>
            {recentFiles.length > 0 && (
              <button
                type="button"
                className="recents-clear-btn"
                onClick={handleClear}
                data-testid="clear-recents-btn"
                title="Clear all recent files from history"
              >
                Clear All
              </button>
            )}
          </div>

          {recentFiles.length === 0 ? (
            <div className="recents-menu-empty" data-testid="recents-empty-msg">
              No recent documents
            </div>
          ) : (
            <ul className="recents-menu-list" role="menu">
              {recentFiles.map((file) => (
                <li
                  key={file.filePath}
                  className="recents-menu-item"
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => handleSelect(file.filePath)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(file.filePath);
                    }
                  }}
                  data-testid={`recent-item-${file.filename}`}
                >
                  <div className="recents-item-main">
                    <span className="recents-item-name" title={file.filePath}>
                      {file.filename}
                    </span>
                    <span className="recents-item-path" title={file.filePath}>
                      {file.filePath}
                    </span>
                    {file.exists === false && (
                      <span
                        className="recent-file-missing-badge"
                        data-testid="missing-file-badge"
                      >
                        Missing on disk
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="recents-item-remove-btn"
                    onClick={(e) => handleRemove(e, file.filePath)}
                    title={`Remove ${file.filename} from recent files`}
                    aria-label={`Remove ${file.filename} from recents`}
                    data-testid={`remove-recent-${file.filename}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
