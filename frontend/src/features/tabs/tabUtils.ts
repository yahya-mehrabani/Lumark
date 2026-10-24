import { TabItem } from './types';

/**
 * Normalizes a file path by converting backslashes to forward slashes,
 * collapsing redundant slashes, and stripping trailing slashes.
 */
export function normalizePath(rawPath: string): string {
  if (!rawPath) return '';
  let p = rawPath.trim().replace(/\\/g, '/');
  // Collapse multiple consecutive slashes, except keep leading /
  p = p.replace(/\/+/g, '/');
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  return p;
}

/**
 * Compares two paths for equality considering platform differences.
 * Windows drive letter paths are case-insensitive.
 * POSIX / Linux paths are case-sensitive.
 */
export function arePathsEqual(pathA: string, pathB: string): boolean {
  const normA = normalizePath(pathA);
  const normB = normalizePath(pathB);

  // Check if either appears to be a Windows path with drive letter (e.g. C:/...)
  const isWindowsA = /^[a-zA-Z]:\//.test(normA);
  const isWindowsB = /^[a-zA-Z]:\//.test(normB);

  if (isWindowsA || isWindowsB) {
    return normA.toLowerCase() === normB.toLowerCase();
  }

  return normA === normB;
}

/**
 * Extracts filename and immediate parent directory from a path.
 */
export function extractPathDetails(rawPath: string): { filename: string; parentDir: string } {
  const normalized = normalizePath(rawPath);
  if (!normalized) {
    return { filename: 'Untitled.md', parentDir: '' };
  }

  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) {
    return { filename: 'Untitled.md', parentDir: '' };
  }

  const filename = parts[parts.length - 1];
  const parentDir = parts.length > 1 ? parts[parts.length - 2] : '';

  return { filename, parentDir };
}

/**
 * Disambiguates tab titles when multiple tabs share identical filenames.
 * If unique: displayTitle = filename
 * If collision: displayTitle = `${filename} — ${parentDir}`
 */
export function disambiguateTitles(tabs: TabItem[]): TabItem[] {
  const filenameCounts = new Map<string, number>();

  for (const tab of tabs) {
    const fn = tab.filename;
    filenameCounts.set(fn, (filenameCounts.get(fn) || 0) + 1);
  }

  return tabs.map((tab) => {
    const count = filenameCounts.get(tab.filename) || 0;
    let displayTitle = tab.filename;

    if (count > 1) {
      if (tab.parentDir) {
        displayTitle = `${tab.filename} — ${tab.parentDir}`;
      } else {
        displayTitle = `${tab.filename} (${tab.filePath})`;
      }
    }

    return {
      ...tab,
      displayTitle,
    };
  });
}
