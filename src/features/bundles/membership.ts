import type { BundleItemMembershipOverride, BundleItemRef, RecallBundle } from './types';

export function bundleItemKey(screenshotId: string, itemIndex: number): string {
  return `${screenshotId}:${itemIndex}`;
}

export function bundleItemRefIndex(ref: BundleItemRef): number {
  return ref.itemIndex ?? 0;
}

export function isBundleItemExcluded(
  overrides: BundleItemMembershipOverride[],
  screenshotId: string,
  itemIndex: number,
): boolean {
  let latest: BundleItemMembershipOverride | undefined;
  for (const override of overrides) {
    if (
      override.screenshotId === screenshotId &&
      override.itemIndex === itemIndex &&
      (!latest || override.updatedAt >= latest.updatedAt)
    ) {
      latest = override;
    }
  }
  return latest?.excluded === true;
}

export function upsertBundleItemOverride(
  overrides: BundleItemMembershipOverride[],
  next: BundleItemMembershipOverride,
): BundleItemMembershipOverride[] {
  const key = bundleItemKey(next.screenshotId, next.itemIndex);
  return [
    ...overrides.filter(
      (override) => bundleItemKey(override.screenshotId, override.itemIndex) !== key,
    ),
    next,
  ];
}

export function applyBundleItemOverrides(
  bundle: RecallBundle,
  overrides: BundleItemMembershipOverride[],
): RecallBundle {
  const itemRefs = bundle.itemRefs.filter(
    (ref) => !isBundleItemExcluded(overrides, ref.screenshotId, bundleItemRefIndex(ref)),
  );
  return {
    ...bundle,
    itemRefs,
    screenshotIds: [...new Set(itemRefs.map((ref) => ref.screenshotId))],
  };
}

export function getExcludedBundleItemRefs(
  bundle: RecallBundle,
  overrides: BundleItemMembershipOverride[],
): BundleItemRef[] {
  return bundle.itemRefs.filter((ref) =>
    isBundleItemExcluded(overrides, ref.screenshotId, bundleItemRefIndex(ref)),
  );
}
