import { useState, useEffect, useCallback, useRef } from 'react';
import { SearchMatch } from './types';
import { findMatches } from './searchIndexer';
import { applyHighlights, clearHighlights, updateActiveHighlight } from './searchHighlighter';

export interface UseSearchOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  initialOpen?: boolean;
  debounceMs?: number;
}

export interface UseSearchResult {
  isOpen: boolean;
  query: string;
  currentIndex: number;
  totalMatches: number;
  caseSensitive: boolean;
  matches: SearchMatch[];
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  toggleCaseSensitive: () => void;
}

export function useSearch({
  containerRef,
  initialOpen = false,
  debounceMs = 0,
}: UseSearchOptions): UseSearchResult {
  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [query, setQueryState] = useState<string>('');
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const performSearch = useCallback(
    (searchQuery: string, isCaseSens: boolean) => {
      const container = containerRef.current;
      if (!container || !searchQuery.trim()) {
        clearHighlights(container);
        setMatches([]);
        setCurrentIndex(0);
        return;
      }

      // Clear any prior highlights before indexing to ensure clean text nodes
      clearHighlights(container);

      const found = findMatches(container, searchQuery, { caseSensitive: isCaseSens });
      setMatches(found);
      setCurrentIndex(0);

      if (found.length > 0) {
        applyHighlights(container, found, 0);
      }
    },
    [containerRef]
  );

  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (debounceMs > 0) {
        debounceTimerRef.current = setTimeout(() => {
          performSearch(newQuery, caseSensitive);
        }, debounceMs);
      } else {
        performSearch(newQuery, caseSensitive);
      }
    },
    [debounceMs, performSearch, caseSensitive]
  );

  const toggleCaseSensitive = useCallback(() => {
    setCaseSensitive((prev) => {
      const next = !prev;
      performSearch(query, next);
      return next;
    });
  }, [performSearch, query]);

  const openSearch = useCallback(() => {
    setIsOpen(true);
    if (query.trim()) {
      performSearch(query, caseSensitive);
    }
  }, [caseSensitive, performSearch, query]);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    clearHighlights(containerRef.current);
    setQueryState('');
    setMatches([]);
    setCurrentIndex(0);
  }, [containerRef]);

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const next = (currentIndex + 1) % matches.length;
    updateActiveHighlight(containerRef.current, currentIndex, next);
    setCurrentIndex(next);
  }, [containerRef, currentIndex, matches.length]);

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prev = (currentIndex - 1 + matches.length) % matches.length;
    updateActiveHighlight(containerRef.current, currentIndex, prev);
    setCurrentIndex(prev);
  }, [containerRef, currentIndex, matches.length]);

  // Cleanup highlights on unmount
  useEffect(() => {
    const currentContainer = containerRef.current;
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      clearHighlights(currentContainer);
    };
  }, [containerRef]);

  return {
    isOpen,
    query,
    currentIndex,
    totalMatches: matches.length,
    caseSensitive,
    matches,
    openSearch,
    closeSearch,
    setQuery,
    nextMatch,
    prevMatch,
    toggleCaseSensitive,
  };
}
