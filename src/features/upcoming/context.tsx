import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';
import { usePersistence } from '@/features/persistence/context';
import type { UpcomingItem } from './types';

type ContextValue = { items: UpcomingItem[]; add: (item: UpcomingItem) => Promise<void> };
const UpcomingContext = createContext<ContextValue | null>(null);

function reducer(state: UpcomingItem[], item: UpcomingItem): UpcomingItem[] {
  return state.some((current) => current.id === item.id) ? state : [...state, item];
}

export function UpcomingProvider({ children }: PropsWithChildren) {
  const { state: persistedState, updateState } = usePersistence();
  const [items, dispatch] = useReducer(reducer, persistedState.upcoming);
  const add = useCallback(
    async (item: UpcomingItem) => {
      await updateState((current) =>
        current.upcoming.some((saved) => saved.id === item.id)
          ? current
          : { ...current, upcoming: [...current.upcoming, item] },
      );
      dispatch(item);
    },
    [updateState],
  );
  const value = useMemo(() => ({ items, add }), [items, add]);
  return <UpcomingContext.Provider value={value}>{children}</UpcomingContext.Provider>;
}

export function useUpcoming() {
  const value = useContext(UpcomingContext);
  if (!value) throw new Error('useUpcoming must be used within UpcomingProvider');
  return value;
}
