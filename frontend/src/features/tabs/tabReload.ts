import { TabStore } from './tabStore';
import { arePathsEqual } from './tabUtils';

export interface ScrollState {
  scrollTop: number;
  topHeadingId?: string;
}

export interface FileChangeEventPayload {
  path: string;
  type: 'modified' | 'deleted' | 'renamed';
  timestamp?: string;
}

export interface ReloadOptions {
  tabStore: TabStore;
  loadDocument: (path: string) => Promise<{ content: string; filename?: string; dir?: string }>;
  getScrollContainer?: () => HTMLElement | null;
  onReloadSuccess?: (tabId: string, filename: string) => void;
  onFileMissing?: (tabId: string, filename: string) => void;
}

/**
 * Captures the current scroll offset and top-most visible heading from the scroll container.
 */
export function captureScrollState(container?: HTMLElement | null): ScrollState {
  const el =
    container ||
    (typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('.app-viewport, .document-container')
      : null);

  if (!el) {
    return { scrollTop: 0 };
  }

  const scrollTop = el.scrollTop || 0;
  let topHeadingId: string | undefined;

  // Search for the top-most visible heading element
  const headings = el.querySelectorAll<HTMLElement>('[data-heading-id], h1, h2, h3, h4, h5, h6');
  if (headings.length > 0 && typeof el.getBoundingClientRect === 'function') {
    const containerRect = el.getBoundingClientRect();
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      if (typeof heading.getBoundingClientRect === 'function') {
        const rect = heading.getBoundingClientRect();
        if (rect.top >= containerRect.top - 20) {
          topHeadingId = heading.getAttribute('data-heading-id') || heading.id || undefined;
          break;
        }
      }
    }
  }

  return { scrollTop, topHeadingId };
}

/**
 * Restores the captured scroll offset to the container element.
 */
export function restoreScrollState(
  state: ScrollState,
  container?: HTMLElement | null
): void {
  const el =
    container ||
    (typeof document !== 'undefined'
      ? document.querySelector<HTMLElement>('.app-viewport, .document-container')
      : null);

  if (!el) return;

  const performRestore = () => {
    // If a heading was visible near top and container has elements, try heading alignment if offset shifted
    if (state.topHeadingId) {
      const selector = `[data-heading-id="${state.topHeadingId}"], #${CSS.escape ? CSS.escape(state.topHeadingId) : state.topHeadingId}`;
      const heading = el.querySelector<HTMLElement>(selector);
      if (heading && typeof heading.scrollIntoView === 'function') {
        // If content length shifted significantly, align to heading
        if (Math.abs(el.scrollTop - state.scrollTop) > 50) {
          heading.scrollIntoView({ block: 'start' });
          return;
        }
      }
    }
    el.scrollTop = state.scrollTop;
  };

  // Immediate restore and secondary RAF restore to ensure post-render consistency
  performRestore();
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(performRestore);
  }
}

/**
 * Handles a file change event (modified or deleted) for open document tabs.
 * - Coalesces reloads to the matching tab.
 * - Preserves active scroll position on modification.
 * - Updates tab status to missing on deletion without wiping existing content.
 * - Guarantees reloading one tab does not affect or reset unrelated tabs.
 */
export async function handleFileChanged(
  event: FileChangeEventPayload,
  options: ReloadOptions
): Promise<boolean> {
  const { tabStore, loadDocument, getScrollContainer, onReloadSuccess, onFileMissing } = options;
  const state = tabStore.getState();

  // Find target tab by normalized path
  const targetTab = state.tabs.find((t) => arePathsEqual(t.filePath, event.path));
  if (!targetTab) {
    return false;
  }

  // Handle external deletion / removal
  if (event.type === 'deleted') {
    tabStore.setTabStatus(
      targetTab.id,
      'missing',
      'This file has been deleted or moved on disk.'
    );
    onFileMissing?.(targetTab.id, targetTab.filename);
    return true;
  }

  // Handle external modification
  const isActive = state.activeTabId === targetTab.id;
  let scrollState: ScrollState = { scrollTop: 0 };

  if (isActive) {
    scrollState = captureScrollState(getScrollContainer?.());
  }

  try {
    const updated = await loadDocument(targetTab.filePath);
    tabStore.updateTabContent(targetTab.id, updated.content, 'ready');

    if (isActive) {
      // Allow React to commit the new DOM tree before restoring scroll position
      setTimeout(() => {
        restoreScrollState(scrollState, getScrollContainer?.());
      }, 0);
    }

    onReloadSuccess?.(targetTab.id, targetTab.filename);
    return true;
  } catch (err) {
    console.warn(`Failed to reload modified file ${targetTab.filePath}:`, err);
    tabStore.setTabStatus(targetTab.id, 'error', `Failed to reload file: ${err}`);
    return false;
  }
}
