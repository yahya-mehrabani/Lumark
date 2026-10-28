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
 * TableOfContents Component — Minimalist Scrollspy Rail.
 * Conforms to Warm Editorial Minimalist Desktop design.
 * - Minimalist fixed right-side rail of horizontal bar markers.
 * - Text labels hidden by default; revealed on rail hover or when active.
 * - Active heading highlighted with teal accent.
 * - Click-to-scroll smooth navigation.
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

  const railRef = React.useRef<HTMLElement | null>(null);

  // Auto-scroll active item into view within the rail as the user scrolls the document
  React.useEffect(() => {
    if (!activeId || !railRef.current) return;
    try {
      const rail = railRef.current;
      const activeEl = rail.querySelector<HTMLElement>(
        `[data-target="${CSS.escape(activeId)}"], [href="#${CSS.escape(activeId)}"]`
      );
      if (!activeEl) return;

      if (rail.scrollHeight > rail.clientHeight && rail.clientHeight > 0) {
        const itemTop = activeEl.offsetTop;
        const itemHeight = activeEl.offsetHeight;
        const railScrollTop = rail.scrollTop;
        const railHeight = rail.clientHeight;

        if (itemTop < railScrollTop) {
          rail.scrollTo?.({ top: Math.max(0, itemTop - 20), behavior: 'smooth' });
        } else if (itemTop + itemHeight > railScrollTop + railHeight) {
          rail.scrollTo?.({ top: itemTop + itemHeight - railHeight + 20, behavior: 'smooth' });
        }
      }
    } catch {
      // Fallback for non-standard IDs or environments
    }
  }, [activeId]);

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

    // Locate target element within container or document
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

    if (target) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

      if (typeof target.scrollIntoView === 'function') {
        try {
          target.scrollIntoView({ behavior, block: 'start' });
        } catch {
          target.scrollIntoView(true);
        }
      }

      if (typeof window !== 'undefined' && window.localStorage?.getItem('debugOutline') === '1') {
        requestAnimationFrame(() => {
          const diagMsg = `[Outline Debug] Target: "${target?.id}" | scrollIntoView dispatched (behavior: ${behavior})`;
          defaultToastStore.showInfo(diagMsg);
          console.info(diagMsg);
        });
      }
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
          className={`spy-item toc-link ${isActive ? 'active' : ''}`}
          aria-current={isActive ? 'location' : undefined}
          onClick={(e) => handleHeadingClick(e, node.id)}
          title={node.text}
          data-testid={`toc-link-${node.id}`}
          data-target={node.id}
        >
          <span className="spy-label toc-text" dir="auto" title={node.text}>
            {node.text}
          </span>
          <span className="spy-marker toc-bullet" aria-hidden="true" />
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
      ref={railRef}
      className={`scrollspy-rail toc-sidebar ${!isOpen ? 'hidden' : ''} ${className}`.trim()}
      aria-label="Table of Contents"
      data-testid="toc-sidebar"
    >
      {onClose && (
        <button
          type="button"
          className="toc-close-btn"
          onClick={onClose}
          aria-label="Close Table of Contents"
          title="Close outline"
          data-testid="toc-close-button"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: 0,
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            borderWidth: 0,
          }}
        >
          Close
        </button>
      )}
      {!hasHeadings ? (
        <div className="toc-empty" data-testid="toc-empty" style={{ display: 'none' }}>
          No headings found in document.
        </div>
      ) : (
        <ul className="toc-list" role="list" data-testid="toc-list">
          {effectiveTree.map(renderNode)}
        </ul>
      )}
    </nav>
  );
};
