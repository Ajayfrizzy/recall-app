import { createContext, useContext, useMemo, useReducer, type PropsWithChildren } from 'react';
import type { UpcomingItem } from './types';

type ContextValue = { items: UpcomingItem[]; add: (item: UpcomingItem) => void };
const UpcomingContext = createContext<ContextValue | null>(null);

function reducer(state: UpcomingItem[], item: UpcomingItem): UpcomingItem[] {
  return state.some((current) => current.id === item.id) ? state : [...state, item];
}

export function UpcomingProvider({ children }: PropsWithChildren) {
  const [items, add] = useReducer(reducer, []);
  const value = useMemo(() => ({ items, add }), [items]);
  return <UpcomingContext.Provider value={value}>{children}</UpcomingContext.Provider>;
}

export function useUpcoming() {
  const value = useContext(UpcomingContext);
  if (!value) throw new Error('useUpcoming must be used within UpcomingProvider');
  return value;
}
