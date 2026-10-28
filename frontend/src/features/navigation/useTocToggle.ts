import { useState, useEffect, useCallback } from 'react';

export interface UseTocToggleOptions {
  initialOpen?: boolean;
  hasHeadings?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

/**
 * Hook to manage Table of Contents sidebar visibility and keyboard shortcuts.
 * Conforms to PRD Section 5.5 and Story US-021.3.
 * Supports toggling via Ctrl+Shift+O / Cmd+Shift+O / Alt+T.
 * Cleanly disables/collapses outline when document has zero headings.
 */
export function useTocToggle(options: UseTocToggleOptions = {}) {
  const { initialOpen = true, hasHeadings = true, onToggle } = options;

  const [isOpenState, setIsOpenState] = useState<boolean>(initialOpen);

  useEffect(() => {
    setIsOpenState(initialOpen);
  }, [initialOpen]);

  // If document has zero headings, force collapsed state
  const effectiveIsOpen = hasHeadings && isOpenState;

  const toggle = useCallback(() => {
    if (!hasHeadings) {
      return;
    }
    setIsOpenState((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  }, [hasHeadings, onToggle]);

  const open = useCallback(() => {
    if (!hasHeadings) {
      return;
    }
    setIsOpenState(true);
    onToggle?.(true);
  }, [hasHeadings, onToggle]);

  const close = useCallback(() => {
    setIsOpenState(false);
    onToggle?.(false);
  }, [onToggle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut 1: Ctrl+Shift+O / Cmd+Shift+O
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const isToggleKey =
        (isCmdOrCtrl && e.shiftKey && (e.key === 'o' || e.key === 'O')) ||
        (e.altKey && (e.key === 't' || e.key === 'T'));

      if (isToggleKey) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggle]);

  return {
    isOpen: effectiveIsOpen,
    isAvailable: hasHeadings,
    toggle,
    open,
    close,
    setIsOpen: (val: boolean) => {
      if (!hasHeadings && val) return;
      setIsOpenState(val);
      onToggle?.(val);
    },
  };
}
