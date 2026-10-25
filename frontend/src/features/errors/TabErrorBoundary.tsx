import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorBoundaryProps } from './types';

export interface TabErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'children'> {
  tabId: string;
  tabTitle?: string;
  onCloseTab?: () => void;
  onReloadTab?: () => void;
  children: React.ReactNode;
}

export const TabErrorBoundary: React.FC<TabErrorBoundaryProps> = ({
  tabId,
  tabTitle,
  onCloseTab,
  onReloadTab,
  children,
  ...props
}) => {
  return (
    <ErrorBoundary
      key={tabId}
      tabId={tabId}
      tabTitle={tabTitle}
      onCloseTab={onCloseTab}
      onReloadTab={onReloadTab}
      {...props}
    >
      {children}
    </ErrorBoundary>
  );
};
