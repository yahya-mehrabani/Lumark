import { useState, useEffect } from 'react';
import { ShowToastOptions, ToastItem } from './types';
import { normalizeErrorMessage } from './normalizeError';

export class ToastStore {
  private toasts: ToastItem[] = [];
  private listeners: Set<() => void> = new Set();
  private nextId = 1;

  public getToasts = (): ToastItem[] => {
    return this.toasts;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify = (): void => {
    for (const listener of this.listeners) {
      listener();
    }
  };

  public showToast = (options: ShowToastOptions): string => {
    const id = `toast-${this.nextId++}-${Date.now()}`;
    const item: ToastItem = {
      id,
      message: options.message,
      type: options.type || 'info',
      title: options.title,
      action: options.action,
      durationMs: options.durationMs !== undefined ? options.durationMs : 5000,
      createdAt: Date.now(),
    };

    this.toasts = [...this.toasts, item];
    this.notify();
    return id;
  };

  /**
   * Displays an actionable plain-language error toast without raw stack traces.
   * If onChooseAnotherFile is provided and the error is a file error, attaches "Choose Another File" button.
   */
  public showError = (
    err: unknown,
    onChooseAnotherFile?: () => void,
    durationMs = 6000
  ): string => {
    const normalized = normalizeErrorMessage(err);
    const action = (normalized.actionLabel && onChooseAnotherFile)
      ? { label: normalized.actionLabel, onClick: onChooseAnotherFile }
      : undefined;

    return this.showToast({
      message: normalized.message,
      type: 'error',
      action,
      durationMs,
    });
  };

  public showWarning = (message: string, durationMs = 5000): string => {
    return this.showToast({
      message,
      type: 'warning',
      durationMs,
    });
  };

  public showSuccess = (message: string, durationMs = 4000): string => {
    return this.showToast({
      message,
      type: 'success',
      durationMs,
    });
  };

  public showInfo = (message: string, durationMs = 4000): string => {
    return this.showToast({
      message,
      type: 'info',
      durationMs,
    });
  };

  public dismissToast = (id: string): void => {
    const prevLen = this.toasts.length;
    this.toasts = this.toasts.filter((t) => t.id !== id);
    if (this.toasts.length !== prevLen) {
      this.notify();
    }
  };

  public clearAll = (): void => {
    if (this.toasts.length > 0) {
      this.toasts = [];
      this.notify();
    }
  };
}

export const defaultToastStore = new ToastStore();

export function useToasts(store: ToastStore = defaultToastStore): ToastItem[] {
  const [toasts, setToasts] = useState<ToastItem[]>(() => store.getToasts());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setToasts(store.getToasts());
    });
    return unsubscribe;
  }, [store]);

  return toasts;
}
