import type { RecallActionRecord, RecallActionType } from '@/features/actions/types';
import type { RecallBundle } from '@/features/bundles/types';
import type { LibraryItem } from '@/features/library/types';
import { generateResurfacingCards } from '@/features/resurfacing/generate';
import type { RecallScreenshot, ScreenshotStatus } from '@/features/screenshots/types';
import type { UpcomingItem } from '@/features/upcoming/types';
import type { RecallItem } from '@/services/ai/types';
import { migratePersistedState } from '@/services/storage/migrations';
import { canUseCleanupBatch } from '@/features/subscription/features';
import { reconcileCleanupDeleteResult } from './deletion';
import {
  getCleanupCandidate,
  getCleanupCandidates,
  getScreenshotHandledState,
  selectSafeCandidateIds,
} from './eligibility';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const now = Date.now();

function screenshot(id: string, status: ScreenshotStatus, items?: RecallItem[]): RecallScreenshot {
  const semantic = items
    ? {
        category: items[0]?.type ?? ('general' as const),
        confidence: 0.95,
        summary: 'Analyzed screenshot',
        cardinality: items.length > 1 ? ('multiple' as const) : ('single' as const),
        items,
        suggestedActions: ['keep' as const],
      }
    : undefined;
  return {
    id,
    uri: `file:///${id}.png`,
    filename: `${id}.png`,
    width: 1080,
    height: 1920,
    creationTime: Math.floor(now / 1000),
    status,
    analysis: items
      ? {
          status: 'complete',
          analysisVersion: 1,
          extractedText: 'fixture',
          blocks: [],
          category: items[0]?.type ?? 'general',
          confidence: 0.95,
          summary: 'Analyzed screenshot',
          suggestedAction: 'keep',
          metadata: {},
          analysisSource: 'semantic',
          semantic,
        }
      : {
          status: 'idle',
          extractedText: '',
          blocks: [],
          category: 'general',
          confidence: 0,
          summary: '',
          suggestedAction: 'keep',
          metadata: {},
        },
  };
}

function completedAction(
  screenshotId: string,
  itemIndex: number,
  type: RecallActionType,
): RecallActionRecord {
  return {
    id: `${screenshotId}:${itemIndex}:${type}`,
    screenshotId,
    itemIndex,
    type,
    status: 'completed',
    createdAt: now,
  };
}

const product = (title: string): RecallItem => ({
  type: 'product',
  title,
  confidence: 0.95,
});
const pending = screenshot('pending', 'pending');
const kept = screenshot('kept', 'kept', [product('Chair')]);
const processed = screenshot('processed', 'processed');
const ignored = screenshot('ignored', 'ignored');

assert(!getCleanupCandidate(pending, []), 'untouched pending screenshot became a candidate');
assert(
  !getCleanupCandidate(kept, [completedAction('kept', 0, 'save_product')]),
  'kept screenshot became a candidate',
);
assert(getCleanupCandidate(processed, [])?.confidence === 'safe', 'processed was not safe');
assert(getCleanupCandidate(ignored, [])?.confidence === 'review', 'ignored was not review');

const singleProduct = screenshot('single-product', 'pending', [product('Chair')]);
const singleProductCandidate = getCleanupCandidate(singleProduct, [
  completedAction(singleProduct.id, 0, 'save_product'),
]);
assert(singleProductCandidate?.confidence === 'safe', 'saved single product was not safe');

const ingrem = screenshot('ingrem', 'pending', [
  product('Fat Cat Power Recliner'),
  product('Electric Floating Table'),
  product('Tilt-Adjustable Standing Desk'),
  product('Fat Bat Recliner'),
]);
const fourSaved = [0, 1, 2, 3].map((index) => completedAction('ingrem', index, 'save_product'));
const threeSaved = fourSaved.slice(0, 3);
const allHandled = getCleanupCandidate(ingrem, fourSaved);
const partiallyHandled = getCleanupCandidate(ingrem, threeSaved);
assert(allHandled?.confidence === 'safe', 'four saved products were not safe');
assert(
  allHandled.reasonLabels.includes('All 4 products saved'),
  'multi-product reason copy is incorrect',
);
assert(partiallyHandled?.confidence === 'review', 'three of four saved products was marked safe');
assert(
  getScreenshotHandledState(ingrem, threeSaved).handledItems === 3,
  'multi-item handled count is incorrect',
);

