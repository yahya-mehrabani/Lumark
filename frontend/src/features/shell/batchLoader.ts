import { TabStore } from '../tabs/tabStore';

export const SUPPORTED_MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd'] as const;

/**
 * Checks whether a filename or path has a supported Markdown extension.
 */
export function isSupportedMarkdownFile(filename: string): boolean {
  if (!filename) return false;
  const lower = filename.toLowerCase();
  return SUPPORTED_MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Partitions a list of files into supported Markdown files and unsupported files.
 */
export function partitionFiles(files: File[]): { validFiles: File[]; rejectedFiles: File[] } {
  const validFiles: File[] = [];
  const rejectedFiles: File[] = [];

  for (const file of files) {
    if (isSupportedMarkdownFile(file.name)) {
      validFiles.push(file);
    } else {
      rejectedFiles.push(file);
    }
  }

  return { validFiles, rejectedFiles };
}

export interface BatchLoadOptions {
  store: TabStore;
  notifyWarning?: (message: string) => void;
  notifySuccess?: (message: string) => void;
  readFileContent?: (file: File) => Promise<string>;
}

export interface BatchLoadResult {
  openedCount: number;
  rejectedCount: number;
  rejectedNames: string[];
  openedFiles: string[];
}

/**
 * Formats an actionable warning message for rejected unsupported files per FR-ERR-001.
 */
export function formatRejectedFilesMessage(rejectedFiles: File[]): string {
  if (rejectedFiles.length === 0) return '';
  const names = rejectedFiles.map((f) => `'${f.name}'`);
  const extList = SUPPORTED_MARKDOWN_EXTENSIONS.join(', ');

  if (rejectedFiles.length === 1) {
    return `Unsupported file ${names[0]}. Only Markdown files (${extList}) are supported.`;
  }
  return `${rejectedFiles.length} unsupported files (${names.join(', ')}) were skipped. Only Markdown files (${extList}) are supported.`;
}

/**
 * Loads dropped files in batch: dispatches valid Markdown files to TabStore in order,
 * and reports unsupported files non-intrusively via notifyWarning without crashing or discarding valid files.
 */
export async function loadDroppedFiles(
  files: File[],
  options: BatchLoadOptions
): Promise<BatchLoadResult> {
  const { store, notifyWarning, notifySuccess, readFileContent } = options;

  if (!files || files.length === 0) {
    return {
      openedCount: 0,
      rejectedCount: 0,
      rejectedNames: [],
      openedFiles: [],
    };
  }

  const { validFiles, rejectedFiles } = partitionFiles(files);
  const openedFiles: string[] = [];

  // 1. Process valid files sequentially in provided order
  for (const file of validFiles) {
    try {
      // In webview or native environments, file objects may provide a full local path
      const filePath = (file as any).path || file.name;
      const parts = filePath.replace(/\\/g, '/').split('/').filter(Boolean);
      const parentDir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';

      let content = '';
      if (readFileContent) {
        content = await readFileContent(file);
      } else if (typeof file.text === 'function') {
        content = await file.text();
      }

      store.openTab({
        filePath,
        filename: file.name,
        parentDir,
        content,
        fileSizeBytes: file.size,
        status: 'ready',
      });

      openedFiles.push(filePath);
    } catch (err) {
      console.error(`Failed to read dropped file ${file.name}:`, err);
      const filePath = (file as any).path || file.name;
      store.openTab({
        filePath,
        filename: file.name,
        content: '',
        fileSizeBytes: file.size,
        status: 'error',
        errorMessage: String(err),
      });
      openedFiles.push(filePath);
    }
  }

  // 2. Report rejected files non-intrusively
  if (rejectedFiles.length > 0 && notifyWarning) {
    const warningMsg = formatRejectedFilesMessage(rejectedFiles);
    notifyWarning(warningMsg);
  }

  // 3. Optional success notification when all files were opened
  if (validFiles.length > 0 && notifySuccess && rejectedFiles.length === 0) {
    if (validFiles.length === 1) {
      notifySuccess(`Opened ${validFiles[0].name}`);
    } else {
      notifySuccess(`Opened ${validFiles.length} Markdown files`);
    }
  }

  return {
    openedCount: openedFiles.length,
    rejectedCount: rejectedFiles.length,
    rejectedNames: rejectedFiles.map((f) => f.name),
    openedFiles,
  };
}
