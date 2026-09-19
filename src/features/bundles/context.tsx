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
import { reconcileBundleMembership } from './reconciliation';
import {
  bundleItemRefIndex,
  getExcludedBundleItemRefs,
  isBundleItemExcluded,
  upsertBundleItemOverride,
} from './membership';
import type { BundleItemRef, RecallBundle } from './types';

type ContextValue = {
  bundles: RecallBundle[];
  getBundle: (id: string) => RecallBundle | undefined;
  getBundlesForScreenshot: (screenshotId: string) => RecallBundle[];
  refreshBundles: () => Promise<void>;
  archiveBundle: (id: string) => Promise<void>;
  isItemExcluded: (screenshotId: string, itemIndex: number) => boolean;
  excludeItem: (screenshotId: string, itemIndex: number) => Promise<void>;
  restoreItem: (screenshotId: string, itemIndex: number) => Promise<void>;
  getExcludedItemsForBundle: (bundleId: string) => BundleItemRef[];
};

const BundleContext = createContext<ContextValue | null>(null);

export function BundleProvider({ children }: PropsWithChildren) {
  const { state, updateState } = usePersistence();

  const logicalBundles = useMemo(() => buildBundles(state.screenshots), [state.screenshots]);

  const reconcileCurrent = useCallback((current: typeof state) => {
    const logical = buildBundles(current.screenshots);
    return reconcileBundleMembership(
      logical,
      current.bundles,
      current.screenshots,
      current.bundleItemOverrides,
    );
  }, []);

  const refreshBundles = useCallback(async () => {
    await updateState((current) => {
      const bundles = reconcileCurrent(current);
      return JSON.stringify(bundles) === JSON.stringify(current.bundles)
        ? current
        : { ...current, bundles };
    });
  }, [reconcileCurrent, updateState]);

  useEffect(() => {
    void refreshBundles();
  }, [state.screenshots, state.bundleItemOverrides, refreshBundles]);

  const setItemExcluded = useCallback(
    async (screenshotId: string, itemIndex: number, excluded: boolean) => {
      await updateState((current) => {
        const bundleItemOverrides = upsertBundleItemOverride(current.bundleItemOverrides, {
          screenshotId,
          itemIndex,
          excluded,
          updatedAt: Date.now(),
        });
        const withOverride = { ...current, bundleItemOverrides };
        return { ...withOverride, bundles: reconcileCurrent(withOverride) };
      });
    },
    [reconcileCurrent, updateState],
  );

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
      isItemExcluded: (screenshotId, itemIndex) =>
        isBundleItemExcluded(state.bundleItemOverrides, screenshotId, itemIndex),
      excludeItem: (screenshotId, itemIndex) => setItemExcluded(screenshotId, itemIndex, true),
      restoreItem: (screenshotId, itemIndex) => setItemExcluded(screenshotId, itemIndex, false),
      getExcludedItemsForBundle: (bundleId) => {
        const logical = logicalBundles.find((bundle) => bundle.id === bundleId);
        return logical
          ? getExcludedBundleItemRefs(logical, state.bundleItemOverrides).map((ref) => ({
              ...ref,
              itemIndex: bundleItemRefIndex(ref),
            }))
          : [];
      },
    }),
    [
      state.bundles,
      state.bundleItemOverrides,
      logicalBundles,
      refreshBundles,
      archiveBundle,
      setItemExcluded,
    ],
  );
  return <BundleContext.Provider value={value}>{children}</BundleContext.Provider>;
}

export function useBundles() {
  const value = useContext(BundleContext);
  if (!value) throw new Error('useBundles must be used within BundleProvider');
  return value;
}
