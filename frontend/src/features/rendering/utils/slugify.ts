import React from 'react';

/**
 * Recursively extracts plain text from React nodes, arrays, and primitive values.
 */
export function extractTextFromNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join('');
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    if (props && props.children !== undefined) {
      return extractTextFromNode(props.children);
    }
  }
  return '';
}

/**
 * Converts a raw text string into a deterministic, URL-safe slug.
 * - Converts to lower case.
 * - Normalizes Unicode characters (NFC).
 * - Preserves Unicode letters and digits (\p{L}, \p{N}, \p{M}) for non-Latin scripts (e.g., Persian/Arabic/CJK).
 * - Converts spaces, underscores, and punctuation sequences to single hyphens.
 * - Strips leading/trailing hyphens.
 * - Falls back to 'heading' if the resulting slug is empty.
 */
export function slugify(input: string): string {
  if (!input) {
    return 'heading';
  }

  // Remove HTML tags if present
  let clean = input.replace(/<[^>]*>/g, '');

  // Normalize Unicode
  clean = clean.normalize('NFC').toLowerCase();

  // Replace any non-alphanumeric character (allowing Unicode letters, digits, and combining marks) with a hyphen
  // Using unicode property escapes: \p{L} (letters), \p{N} (numbers), \p{M} (marks)
  clean = clean.replace(/[^\p{L}\p{N}\p{M}-]+/gu, '-');

  // Collapse consecutive hyphens
  clean = clean.replace(/-+/g, '-');

  // Remove leading and trailing hyphens
  clean = clean.replace(/^-+|-+$/g, '');

  return clean || 'heading';
}

/**
 * Normalizes an author-specified HTML id to ensure it is URL-safe and valid.
 */
export function normalizeAuthorId(id: string): string {
  if (!id) {
    return '';
  }
  let clean = id.trim().replace(/\s+/g, '-');
  // Strip control chars or unsafe URI characters
  clean = clean.replace(/[\0-\x1F\x7F<>\"\'`]/g, '');
  return clean;
}

/**
 * Tracks slug usage within a document render pass to guarantee unique anchor IDs.
 * Duplicate headings receive incrementing numerical suffixes:
 * 'introduction' -> 'introduction-1' -> 'introduction-2'
 */
export class SlugTracker {
  private counts = new Map<string, number>();
  private existingIds = new Set<string>();

  /**
   * Generates a unique, deterministic slug for heading text or an author ID.
   *
   * @param rawText Text or React child content of the heading.
   * @param authorId Optional explicit HTML id provided on the heading tag.
   * @returns A guaranteed unique, deterministic anchor ID.
   */
  public slug(rawText: string, authorId?: string): string {
    const custom = authorId ? normalizeAuthorId(authorId) : '';
    const baseSlug = custom ? custom : slugify(rawText);

    if (!this.existingIds.has(baseSlug)) {
      this.counts.set(baseSlug, 0);
      this.existingIds.add(baseSlug);
      return baseSlug;
    }

    // Disambiguate duplicate heading
    let count = (this.counts.get(baseSlug) ?? 0) + 1;
    this.counts.set(baseSlug, count);

    let candidate = `${baseSlug}-${count}`;
    while (this.existingIds.has(candidate)) {
      count++;
      this.counts.set(baseSlug, count);
      candidate = `${baseSlug}-${count}`;
    }

    this.existingIds.add(candidate);
    return candidate;
  }

  /**
   * Checks whether an ID has already been assigned.
   */
  public has(id: string): boolean {
    return this.existingIds.has(id);
  }

  /**
   * Resets the tracker state for a new document render pass.
   */
  public reset(): void {
    this.counts.clear();
    this.existingIds.clear();
  }
}

/**
 * Factory helper for creating an isolated SlugTracker instance.
 */
export function createSlugTracker(): SlugTracker {
  return new SlugTracker();
}

export const SlugContext = React.createContext<SlugTracker | null>(null);

export function useSlugTracker(): SlugTracker | null {
  return React.useContext(SlugContext);
}
