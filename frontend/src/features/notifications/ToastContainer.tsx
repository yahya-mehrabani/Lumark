import React, { useEffect, useCallback } from 'react';
import { ToastNotification } from './ToastNotification';
import { ToastStore, defaultToastStore, useToasts } from './toastStore';
import './notifications.css';

export interface ToastContainerProps {
  store?: ToastStore;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ store = defaultToastStore }) => {
  const toasts = useToasts(store);

  const handleDismiss = useCallback(
    (id: string) => {
      store.dismissToast(id);
    },
    [store]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toasts.length > 0) {
        // Dismiss the most recent toast on Escape
        const latestToast = toasts[toasts.length - 1];
        store.dismissToast(latestToast.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toasts, store]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="toast-container"
      data-testid="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          toast={toast}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
};
