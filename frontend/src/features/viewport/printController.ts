/**
 * Print Controller & Dispatcher
 * US-024 (FR-NAV-006): Native WebView Print Workflow & Print Styling.
 *
 * Provides:
 * 1. Safe triggerPrint() invocation of native window.print() with exception isolation.
 * 2. Graceful degradation when window.print() is unsupported or fails in minimal environments.
 * 3. usePrint() React hook binding Ctrl/Cmd+P shortcuts.
 */

import { useEffect, useCallback } from 'react';

export interface PrintResult {
  success: boolean;
  error?: string;
}

export interface PrintOptions {
  onError?: (err: Error) => void;
  onSuccess?: () => void;
}

/**
 * Checks whether the environment supports native window.print.
 */
export function isPrintSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.print === 'function';
}

/**
 * Triggers document print via native WebView window.print() API with graceful degradation.
 * If print is unsupported or throws (e.g., in a minimal Linux container or unsupported WebKitGTK instance),
 * catches the exception and reports cleanly.
 */
export function triggerPrint(options?: PrintOptions): PrintResult {
  if (!isPrintSupported()) {
    const errorMsg = 'Print is not supported on this platform configuration.';
    const err = new Error(errorMsg);
    options?.onError?.(err);
    return { success: false, error: errorMsg };
  }

  try {
    window.print();
    options?.onSuccess?.();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const wrappedError = new Error(`Failed to invoke native print dialog: ${message}`);
    options?.onError?.(wrappedError);
    return { success: false, error: message };
  }
}

export interface UsePrintOptions {
  enableShortcuts?: boolean;
  onError?: (err: Error) => void;
  onSuccess?: () => void;
}

/**
 * Hook to manage print keyboard shortcuts (Ctrl/Cmd+P) and provide trigger callback.
 */
export function usePrint(options: UsePrintOptions = {}) {
  const { enableShortcuts = true, onError, onSuccess } = options;

  const handlePrint = useCallback(() => {
    return triggerPrint({ onError, onSuccess });
  }, [onError, onSuccess]);

  useEffect(() => {
    if (!enableShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+P or Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableShortcuts, handlePrint]);

  return {
    print: handlePrint,
    isSupported: isPrintSupported(),
  };
}
