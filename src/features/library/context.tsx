import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';
import { usePersistence } from '@/features/persistence/context';
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
  const { state: persistedState, updateState } = usePersistence();
  const [items, dispatch] = useReducer(reducer, persistedState.library);
  const save = useCallback(
    (item: LibraryItem) => {
      dispatch(item);
      void updateState((current) =>
        current.library.some((saved) => saved.id === item.id)
          ? current
          : { ...current, library: [item, ...current.library] },
      );
    },
    [updateState],
  );
  const isSaved = useCallback(
    (screenshotId: string, itemIndex: number) =>
      items.some((item) => item.screenshotId === screenshotId && item.itemIndex === itemIndex),
    [items],
  );
  const value = useMemo(() => ({ items, save, isSaved }), [items, save, isSaved]);
  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error('useLibrary must be used within LibraryProvider');
  return value;
}
