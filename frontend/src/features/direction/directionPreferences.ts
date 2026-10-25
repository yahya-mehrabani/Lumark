import { useState, useEffect } from 'react';

/**
 * Direction preference setting values (PRD FR-DIR-004, US-019.2).
 * - 'auto': Standard Unicode automatic first strong character detection (default)
 * - 'rtl': Right-to-Left fallback for un-annotated and neutral blocks
 * - 'ltr': Left-to-Right fallback for un-annotated and neutral blocks
 */
export type DirectionPreference = 'auto' | 'rtl' | 'ltr';

let currentPreference: DirectionPreference = 'auto';
const listeners = new Set<(pref: DirectionPreference) => void>();

/**
 * Retrieves the currently active user direction preference.
 */
export function getActiveDirectionPreference(): DirectionPreference {
  return currentPreference;
}

/**
 * Updates the active user direction preference and notifies subscribers.
 */
export function setActiveDirectionPreference(pref: DirectionPreference): void {
  if (currentPreference === pref) return;
  currentPreference = pref;
  listeners.forEach((listener) => {
    try {
      listener(pref);
    } catch (err) {
      console.warn('Error in direction preference listener:', err);
    }
  });
}

/**
 * Resets the direction preference to default ('auto').
 */
export function resetDirectionPreference(): void {
  setActiveDirectionPreference('auto');
}

/**
 * Subscribes to changes in the active direction preference.
 */
export function subscribeDirectionPreference(
  listener: (pref: DirectionPreference) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * React hook to read and update the active user direction preference.
 */
export function useDirectionPreference(): [
  DirectionPreference,
  (pref: DirectionPreference) => void
] {
  const [pref, setPref] = useState<DirectionPreference>(getActiveDirectionPreference);

  useEffect(() => {
    setPref(getActiveDirectionPreference());
    const unsubscribe = subscribeDirectionPreference((newPref) => {
      setPref(newPref);
    });
    return unsubscribe;
  }, []);

  return [pref, setActiveDirectionPreference];
}
