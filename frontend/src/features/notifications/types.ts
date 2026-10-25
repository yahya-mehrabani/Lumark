export type ToastType = 'error' | 'warning' | 'info' | 'success';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  action?: ToastAction;
  durationMs?: number;
  createdAt: number;
}

export interface ShowToastOptions {
  message: string;
  type?: ToastType;
  title?: string;
  action?: ToastAction;
  durationMs?: number;
}
