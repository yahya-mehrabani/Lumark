import React, { useState, useRef } from 'react';
import './dropzone.css';

export interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  overlayTitle?: string;
  overlaySubtitle?: string;
  testId?: string;
  ariaLabel?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesDropped,
  disabled = false,
  children,
  className = '',
  overlayTitle = 'Drop Markdown files here to open',
  overlaySubtitle = 'Supports .md, .markdown, .mdown, .mkd',
  testId = 'app-dropzone',
  ariaLabel = 'Application drop zone',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef<number>(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) {
      return;
    }

    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) {
      return;
    }

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }

    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) {
      return;
    }

    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (disabled) {
      return;
    }

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesDropped(files);
    }
  };

  return (
    <div
      className={`dropzone-container ${isDragOver ? 'is-drag-over' : ''} ${className}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={testId}
      role="region"
      aria-label={ariaLabel}
      aria-dropeffect={disabled ? 'none' : 'copy'}
    >
      {children}

      {isDragOver && !disabled && (
        <div
          className="dropzone-overlay"
          data-testid="dropzone-overlay"
          aria-live="polite"
        >
          <div className="dropzone-icon-badge">
            <svg
              className="dropzone-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <p className="dropzone-title">{overlayTitle}</p>
          <p className="dropzone-subtitle">{overlaySubtitle}</p>
        </div>
      )}
    </div>
  );
};
