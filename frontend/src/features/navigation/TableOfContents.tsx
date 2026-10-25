import React, { useMemo } from 'react';
import { TocItem, TocNode } from './types';
import { buildTocTree } from './tocGenerator';
import { useTableOfContents } from './useTableOfContents';
import { useScrollSpy } from './useScrollSpy';
import './toc.css';

export interface TableOfContentsProps {
  items?: TocItem[];
  tree?: TocNode[];
  markdown?: string;
  containerRef?: React.RefObject<HTMLElement | null>;
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

  const spyData = useScrollSpy({
    containerRef,
    itemIds: propsActiveId ? undefined : effectiveItems.map((i) => i.id),
  });
  const activeId = propsActiveId ?? spyData.activeId;

  const hasHeadings = effectiveItems.length > 0;

  if (!isOpen) {
    return null;
  }

  const handleHeadingClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();

    if (onSelectHeading) {
      onSelectHeading(id);
    }

    // Attempt to locate target element by id, data-heading-id, or name
    let target: HTMLElement | null = document.getElementById(id);

    if (!target && typeof CSS !== 'undefined') {
      try {
        const escaped = CSS.escape(id);
        target =
          document.querySelector(`[data-heading-id="${escaped}"]`) ||
          document.querySelector(`[name="${escaped}"]`);
      } catch {
        target = null;
      }
    }

    if (target) {
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
