import type { BundleItemRef, RecallBundle } from './types';

export type BundleLifecycleSection = 'active' | 'removed' | 'archived';

export interface BundleLifecycleCounts {
  active: number;
  removed: number;
  total: number;
}

export function getBundleLifecycleCounts(
  bundle: RecallBundle,
  removedItems: BundleItemRef[],
): BundleLifecycleCounts {
  const active = bundle.itemRefs.length;
  const removed = removedItems.length;
  return { active, removed, total: active + removed };
}

export function isBundleInLifecycleSection(
  bundle: RecallBundle,
  counts: BundleLifecycleCounts,
  section: BundleLifecycleSection,
): boolean {
  if (section === 'archived') return bundle.status === 'archived';
  if (bundle.status !== 'active') return false;
  return section === 'active' ? counts.active > 0 : counts.removed > 0;
}

export function restoreArchivedBundle(
  bundles: RecallBundle[],
  id: string,
  now = Date.now(),
): RecallBundle[] {
  return bundles.map((bundle) =>
    bundle.id === id && bundle.status === 'archived'
      ? { ...bundle, status: 'active' as const, updatedAt: now }
      : bundle,
  );
}
