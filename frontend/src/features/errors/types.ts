import React from 'react';

export interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  tabId?: string;
  tabTitle?: string;
  onCloseTab?: () => void;
  onReloadTab?: () => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: ErrorFallbackProps) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  tabId?: string;
  tabTitle?: string;
  onCloseTab?: () => void;
  onReloadTab?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
