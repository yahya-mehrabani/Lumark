import { useEffect, useCallback } from 'react';
import { copyToClipboard } from '../rendering/clipboard';

/**
 * Retrieves currently selected text in the document.
 */
export function getSelectedText(): string {
  if (typeof window === 'undefined') return '';
  const selection = window.getSelection();
  return selection ? selection.toString() : '';
}

/**
 * Copies the current text selection to the system clipboard.
 * Returns true if text was selected and successfully dispatched to clipboard.
 */
export async function copySelectionToClipboard(): Promise<boolean> {
  const text = getSelectedText();
  if (!text) {
    return false;
  }
  try {
    await copyToClipboard(text);
    return true;
  } catch (err) {
    console.warn('Failed to copy selection to clipboard:', err);
    return false;
  }
}

export interface UseSelectionCopyOptions {
  containerRef?: React.RefObject<HTMLElement | null>;
  onCopied?: (text: string) => void;
}

/**
 * Hook to manage native clipboard copy integration for text selection (PRD FR-NAV-005, US-023.5).
 * Listens for Ctrl/Cmd+C keyboard shortcuts and copies selected text while preserving
 * unblocked context menu and native selection behavior.
 */
export function useSelectionCopy(options: UseSelectionCopyOptions = {}) {
  const { containerRef, onCopied } = options;

  const handleCopyShortcut = useCallback(
    async (e: KeyboardEvent) => {
      // Check for Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        const text = getSelectedText();
        if (text) {
          // If containerRef provided, check if selection is contained or overlaps
          if (containerRef && containerRef.current && typeof window !== 'undefined') {
            const selection = window.getSelection();
            if (selection && selection.anchorNode) {
              const anchorEl =
                selection.anchorNode instanceof Element
                  ? selection.anchorNode
                  : selection.anchorNode.parentElement;
              if (anchorEl && !containerRef.current.contains(anchorEl)) {
                return;
              }
            }
          }

          const success = await copySelectionToClipboard();
          if (success) {
            onCopied?.(text);
          }
        }
      }
    },
    [containerRef, onCopied]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleCopyShortcut);
    return () => {
      window.removeEventListener('keydown', handleCopyShortcut);
    };
  }, [handleCopyShortcut]);

  return {
    copySelection: copySelectionToClipboard,
    getSelectedText,
  };
}
