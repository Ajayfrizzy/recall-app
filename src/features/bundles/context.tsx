import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { usePersistence } from '@/features/persistence/context';
import { buildBundles } from './grouping';
import { reconcileBundles } from './reconciliation';
import type { RecallBundle } from './types';

type ContextValue = {
  bundles: RecallBundle[];
  getBundle: (id: string) => RecallBundle | undefined;
  getBundlesForScreenshot: (screenshotId: string) => RecallBundle[];
  refreshBundles: () => Promise<void>;
  archiveBundle: (id: string) => Promise<void>;
};

const BundleContext = createContext<ContextValue | null>(null);

export function BundleProvider({ children }: PropsWithChildren) {
  const { state, updateState } = usePersistence();

  const refreshBundles = useCallback(async () => {
    await updateState((current) => {
      const derived = buildBundles(current.screenshots);
      const bundles = reconcileBundles(derived, current.bundles, current.screenshots);
      return JSON.stringify(bundles) === JSON.stringify(current.bundles)
        ? current
        : { ...current, bundles };
    });
  }, [updateState]);

  useEffect(() => {
    void refreshBundles();
  }, [state.screenshots, refreshBundles]);

  const archiveBundle = useCallback(
    async (id: string) => {
      await updateState((current) => {
        const index = current.bundles.findIndex((bundle) => bundle.id === id);
        if (index < 0 || current.bundles[index].status === 'archived') return current;
        const bundles = current.bundles.map((bundle) =>
          bundle.id === id
            ? { ...bundle, status: 'archived' as const, updatedAt: Date.now() }
            : bundle,
        );
        return { ...current, bundles };
      });
    },
    [updateState],
  );

  const value = useMemo<ContextValue>(
    () => ({
      bundles: state.bundles,
      getBundle: (id) => state.bundles.find((bundle) => bundle.id === id),
      getBundlesForScreenshot: (screenshotId) =>
        state.bundles.filter((bundle) => bundle.screenshotIds.includes(screenshotId)),
      refreshBundles,
      archiveBundle,
    }),
    [state.bundles, refreshBundles, archiveBundle],
  );
  return <BundleContext.Provider value={value}>{children}</BundleContext.Provider>;
}

export function useBundles() {
  const value = useContext(BundleContext);
  if (!value) throw new Error('useBundles must be used within BundleProvider');
  return value;
}
