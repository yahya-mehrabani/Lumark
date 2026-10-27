import { SearchMatch } from './types';

/**
 * Removes all search highlight mark elements from the container and normalizes
 * text nodes, restoring the DOM to its exact original structure.
 */
export function clearHighlights(root: HTMLElement | null): void {
  if (!root) return;

  const marks = root.querySelectorAll('mark[data-search-match="true"]');
  const affectedParents = new Set<Node>();

  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      affectedParents.add(parent);
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
    }
  });

  affectedParents.forEach((parent) => {
    if (typeof (parent as Element).normalize === 'function') {
      (parent as Element).normalize();
    }
  });
}

/**
 * Applies non-destructive `<mark>` highlights around text matches.
 * Groups matches per text node and processes them in reverse character order
 * to preserve text node offsets.
 */
export function applyHighlights(
  root: HTMLElement | null,
  matches: SearchMatch[],
  activeIndex: number = 0
): HTMLElement[] {
  if (!root || !matches || matches.length === 0) {
    clearHighlights(root);
    return [];
  }

  // Always clear previous highlights first to avoid double-wrapping
  clearHighlights(root);

  // Group matches by text node
  const nodeMap = new Map<Text, SearchMatch[]>();
  for (const match of matches) {
    const list = nodeMap.get(match.node) || [];
    list.push(match);
    nodeMap.set(match.node, list);
  }

  const markElements: HTMLElement[] = [];

  nodeMap.forEach((nodeMatches, textNode) => {
    const parent = textNode.parentNode;
    if (!parent) return;

    // Sort descending by startOffset so earlier splits don't invalidate later ones
    nodeMatches.sort((a, b) => b.startOffset - a.startOffset);

    for (const match of nodeMatches) {
      const nodeLength = textNode.textContent?.length ?? 0;
      if (match.endOffset > nodeLength || match.startOffset < 0) {
        continue;
      }

      try {
        textNode.splitText(match.endOffset);
        const matchNode = textNode.splitText(match.startOffset);

        const mark = document.createElement('mark');
        mark.className = 'search-match';
        mark.setAttribute('data-search-match', 'true');
        mark.setAttribute('data-match-index', String(match.index));
        mark.style.unicodeBidi = 'isolate';

        if (match.index === activeIndex) {
          mark.classList.add('active');
          mark.setAttribute('data-search-active', 'true');
        }

        parent.replaceChild(mark, matchNode);
        mark.appendChild(matchNode);
        markElements.push(mark);
      } catch (err) {
        console.warn('Failed to wrap match node in highlight mark:', err);
      }
    }
  });

  // Sort mark elements by their match index ascending
  markElements.sort((a, b) => {
    const idxA = Number(a.getAttribute('data-match-index') || 0);
    const idxB = Number(b.getAttribute('data-match-index') || 0);
    return idxA - idxB;
  });

  // Scroll initial active mark into view if available
  if (activeIndex >= 0 && activeIndex < markElements.length) {
    const activeEl = markElements.find(
      (m) => m.getAttribute('data-match-index') === String(activeIndex)
    );
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }

  return markElements;
}

/**
 * Updates the active highlight indicator between matches and smoothly scrolls the
 * new active match into the center of the viewport.
 */
export function updateActiveHighlight(
  root: HTMLElement | null,
  previousIndex: number,
  newIndex: number
): HTMLElement | null {
  if (!root) return null;

  if (previousIndex >= 0) {
    const prev = root.querySelector<HTMLElement>(
      `mark[data-search-match="true"][data-match-index="${previousIndex}"]`
    );
    if (prev) {
      prev.classList.remove('active');
      prev.removeAttribute('data-search-active');
    }
  }

  const next = root.querySelector<HTMLElement>(
    `mark[data-search-match="true"][data-match-index="${newIndex}"]`
  );
  if (next) {
    next.classList.add('active');
    next.setAttribute('data-search-active', 'true');
    if (typeof next.scrollIntoView === 'function') {
      next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    return next;
  }

  return null;
}