const deadline = screenshot('deadline', 'pending', [
  { type: 'deadline', title: 'Apply', dates: [], confidence: 0.9 },
]);
assert(
  getCleanupCandidate(deadline, [completedAction('deadline', 0, 'create_reminder')])?.confidence ===
    'safe',
  'scheduled deadline was not safe',
);
const event = screenshot('event', 'pending', [
  { type: 'event', title: 'Conference', dates: [], confidence: 0.9 },
]);
assert(
  getCleanupCandidate(event, [completedAction('event', 0, 'add_to_calendar')])?.confidence ===
    'safe',
  'calendar event was not safe',
);
const content = screenshot('content', 'pending', [
  { type: 'content', summary: 'Article', dates: [], confidence: 0.9 },
]);
assert(
  getCleanupCandidate(content, [completedAction('content', 0, 'read_later')])?.confidence ===
    'safe',
  'Read Later content was not safe',
);

const bundle: RecallBundle = {
  id: 'bundle:shopping:products',
  title: 'Products',
  type: 'shopping',
  screenshotIds: ['bundle-only'],
  itemRefs: [
    { screenshotId: 'bundle-only', itemIndex: 0 },
    { screenshotId: 'bundle-only', itemIndex: 1 },
  ],
  createdAt: now,
  updatedAt: now,
  status: 'active',
};
assert(
  getCleanupCandidate(screenshot('bundle-only', 'pending', [product('Desk')]), [], [bundle])
    ?.confidence === 'review',
  'bundle membership alone was marked safe',
);

const localFallback = screenshot('local-product', 'pending');
localFallback.analysis = {
  ...localFallback.analysis,
  status: 'complete',
  category: 'product',
  confidence: 0.8,
  summary: 'A product',
  suggestedAction: 'save_product',
  analysisSource: 'local',
};
assert(
  getCleanupCandidate(localFallback, [completedAction('local-product', 0, 'save_product')])
    ?.confidence === 'safe',
  'handled local fallback item was not safe',
);

const defaults = selectSafeCandidateIds(
  getCleanupCandidates([processed, ignored, ingrem], fourSaved, []),
);
assert(
  defaults.includes('processed') && defaults.includes('ingrem'),
  'safe items were not selected',
);
assert(!defaults.includes('ignored'), 'review item was selected by default');
assert(canUseCleanupBatch(3, false), 'free cleanup rejected a batch of three');
assert(!canUseCleanupBatch(4, false), 'free cleanup accepted a batch larger than three');
assert(canUseCleanupBatch(4, true), 'Pro cleanup rejected a batch larger than three');

const partialDelete = reconcileCleanupDeleteResult(
  ['one', 'two', 'three', 'four'],
  ['four'],
  false,
);
assert(
  partialDelete.deleted === 3 && partialDelete.failed[0] === 'four',
  'partial deletion result is incorrect',
);

const library: LibraryItem[] = [
  {
    id: 'content:0',
    screenshotId: 'deleted-content',
    itemIndex: 0,
    createdAt: now - 2 * 24 * 60 * 60 * 1000,
    type: 'content',
    summary: 'Saved article',
  },
];
const upcoming: UpcomingItem[] = [
  {
    id: 'deadline:0',
    screenshotId: 'deleted-deadline',
    itemIndex: 0,
    type: 'deadline',
    title: 'Scholarship deadline',
    date: now + 24 * 60 * 60 * 1000,
    createdAt: now,
  },
];
const durableActions = [completedAction('deleted-content', 0, 'read_later')];
const durableState = { library, upcoming, actions: durableActions, bundles: [bundle] };
reconcileCleanupDeleteResult(['deleted-content'], [], true);
assert(durableState.library === library, 'cleanup changed Library');
assert(durableState.upcoming === upcoming, 'cleanup changed Upcoming');
assert(durableState.actions === durableActions, 'cleanup changed actions');
assert(durableState.bundles[0] === bundle, 'cleanup changed bundles');
assert(
  getCleanupCandidates([], durableActions, [bundle]).length === 0,
  'missing source crashed cleanup',
);
assert(
  generateResurfacingCards({ library, upcoming, bundles: [bundle] }, [], now, 10).length > 0,
  'durable data stopped resurfacing after source removal',
);

const restored = migratePersistedState({
  version: 1,
  screenshots: { orphaned: { status: 'processed' } },
  library,
  upcoming,
  actions: durableActions,
  bundles: [bundle],
  bundleItemOverrides: [],
  resurfacingPreferences: [],
  semanticAnalysisAcknowledged: true,
  onboardingCompleted: true,
});
assert(restored.screenshots.orphaned.status === 'processed', 'orphan metadata was not preserved');
assert(restored.library.length === 1, 'Library did not survive persistence restore');
assert(restored.upcoming.length === 1, 'Upcoming did not survive persistence restore');
assert(restored.bundles.length === 1, 'bundle did not survive persistence restore');

console.log('Screenshot cleanup checks passed');
