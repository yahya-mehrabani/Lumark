import { useState, useEffect, RefObject } from 'react';

export interface UseScrollSpyOptions {
  containerRef?: RefObject<HTMLElement | null>;
  itemIds?: string[];
  rootMargin?: string;
  threshold?: number | number[];
}

/**
 * React hook that uses IntersectionObserver to track the uppermost visible heading
 * in a document container.
 * Conforms to PRD Section 5.5 and Story US-021.3.
 * Mitigates jitter by applying top/bottom rootMargin thresholds.
 */
export function useScrollSpy(options: UseScrollSpyOptions = {}): {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
} {
  const {
    containerRef,
    itemIds,
    rootMargin = '-20px 0px -60% 0px',
    threshold = 0,
  } = options;

  const [activeId, setActiveId] = useState<string | null>(() => {
    return itemIds && itemIds.length > 0 ? itemIds[0] : null;
  });

  useEffect(() => {
    // If no window or elements to spy on, do nothing
    if (typeof window === 'undefined') {
      return;
    }

    const container = containerRef?.current ?? null;

    // Gather elements to observe
    let elements: HTMLElement[] = [];
    if (itemIds && itemIds.length > 0) {
      elements = itemIds
        .map((id) => {
          let el = document.getElementById(id);
          if (!el && typeof CSS !== 'undefined') {
            try {
              const escaped = CSS.escape(id);
              el =
                document.querySelector(`[data-heading-id="${escaped}"]`) ||
                document.querySelector(`[name="${escaped}"]`);
            } catch {
              el = null;
            }
          }
          return el;
        })
        .filter((el): el is HTMLElement => el !== null);
    } else if (container) {
      elements = Array.from(
        container.querySelectorAll<HTMLElement>('.markdown-heading, h1, h2, h3, h4, h5, h6')
      );
    }

    if (elements.length === 0) {
      return;
    }

    // Map of element ID to intersection state
    const visibleEntries = new Map<string, IntersectionObserverEntry>();

    const updateActiveHeading = () => {
      // Find visible headings
      const intersecting = Array.from(visibleEntries.values()).filter(
        (entry) => entry.isIntersecting
      );

      if (intersecting.length > 0) {
        // Pick the topmost intersecting heading in the viewport
        intersecting.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        );
        const topEntry = intersecting[0];
        const targetId =
          topEntry.target.id ||
          topEntry.target.getAttribute('data-heading-id');
        if (targetId) {
          setActiveId(targetId);
          return;
        }
      }

      // If no headings currently intersect (e.g. user scrolled past a section),
      // determine the last heading that is above the threshold
      const above = elements.filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top <= 120; // 120px offset from viewport top
      });

      if (above.length > 0) {
        const lastAbove = above[above.length - 1];
        const targetId =
          lastAbove.id || lastAbove.getAttribute('data-heading-id');
        if (targetId) {
          setActiveId(targetId);
        }
      } else if (elements.length > 0) {
        // Fallback to first heading
        const first = elements[0];
        const targetId = first.id || first.getAttribute('data-heading-id');
        if (targetId) {
          setActiveId(targetId);
        }
      }
    };

    let observer: IntersectionObserver | null = null;

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const id =
              entry.target.id ||
              entry.target.getAttribute('data-heading-id') ||
              '';
            if (id) {
              visibleEntries.set(id, entry);
            }
          });
          updateActiveHeading();
        },
        {
          root: container,
          rootMargin,
          threshold,
        }
      );

      elements.forEach((el) => observer?.observe(el));
    }

    // Also attach scroll listener for containers or environments where
    // IntersectionObserver is debounced or unsupported
    const scrollTarget = container ?? window;
    const handleScroll = () => {
      updateActiveHeading();
    };

    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    updateActiveHeading();

    return () => {
      if (observer) {
        observer.disconnect();
      }
      scrollTarget.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, itemIds, rootMargin, threshold]);

  return { activeId, setActiveId };
}
