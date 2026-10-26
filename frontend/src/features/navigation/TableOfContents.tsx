import React, { useMemo } from 'react';
import { TocItem, TocNode } from './types';
import { buildTocTree } from './tocGenerator';
import { useTableOfContents } from './useTableOfContents';
import { useScrollSpy } from './useScrollSpy';
import { defaultToastStore } from '../notifications';
import './toc.css';

export interface TableOfContentsProps {
  items?: TocItem[];
  tree?: TocNode[];
  markdown?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
  zoomFactor?: number;
  activeId?: string;
  onSelectHeading?: (id: string) => void;
  onClose?: () => void;
  isOpen?: boolean;
  className?: string;
}

/**
 * TableOfContents Component.
 * Conforms to PRD FR-NAV-001 and Section 5.5.
 * - Extracts and presents a hierarchical document outline from h1-h6 headings.
 * - Click-to-scroll smooth navigation to document headings.
 * - Highlights currently visible active heading.
 * - Cleanly collapses/handles documents with zero headings.
 */
export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items: propsItems,
  tree: propsTree,
  markdown,
  containerRef,
  zoomFactor: propsZoomFactor,
  activeId: propsActiveId,
  onSelectHeading,
  onClose,
  isOpen = true,
  className = '',
}) => {
  // Use hook if explicit items/tree are not supplied
  const hookData = useTableOfContents({
    markdown: propsItems ? undefined : markdown,
    containerRef: propsItems ? undefined : containerRef,
  });

  const effectiveItems = propsItems ?? hookData.items;
  const effectiveTree = useMemo(() => {
    if (propsTree) return propsTree;
    if (propsItems) return buildTocTree(propsItems);
    return hookData.tree;
  }, [propsTree, propsItems, hookData.tree]);

  const itemIds = useMemo(() => {
    return propsActiveId ? undefined : effectiveItems.map((i) => i.id);
  }, [propsActiveId, effectiveItems]);

  const [clickedId, setClickedId] = React.useState<string | null>(null);

  const spyData = useScrollSpy({
    containerRef,
    itemIds,
  });

  React.useEffect(() => {
    const scrollTarget = containerRef?.current ?? (typeof window !== 'undefined' ? window : null);
    if (!scrollTarget) return;

    const handleScroll = () => {
      setClickedId(null);
    };

    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollTarget.removeEventListener('scroll', handleScroll);
  }, [containerRef]);

  const activeId = propsActiveId ?? clickedId ?? spyData.activeId;

  const hasHeadings = effectiveItems.length > 0;

  if (!isOpen) {
    return null;
  }

  const handleHeadingClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();

    setClickedId(id);
    spyData.setActiveId(id);

    if (onSelectHeading) {
      onSelectHeading(id);
    }

    const decodedId = (() => {
      try {
        return decodeURIComponent(id);
      } catch {
        return id;
      }
    })();

    // Attempt to locate target element within container or document
    const container = containerRef?.current;
    let target: HTMLElement | null = null;

    if (container && typeof CSS !== 'undefined') {
      try {
        target =
          container.querySelector<HTMLElement>(`#${CSS.escape(id)}`) ||
          container.querySelector<HTMLElement>(`#${CSS.escape(decodedId)}`) ||
          container.querySelector<HTMLElement>(`[data-heading-id="${CSS.escape(id)}"]`) ||
          container.querySelector<HTMLElement>(`[data-heading-id="${CSS.escape(decodedId)}"]`);
      } catch {
        target = null;
      }
    }

    if (!target) {
      target = document.getElementById(id) || document.getElementById(decodedId);
    }

    if (!target && typeof CSS !== 'undefined') {
      try {
        const escaped = CSS.escape(id);
        const escapedDecoded = CSS.escape(decodedId);
        target =
          document.querySelector<HTMLElement>(`[data-heading-id="${escaped}"]`) ||
          document.querySelector<HTMLElement>(`[data-heading-id="${escapedDecoded}"]`) ||
          document.querySelector<HTMLElement>(`[name="${escaped}"]`) ||
          document.querySelector<HTMLElement>(`[name="${escapedDecoded}"]`);
      } catch {
        target = null;
      }
    }

    if (container && target) {
      const TOP_SCROLL_PADDING = 16;
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const currentZoom =
        propsZoomFactor ??
        (() => {
          if (typeof window !== 'undefined' && container.parentElement) {
            const z = parseFloat(window.getComputedStyle(container.parentElement).zoom || '1');
            return isNaN(z) || z <= 0 ? 1 : z;
          }
          return 1;
        })();

      const deltaY = (targetRect.top - containerRect.top) / currentZoom;
      const targetScrollTop = Math.max(0, container.scrollTop + deltaY - TOP_SCROLL_PADDING);

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

      const beforeScrollTop = container.scrollTop;

      if (typeof container.scrollTo === 'function') {
        try {
          container.scrollTo({ top: targetScrollTop, behavior });
        } catch {
          container.scrollTop = targetScrollTop;
        }
      } else {
        container.scrollTop = targetScrollTop;
      }

      // Explicit fallback for non-animating environments
      if (behavior === 'auto' && container.scrollTop !== targetScrollTop) {
        container.scrollTop = targetScrollTop;
      }

      // DIAGNOSTIC MODE: Opt-in via localStorage.debugOutline = "1"
      if (typeof window !== 'undefined' && window.localStorage?.getItem('debugOutline') === '1') {
        requestAnimationFrame(() => {
          const afterScrollTop = container.scrollTop;
          const isScrollable = container.scrollHeight > container.clientHeight;
          const diagMsg = `[Outline Debug] Target: "${target?.id}" | Scrollable: ${isScrollable} (scrollHeight: ${container.scrollHeight}px, clientHeight: ${container.clientHeight}px) | scrollTop: ${beforeScrollTop} -> ${afterScrollTop} (target: ${Math.round(targetScrollTop)}) | zoom: ${currentZoom}`;
          defaultToastStore.showInfo(diagMsg);
          console.info(diagMsg);
        });
      }
    } else if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderNode = (node: TocNode): React.ReactNode => {
    const isActive = activeId === node.id;

    return (
      <li
        key={node.id}
        className={`toc-item toc-level-${node.level} ${isActive ? 'active' : ''}`}
        data-testid={`toc-item-${node.id}`}
        data-level={node.level}
      >
        <a
          href={`#${node.id}`}
          className={`toc-link ${isActive ? 'active' : ''}`}
          aria-current={isActive ? 'location' : undefined}
          onClick={(e) => handleHeadingClick(e, node.id)}
          title={node.text}
          data-testid={`toc-link-${node.id}`}
        >
          <span className="toc-bullet" aria-hidden="true" />
          <span className="toc-text" dir="auto">
            {node.text}
          </span>
        </a>

        {node.children && node.children.length > 0 && (
          <ul className="toc-sublist" role="list">
            {node.children.map(renderNode)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav
      className={`toc-sidebar app-chrome ${className}`.trim()}
      aria-label="Table of Contents"
      data-testid="toc-sidebar"
    >
      <header className="toc-header">
        <div className="toc-title-group">
          <svg
            className="toc-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <h2 className="toc-title">Table of Contents</h2>
        </div>

        {onClose && (
          <button
            type="button"
            className="toc-close-btn"
            onClick={onClose}
            aria-label="Close Table of Contents"
            title="Close outline"
            data-testid="toc-close-button"
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
      </header>

      <div className="toc-content">
        {!hasHeadings ? (
          <div className="toc-empty" data-testid="toc-empty">
            No headings found in document.
          </div>
        ) : (
          <ul className="toc-list" role="list" data-testid="toc-list">
            {effectiveTree.map(renderNode)}
          </ul>
        )}
      </div>
    </nav>
  );
};
