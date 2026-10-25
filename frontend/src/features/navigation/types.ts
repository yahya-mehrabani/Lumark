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
