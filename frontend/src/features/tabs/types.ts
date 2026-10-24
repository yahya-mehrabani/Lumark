export type TabStatus = 'ready' | 'loading' | 'error' | 'missing';

export interface TabItem {
  id: string;
  filePath: string;
  filename: string;
  parentDir: string;
  displayTitle: string;
  content: string;
  status: TabStatus;
  errorMessage?: string;
  lastModified?: string | number;
  fileSizeBytes?: number;
  isReadOnly?: boolean;
}

export interface TabState {
  tabs: TabItem[];
  activeTabId: string | null;
}

export interface OpenTabOptions {
  filePath: string;
  filename?: string;
  parentDir?: string;
  content?: string;
  status?: TabStatus;
  errorMessage?: string;
  lastModified?: string | number;
  fileSizeBytes?: number;
  isReadOnly?: boolean;
}
