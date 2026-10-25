export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TocItem {
  id: string;
  text: string;
  level: HeadingLevel;
}

export interface TocNode extends TocItem {
  children: TocNode[];
}

export interface TableOfContentsData {
  items: TocItem[];
  tree: TocNode[];
  hasHeadings: boolean;
}

export interface SearchMatch {
  index: number;
  node: Text;
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface SearchOptions {
  caseSensitive?: boolean;
}

export interface SearchState {
  query: string;
  isOpen: boolean;
  currentIndex: number;
  totalMatches: number;
  caseSensitive: boolean;
}
