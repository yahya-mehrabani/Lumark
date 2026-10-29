import { useSyncExternalStore, useMemo } from 'react';
import { TabStore, tabStore as defaultStore } from './tabStore';
import { TabItem, TabState } from './types';

/**
 * Hook to subscribe to tab state changes in React components.
 */
export function useTabStore(store: TabStore = defaultStore): TabState {
  return useSyncExternalStore(store.subscribe, store.getState);
}

/**
 * Hook to retrieve the currently active TabItem.
 */
export function useActiveTab(store: TabStore = defaultStore): TabItem | null {
  const state = useTabStore(store);
  return useMemo(() => {
    if (!state.activeTabId) return null;
    return state.tabs.find((t) => t.id === state.activeTabId) || null;
  }, [state.tabs, state.activeTabId]);
}

/**
 * Hook to retrieve the list of open tabs.
 */
export function useTabs(store: TabStore = defaultStore): TabItem[] {
  const state = useTabStore(store);
  return state.tabs;
}

/**
 * Hook exposing tab store actions.
 */
export function useTabActions(store: TabStore = defaultStore) {
  return useMemo(
    () => ({
      openTab: store.openTab,
      closeTab: store.closeTab,
      switchTab: store.switchTab,
      focusExistingTab: store.focusExistingTab,
      setTabStatus: store.setTabStatus,
      updateTabContent: store.updateTabContent,
      closeAllTabs: store.closeAllTabs,
      closeOtherTabs: store.closeOtherTabs,
      getActiveTab: store.getActiveTab,
    }),
    [store]
  );
}
