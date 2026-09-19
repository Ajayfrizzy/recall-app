export interface LibraryItemBase {
  id: string;
  screenshotId: string;
  itemIndex: number;
  createdAt: number;
  type: 'product' | 'place' | 'content';
  sourceApp?: string;
}

export interface SavedProduct extends LibraryItemBase {
  type: 'product';
  title: string;
  currentPrice?: string;
  originalPrice?: string;
  source?: string;
}

export interface SavedPlace extends LibraryItemBase {
  type: 'place';
  title: string;
  address?: string;
  source?: string;
}

export interface SavedContent extends LibraryItemBase {
  type: 'content';
  title?: string;
  author?: string;
  source?: string;
  summary: string;
  publishedDate?: string;
}

export type LibraryItem = SavedProduct | SavedPlace | SavedContent;
