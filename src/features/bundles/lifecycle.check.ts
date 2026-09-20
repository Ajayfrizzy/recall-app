import { generateBundleCards } from '@/features/resurfacing/generate';
import { migratePersistedState } from '@/services/storage/migrations';
import {
  applyBundleItemOverrides,
  getExcludedBundleItemRefs,
  upsertBundleItemOverride,
} from './membership';
import {
  getBundleLifecycleCounts,
  isBundleInLifecycleSection,
  restoreArchivedBundle,
} from './lifecycle';
import type { BundleItemMembershipOverride, RecallBundle } from './types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = Date.now();
const itemRefs = [0, 1, 2, 3].map((itemIndex) => ({ screenshotId: 'ingrem', itemIndex }));
const logicalBundle: RecallBundle = {
  id: 'bundle:shopping:ingrem-products:stable',
  title: 'INGREM Products',
  type: 'shopping',
  screenshotIds: ['ingrem'],
  itemRefs,
  createdAt: now - 10_000,
  updatedAt: now - 1_000,
  status: 'active',
};
const oneRemoved: BundleItemMembershipOverride[] = [
  { screenshotId: 'ingrem', itemIndex: 1, excluded: true, updatedAt: now - 500 },
];

const active = applyBundleItemOverrides(logicalBundle, []);
const activeCounts = getBundleLifecycleCounts(active, []);
assert(
  isBundleInLifecycleSection(active, activeCounts, 'active'),
  'active bundle missing from Active',
);
assert(
  !isBundleInLifecycleSection(active, activeCounts, 'removed'),
  'fully active bundle appeared in Removed',
);
assert(
  !isBundleInLifecycleSection(active, activeCounts, 'archived'),
  'active bundle appeared in Archived',
);

const partial = applyBundleItemOverrides(logicalBundle, oneRemoved);
const partialRemoved = getExcludedBundleItemRefs(logicalBundle, oneRemoved);
const partialCounts = getBundleLifecycleCounts(partial, partialRemoved);
assert(partialCounts.active === 3 && partialCounts.removed === 1, 'partial counts are incorrect');
assert(
  isBundleInLifecycleSection(partial, partialCounts, 'active') &&
    isBundleInLifecycleSection(partial, partialCounts, 'removed'),
  'partially removed bundle must appear in Active and Removed',
);

const allRemovedOverrides = itemRefs.map((ref, index) => ({
  screenshotId: ref.screenshotId,
  itemIndex: ref.itemIndex,
  excluded: true,
  updatedAt: now + index,
}));
const allRemoved = applyBundleItemOverrides(logicalBundle, allRemovedOverrides);
const allRemovedRefs = getExcludedBundleItemRefs(logicalBundle, allRemovedOverrides);
const allRemovedCounts = getBundleLifecycleCounts(allRemoved, allRemovedRefs);
assert(
  allRemovedCounts.active === 0 && allRemovedCounts.removed === 4,
  'all-removed counts are incorrect',
);
assert(
  !isBundleInLifecycleSection(allRemoved, allRemovedCounts, 'active') &&
    isBundleInLifecycleSection(allRemoved, allRemovedCounts, 'removed'),
  'all-removed bundle must appear only in Removed',
);

const archived = { ...partial, status: 'archived' as const };
const archivedWithoutRemoved = { ...active, status: 'archived' as const };
assert(
  !isBundleInLifecycleSection(archivedWithoutRemoved, activeCounts, 'active') &&
    !isBundleInLifecycleSection(archivedWithoutRemoved, activeCounts, 'removed') &&
    isBundleInLifecycleSection(archivedWithoutRemoved, activeCounts, 'archived'),
  'archived bundle must appear only in Archived',
);
assert(
  !isBundleInLifecycleSection(archived, partialCounts, 'active') &&
    !isBundleInLifecycleSection(archived, partialCounts, 'removed') &&
    isBundleInLifecycleSection(archived, partialCounts, 'archived'),
  'archived bundle with removed items must appear only in Archived',
);

const restored = restoreArchivedBundle([archived], archived.id, now + 1_000)[0];
assert(restored.status === 'active', 'restore did not reactivate archived bundle');
assert(restored.id === archived.id, 'restore changed bundle ID');
assert(restored.createdAt === archived.createdAt, 'restore changed createdAt');
assert(restored.updatedAt === now + 1_000, 'restore did not update updatedAt');
assert(restored.itemRefs.length === 3, 'restore changed active membership');
assert(
  getExcludedBundleItemRefs(logicalBundle, oneRemoved).length === 1,
  'restore changed the removed override',
);

const recoveredOverrides = upsertBundleItemOverride(allRemovedOverrides, {
  screenshotId: 'ingrem',
  itemIndex: 0,
  excluded: false,
  updatedAt: now + 10,
});
const recovered = applyBundleItemOverrides(logicalBundle, recoveredOverrides);
const recoveredCounts = getBundleLifecycleCounts(
  recovered,
  getExcludedBundleItemRefs(logicalBundle, recoveredOverrides),
);
assert(
  recoveredCounts.active === 1 && recoveredCounts.removed === 3,
  'restoring an item did not update lifecycle counts',
);
assert(recovered.id === logicalBundle.id, 'all-removed recovery changed bundle ID');

const durableState = {
  bundles: [archived],
  bundleItemOverrides: oneRemoved,
  library: [{ id: 'saved-product' }],
  upcoming: [{ id: 'deadline' }],
  actions: [{ id: 'save-action' }],
};
const restoredDurableState = {
  ...durableState,
  bundles: restoreArchivedBundle(durableState.bundles, archived.id, now + 2_000),
};
assert(restoredDurableState.library === durableState.library, 'restore changed Library');
assert(restoredDurableState.upcoming === durableState.upcoming, 'restore changed Upcoming');
assert(restoredDurableState.actions === durableState.actions, 'restore changed actions');
assert(
  restoredDurableState.bundleItemOverrides === durableState.bundleItemOverrides,
  'restore changed membership overrides',
);

assert(
  generateBundleCards([partial], now).length === 1,
  'eligible active bundle stopped resurfacing',
);
assert(generateBundleCards([archived], now).length === 0, 'archived bundle resurfaced');
assert(generateBundleCards([allRemoved], now).length === 0, 'all-removed bundle resurfaced');
assert(
  generateBundleCards([restored], now + 1_000).length === 1,
  'restored eligible bundle did not resurface',
);

const persisted = migratePersistedState({
  version: 1,
  screenshots: {},
  library: [],
  upcoming: [],
  actions: [],
  bundles: [archived],
  bundleItemOverrides: oneRemoved,
  resurfacingPreferences: [],
  semanticAnalysisAcknowledged: false,
  onboardingCompleted: true,
});
assert(persisted.bundles[0]?.status === 'archived', 'archived status did not survive restore');
assert(persisted.bundleItemOverrides[0]?.excluded, 'removed override did not survive restore');

console.log('Bundle lifecycle checks passed');
