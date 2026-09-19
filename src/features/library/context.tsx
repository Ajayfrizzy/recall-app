import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';
import type { LibraryItem } from './types';

type ContextValue = {
  items: LibraryItem[];
  save: (item: LibraryItem) => void;
  isSaved: (screenshotId: string, itemIndex: number) => boolean;
};

const LibraryContext = createContext<ContextValue | null>(null);

function reducer(state: LibraryItem[], item: LibraryItem): LibraryItem[] {
  return state.some((current) => current.id === item.id) ? state : [item, ...state];
}

export function LibraryProvider({ children }: PropsWithChildren) {
  const [items, save] = useReducer(reducer, []);
  const isSaved = useCallback(
    (screenshotId: string, itemIndex: number) =>
      items.some((item) => item.screenshotId === screenshotId && item.itemIndex === itemIndex),
    [items],
  );
  const value = useMemo(() => ({ items, save, isSaved }), [items, isSaved]);
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used within LibraryProvider');
  return value;
}
