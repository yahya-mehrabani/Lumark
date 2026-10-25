import React, { useState } from 'react';
import './empty-state.css';

export interface RecentFileItem {
  filePath: string;
  filename: string;
  lastOpened?: string | number;
  lastOpenedAt?: string;
  exists?: boolean;
}

export interface EmptyStateProps {
  onOpenFile?: () => void;
  onFileDrop?: (files: File[]) => void;
  onSelectRecentFile?: (filePath: string) => void;
  onRemoveRecentFile?: (filePath: string) => void;
  onClearRecentFiles?: () => void;
  recentFiles?: RecentFileItem[];
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenFile,
  onFileDrop,
  onSelectRecentFile,
  onRemoveRecentFile,
  onClearRecentFiles,
  recentFiles = [],
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);
      onFileDrop?.(fileList);
    }
  };

  return (
    <div
      className={`empty-state-container ${className}`}
      role="region"
      aria-label="Empty state - no document open"
    >
      <div className="empty-state-card">
        {/* Document Icon */}
        <svg
          className="empty-state-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>

        <h2 className="empty-state-title">No Document Open</h2>
        <p className="empty-state-subtitle">
          Open a Markdown file to view, preview diagrams, and inspect math formulas.
        </p>

        {/* Primary Action Button */}
        <div className="empty-state-actions">
          <button
            type="button"
            className="empty-state-btn primary"
            onClick={onOpenFile}
            aria-label="Open Markdown file"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Open File
            <span className="shortcut-badge">Ctrl+O</span>
          </button>
        </div>

        {/* Drop Zone */}
        <div
          className={`empty-state-dropzone ${isDragOver ? 'is-drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={onOpenFile}
          role="region"
          aria-label="Dropzone for Markdown files"
        >
          <span className="dropzone-text">
            {isDragOver ? 'Release to open Markdown files' : 'Drop Markdown (.md) files here'}
          </span>
        </div>

        {/* Recent Files List */}
        <div className="recent-files-section">
          <div className="recent-files-header">
            <h3 className="recent-files-title">Recent Files</h3>
            {recentFiles.length > 0 && onClearRecentFiles && (
              <button
                type="button"
                className="empty-clear-recents-btn"
                onClick={onClearRecentFiles}
                data-testid="empty-clear-recents-btn"
                title="Clear all recent files"
              >
                Clear All
              </button>
            )}
          </div>
          {recentFiles.length > 0 ? (
            <ul className="recent-files-list" role="list">
              {recentFiles.map((file) => (
                <li
                  key={file.filePath}
                  className={`recent-file-item ${file.exists === false ? 'is-missing' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectRecentFile?.(file.filePath)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRecentFile?.(file.filePath);
                    }
                  }}
                  aria-label={`Open recent file: ${file.filename}`}
                  data-testid={`empty-recent-item-${file.filename}`}
                >
                  <div className="recent-file-info">
                    <span className="recent-file-name">{file.filename}</span>
                    <span className="recent-file-path" title={file.filePath}>
                      {file.filePath}
                    </span>
                    {file.exists === false && (
                      <span className="recent-file-missing-badge" data-testid="empty-missing-badge">
                        Missing on disk
                      </span>
                    )}
                  </div>
                  {onRemoveRecentFile && (
                    <button
                      type="button"
                      className="recent-file-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRecentFile(file.filePath);
                      }}
                      title={`Remove ${file.filename} from recents`}
                      aria-label={`Remove ${file.filename} from recents`}
                      data-testid={`empty-remove-recent-${file.filename}`}
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
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <span className="no-recents">No recent documents</span>
          )}
        </div>

        {/* Shortcuts Cheatsheet */}
        <div className="shortcuts-cheatsheet" role="region" aria-label="Keyboard shortcuts">
          <h3 className="shortcuts-title">Keyboard Shortcuts</h3>
          <div className="shortcuts-grid">
            <div className="shortcut-row">
              <span>Open Document</span>
              <span className="shortcut-keys">
                <kbd className="kbd-key">Ctrl</kbd>+<kbd className="kbd-key">O</kbd>
              </span>
            </div>
            <div className="shortcut-row">
              <span>Close Tab</span>
              <span className="shortcut-keys">
                <kbd className="kbd-key">Ctrl</kbd>+<kbd className="kbd-key">W</kbd>
              </span>
            </div>
            <div className="shortcut-row">
              <span>Switch Tabs</span>
              <span className="shortcut-keys">
                <kbd className="kbd-key">←</kbd> / <kbd className="kbd-key">→</kbd>
              </span>
            </div>
            <div className="shortcut-row">
              <span>Search Text</span>
              <span className="shortcut-keys">
                <kbd className="kbd-key">Ctrl</kbd>+<kbd className="kbd-key">F</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
