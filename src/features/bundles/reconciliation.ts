import type { PersistedScreenshotState } from '@/services/storage/types';
import type { RecallBundle } from './types';

function refsEqual(left: RecallBundle, right: RecallBundle): boolean {
  return JSON.stringify(left.itemRefs) === JSON.stringify(right.itemRefs);
}

export function reconcileBundles(
  derived: RecallBundle[],
  existing: RecallBundle[],
  screenshots: Record<string, PersistedScreenshotState>,
  now = Date.now(),
): RecallBundle[] {
  const current = new Map(existing.map((bundle) => [bundle.id, bundle]));
  const reconciled = derived.map((bundle) => {
    const previous = current.get(bundle.id);
    if (!previous) return bundle;
    const unchanged =
      previous.title === bundle.title &&
      previous.type === bundle.type &&
      previous.reason === bundle.reason &&
      previous.confidence === bundle.confidence &&
      refsEqual(previous, bundle);
    return {
      ...bundle,
      createdAt: previous.createdAt,
      updatedAt: unchanged ? previous.updatedAt : now,
      status: previous.status,
    };
  });

  for (const bundle of existing) {
    if (bundle.status !== 'archived' || currentBundleExists(reconciled, bundle.id)) continue;
    const itemRefs = bundle.itemRefs.filter(
      (ref) => screenshots[ref.screenshotId]?.status !== 'ignored',
    );
    reconciled.push({
      ...bundle,
      itemRefs,
      screenshotIds: [...new Set(itemRefs.map((ref) => ref.screenshotId))],
      updatedAt: itemRefs.length === bundle.itemRefs.length ? bundle.updatedAt : now,
    });
  }
  return reconciled.sort((left, right) => left.id.localeCompare(right.id));
}

function currentBundleExists(bundles: RecallBundle[], id: string): boolean {
  return bundles.some((bundle) => bundle.id === id);
}
