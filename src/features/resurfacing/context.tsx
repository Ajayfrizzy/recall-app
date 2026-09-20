import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { useBundles } from '@/features/bundles/context';
import { useLibrary } from '@/features/library/context';
import { usePersistence } from '@/features/persistence/context';
import { useUpcoming } from '@/features/upcoming/context';
import { generateResurfacingCards } from './generate';
import { upsertResurfacingPreference } from './preferences';
import { nextLocalMidnight } from './time';
import type { RecallResurfacingCard } from './types';

interface ResurfacingContextValue {
  cards: RecallResurfacingCard[];
  dismissCard: (id: string) => Promise<void>;
  snoozeCard: (id: string) => Promise<void>;
  refreshResurfacing: () => void;
}

const ResurfacingContext = createContext<ResurfacingContextValue | null>(null);

export function ResurfacingProvider({ children }: PropsWithChildren) {
  const { items: upcoming } = useUpcoming();
  const { items: library } = useLibrary();
  const { bundles } = useBundles();
  const { state, updateState } = usePersistence();
  const [now, setNow] = useState(Date.now);

  const refreshResurfacing = useCallback(() => setNow(Date.now()), []);

  useEffect(() => {
    const delay = Math.max(1_000, nextLocalMidnight() - Date.now() + 250);
    const timeout = setTimeout(refreshResurfacing, delay);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshResurfacing();
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [now, refreshResurfacing]);

  const cards = useMemo(
    () =>
      generateResurfacingCards({ upcoming, library, bundles }, state.resurfacingPreferences, now),
    [upcoming, library, bundles, state.resurfacingPreferences, now],
  );

  const dismissCard = useCallback(
    async (id: string) => {
      const dismissedAt = Date.now();
      await updateState((current) => ({
        ...current,
        resurfacingPreferences: upsertResurfacingPreference(
          current.resurfacingPreferences,
          { id, dismissedAt },
          dismissedAt,
        ),
      }));
    },
    [updateState],
  );

  const snoozeCard = useCallback(
    async (id: string) => {
      const snoozedAt = Date.now();
      await updateState((current) => ({
        ...current,
        resurfacingPreferences: upsertResurfacingPreference(
          current.resurfacingPreferences,
          { id, snoozedUntil: snoozedAt + 24 * 60 * 60 * 1000 },
          snoozedAt,
        ),
      }));
    },
    [updateState],
  );

  const value = useMemo(
    () => ({ cards, dismissCard, snoozeCard, refreshResurfacing }),
    [cards, dismissCard, snoozeCard, refreshResurfacing],
  );
  return <ResurfacingContext.Provider value={value}>{children}</ResurfacingContext.Provider>;
}

export function useResurfacing() {
  const value = useContext(ResurfacingContext);
  if (!value) throw new Error('useResurfacing must be used within ResurfacingProvider');
  return value;
}
