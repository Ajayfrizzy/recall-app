import type { RecallAnalysis } from '@/services/ai/types';
import { ANALYSIS_VERSION, type PersistedScreenshotState } from '@/services/storage/types';
import type { ScreenshotAnalysis } from '@/services/understanding';
import { buildBundles } from './grouping';
import {
  applyBundleItemOverrides,
  getExcludedBundleItemRefs,
  isBundleItemExcluded,
  upsertBundleItemOverride,
} from './membership';
import { reconcileBundleMembership } from './reconciliation';
import type { BundleItemMembershipOverride, RecallBundle } from './types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const itemRefs = [0, 1, 2, 3].map((itemIndex) => ({ screenshotId: 'ingrem', itemIndex }));
const logicalBundle: RecallBundle = {
  id: 'bundle:shopping:ingrem-products:stable',
  title: 'INGREM Products',
  type: 'shopping',
  screenshotIds: ['ingrem'],
  itemRefs,
  createdAt: 100,
  updatedAt: 100,
  confidence: 0.92,
  reason: 'same merchant',
  status: 'active',
};
const excluded: BundleItemMembershipOverride = {
  screenshotId: 'ingrem',
  itemIndex: 1,
  excluded: true,
  updatedAt: 200,
};

const withExcluded = applyBundleItemOverrides(logicalBundle, [excluded]);
assert(
  withExcluded.itemRefs.length === 3,
  'excluding one product should retain three active items',
);
assert(withExcluded.id === logicalBundle.id, 'membership changes must preserve the bundle ID');
assert(withExcluded.screenshotIds[0] === 'ingrem', 'partial exclusion must retain the screenshot');
assert(
  getExcludedBundleItemRefs(logicalBundle, [excluded])[0]?.itemIndex === 1,
  'excluded section should derive the removed item',
);

const restoredOverrides = upsertBundleItemOverride([excluded], {
  ...excluded,
  excluded: false,
  updatedAt: 300,
});
assert(!isBundleItemExcluded(restoredOverrides, 'ingrem', 1), 'restore should clear exclusion');
assert(
  !isBundleItemExcluded([excluded, ...restoredOverrides], 'ingrem', 1),
  'latest override should win even before storage validation',
);
assert(
  applyBundleItemOverrides(logicalBundle, restoredOverrides).itemRefs.length === 4,
  'restored item should return to active membership',
);

const allExcluded = itemRefs.map((ref, index) => ({
  screenshotId: ref.screenshotId,
  itemIndex: ref.itemIndex,
  excluded: true,
  updatedAt: 400 + index,
}));
const emptyShell = applyBundleItemOverrides(logicalBundle, allExcluded);
assert(emptyShell.itemRefs.length === 0, 'all-excluded bundle should retain an empty shell');
assert(emptyShell.id === logicalBundle.id, 'empty shell should retain bundle identity');
assert(
  getExcludedBundleItemRefs(logicalBundle, allExcluded).length === 4,
  'empty shell should expose every item for restoration',
);

const semantic: RecallAnalysis = {
  category: 'product',
  confidence: 0.95,
  summary: '4 INGREM products were detected.',
  cardinality: 'multiple',
  items: ['Chair', 'Table', 'Desk', 'Recliner'].map((title) => ({
    type: 'product' as const,
    title,
    source: 'INGREM',
    confidence: 0.95,
  })),
  suggestedActions: ['save_product'],
};
const analysis: ScreenshotAnalysis = {
  status: 'complete',
  analysisVersion: ANALYSIS_VERSION,
  extractedText: 'INGREM Chair Table Desk Recliner',
  blocks: [],
  category: 'product',
  confidence: 0.95,
  summary: semantic.summary,
  suggestedAction: 'save_product',
  metadata: {},
  analysisSource: 'semantic',
  semantic,
};
const kept: Record<string, PersistedScreenshotState> = {
  ingrem: { status: 'kept', analysis },
};
const ignored: Record<string, PersistedScreenshotState> = {
  ingrem: { status: 'ignored', analysis },
};
assert(buildBundles(ignored, 500).length === 0, 'screenshot Ignore must exclude every item');
assert(ignored.ingrem.status === 'ignored', 'bundle membership must not alter screenshot status');
assert(
  buildBundles(kept, 500, [excluded])[0]?.itemRefs.length === 3,
  'restoring screenshot status must keep explicit item exclusion',
);
assert(
  applyBundleItemOverrides(buildBundles(kept, 500)[0], [excluded]).itemRefs.length === 3,
  'refresh must not re-add an explicitly excluded item',
);

const reconciled = reconcileBundleMembership(
  [logicalBundle],
  [{ ...logicalBundle, status: 'archived', createdAt: 50 }],
  kept,
  [excluded],
  500,
);
assert(reconciled[0].status === 'archived', 'membership changes must not unarchive a bundle');
assert(reconciled[0].createdAt === 50, 'membership reconciliation must preserve createdAt');

const durableData = {
  library: [{ id: 'saved-product' }],
  upcoming: [{ id: 'reminder' }],
  actions: [{ id: 'save-action' }],
};
applyBundleItemOverrides(logicalBundle, [excluded]);
assert(durableData.library.length === 1, 'Library data must remain untouched');
assert(durableData.upcoming.length === 1, 'Upcoming data must remain untouched');
assert(durableData.actions.length === 1, 'action data must remain untouched');

console.log('Bundle membership checks passed');
