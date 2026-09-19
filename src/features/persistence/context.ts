import { createContext, useContext } from 'react';
import type { PersistedRecallStateV1 } from '@/services/storage';

export type PersistedStateUpdater = (state: PersistedRecallStateV1) => PersistedRecallStateV1;

export interface PersistenceContextValue {
  state: PersistedRecallStateV1;
  hydrated: boolean;
  updateState: (updater: PersistedStateUpdater) => Promise<void>;
}

export const PersistenceContext = createContext<PersistenceContextValue | null>(null);

export function usePersistence() {
  const value = useContext(PersistenceContext);
  if (!value) throw new Error('usePersistence must be used within PersistenceProvider');
  return value;
}
