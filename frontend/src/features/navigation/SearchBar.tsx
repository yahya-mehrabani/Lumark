import React, { useEffect, useRef } from 'react';
import './search.css';

export interface SearchBarProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  currentIndex: number;
  totalMatches: number;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
  caseSensitive?: boolean;
  onToggleCaseSensitive?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen,
  query,
  onQueryChange,
  currentIndex,
  totalMatches,
  onNext,
  onPrevious,
  onClose,
  caseSensitive = false,
  onToggleCaseSensitive,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevious();
      } else {
        onNext();
      }
    }
  };

  const hasQuery = query.trim().length > 0;
  const matchText = !hasQuery
    ? ''
    : totalMatches === 0
      ? 'No matches'
      : `${currentIndex + 1} of ${totalMatches}`;

  return (
    <div
      className="search-bar-floating app-chrome"
      role="search"
      aria-label="Find in document"
      data-testid="search-bar"
    >
      <div className="search-bar-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="search-bar-input"
          placeholder="Find in document..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search document"
          data-testid="search-input"
        />
        {hasQuery && (
          <span
            className={`search-bar-counter ${totalMatches === 0 ? 'no-matches' : ''}`}
            aria-live="polite"
            aria-atomic="true"
            data-testid="search-counter"
          >
            {matchText}
          </span>
        )}
      </div>

      <div className="search-bar-controls">
        {onToggleCaseSensitive && (
          <button
            type="button"
            className={`search-bar-btn search-case-btn ${caseSensitive ? 'active' : ''}`}
            onClick={onToggleCaseSensitive}
            aria-pressed={caseSensitive}
            aria-label="Match case"
            title="Match case"
            data-testid="search-case-toggle"
          >
            Aa
          </button>
        )}

        <button
          type="button"
          className="search-bar-btn"
          onClick={onPrevious}
          disabled={totalMatches === 0}
          aria-label="Previous match (Shift+Enter, Shift+F3)"
          title="Previous match (Shift+Enter, Shift+F3)"
          data-testid="search-prev-btn"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        <button
          type="button"
          className="search-bar-btn"
          onClick={onNext}
          disabled={totalMatches === 0}
          aria-label="Next match (Enter, F3)"
          title="Next match (Enter, F3)"
          data-testid="search-next-btn"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className="search-bar-divider" />

        <button
          type="button"
          className="search-bar-btn search-close-btn"
          onClick={onClose}
          aria-label="Close search (Escape)"
          title="Close search (Escape)"
          data-testid="search-close-btn"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};
