import type { SavedContent } from './types';

export interface LibraryContentPreview {
  title: string;
  summary?: string;
}

export function getLibraryContentPreview(item: SavedContent): LibraryContentPreview {
  return {
    title: item.title ?? item.summary,
    summary: item.title ? item.summary : undefined,
  };
}
