import { useState, useEffect, useMemo, RefObject } from 'react';
import {
  extractHeadingsFromMarkdown,
  extractHeadingsFromElement,
  buildTocTree,
} from './tocGenerator';
import { TableOfContentsData, TocItem } from './types';

export interface UseTableOfContentsOptions {
  markdown?: string;
  containerRef?: RefObject<HTMLElement | null>;
}

/**
 * React hook for extracting and maintaining an active Table of Contents.
 * Extracts headings from either Markdown AST/source or rendered DOM container.
 * Returns both flat items array and hierarchical nested tree.
 */
export function useTableOfContents(
  options: UseTableOfContentsOptions = {}
): TableOfContentsData {
  const { markdown, containerRef } = options;

  // 1. Primary extraction from markdown text
  const markdownItems = useMemo<TocItem[]>(() => {
    if (markdown) {
      return extractHeadingsFromMarkdown(markdown);
    }
    return [];
  }, [markdown]);

  const [domItems, setDomItems] = useState<TocItem[] | null>(null);

  // 2. Optional extraction / synchronization with rendered DOM
  useEffect(() => {
    if (!containerRef || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    const updateFromDom = () => {
      const items = extractHeadingsFromElement(container);
      setDomItems(items);
    };

    updateFromDom();

    // Observe DOM mutations to stay synced with rendered content
    const observer = new MutationObserver(() => {
      updateFromDom();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [containerRef, markdown]);

  const items = domItems && domItems.length > 0 ? domItems : markdownItems;
  const tree = useMemo(() => buildTocTree(items), [items]);

  return {
    items,
    tree,
    hasHeadings: items.length > 0,
  };
}
