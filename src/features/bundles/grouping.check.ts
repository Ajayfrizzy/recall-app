import type { RecallAnalysis, RecallItem } from '@/services/ai/types';
import { ANALYSIS_VERSION, type PersistedScreenshotState } from '@/services/storage/types';
import type { ScreenshotAnalysis, ScreenshotCategory } from '@/services/understanding';
import { buildBundles, scoreBundleCompatibility } from './grouping';
import { extractBundleSignals } from './normalization';
import { reconcileBundles } from './reconciliation';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function completed(item: RecallItem, extractedText = ''): ScreenshotAnalysis {
  const category = item.type as Exclude<RecallAnalysis['category'], 'mixed'>;
  const semantic: RecallAnalysis = {
    category,
    confidence: item.confidence,
    summary: 'title' in item && item.title ? item.title : 'Related content',
    cardinality: 'single',
    items: [item],
    suggestedActions: ['keep'],
  };
  return {
    status: 'complete',
    analysisVersion: ANALYSIS_VERSION,
    extractedText,
    blocks: [],
    category: category as ScreenshotCategory,
    confidence: item.confidence,
    summary: semantic.summary,
    suggestedAction: 'keep',
    metadata: {},
    analysisSource: 'semantic',
    semantic,
  };
}

function state(
  item: RecallItem,
  extractedText = '',
  status: PersistedScreenshotState['status'] = 'pending',
): PersistedScreenshotState {
  return { status, analysis: completed(item, extractedText) };
}

const startupAbuja: RecallItem = {
  type: 'event',
  title: 'Startup Abuja Conference 2026',
  location: 'Abuja',
  dates: [],
  confidence: 0.95,
};
const startupAbujaCopy: RecallItem = { ...startupAbuja };
const sameEventElsewhere: RecallItem = { ...startupAbuja, location: 'Lagos' };

const eventSignals = extractBundleSignals(completed(startupAbuja), startupAbuja);
const matchingEventSignals = extractBundleSignals(completed(startupAbujaCopy), startupAbujaCopy);
const differentLocationSignals = extractBundleSignals(
  completed(sameEventElsewhere),
  sameEventElsewhere,
);
assert(
  scoreBundleCompatibility(eventSignals, matchingEventSignals).score >= 0.78,
  'same event title and location should pass',
);
assert(
  scoreBundleCompatibility(eventSignals, differentLocationSignals).score < 0.78,
  'same event title at a different location should stay conservative',
);

const merchantAnalysis = completed(
  {
    type: 'product',
    title: 'INGREM Fat Cat Recliner',
    source: 'INGREM',
    confidence: 0.95,
  },
  'INGREM products',
);
merchantAnalysis.semantic = {
  ...merchantAnalysis.semantic!,
  cardinality: 'multiple',
  items: [
    { type: 'product', title: 'INGREM Fat Cat Recliner', source: 'INGREM', confidence: 0.95 },
    { type: 'product', title: 'INGREM Standing Desk', source: 'INGREM', confidence: 0.95 },
  ],
};
const merchantBundles = buildBundles(
  { ingrem: { status: 'pending', analysis: merchantAnalysis } },
  1000,
);
assert(merchantBundles.length === 1, 'same-merchant products should bundle');
assert(merchantBundles[0].title === 'INGREM Products', 'merchant title should be canonical');
assert(merchantBundles[0].itemRefs.length === 2, 'multi-item screenshot refs should be retained');

const scholarshipStates: Record<string, PersistedScreenshotState> = {
  announcement: state(
    {
      type: 'deadline',
      title: 'Bright Future Scholarship announcement',
      dates: [],
      confidence: 0.9,
    },
    'Bright Future scholarship application announcement',
  ),
  requirements: state(
    {
      type: 'deadline',
      title: 'Bright Future Scholarship requirements',
      dates: [],
      confidence: 0.9,
    },
    'Bright Future scholarship application requirements',
  ),
};
const scholarshipBundles = buildBundles(scholarshipStates, 1000);
assert(scholarshipBundles.length === 1, 'strong scholarship overlap should bundle');
assert(scholarshipBundles[0].type === 'application', 'scholarship bundle should be an application');
assert(
  scholarshipBundles[0].title === 'Bright Future Scholarship Application',
  'application title should use the shared scholarship topic',
);

const travelAnalysis = completed(
  { type: 'general', summary: 'Startup Abuja hotel booking', confidence: 0.9 },
  'Startup Abuja hotel booking travel itinerary',
);
travelAnalysis.metadata.location = 'Abuja';
const eventTravel = buildBundles(
  {
    event: state(startupAbuja),
    travel: { status: 'pending', analysis: travelAnalysis },
  },
  1000,
);
assert(
  eventTravel.length === 1,
  'event and travel details with multiple shared signals should bundle',
);

const unrelated = buildBundles(
  {
    event: state(startupAbuja),
    content: state({
      type: 'content',
      summary: 'React Native performance tips',
      dates: [],
      confidence: 0.9,
    }),
  },
  1000,
);
assert(unrelated.length === 0, 'unrelated screenshots should not bundle');

const sameCityOnly = buildBundles(
  {
    startup: state(startupAbuja),
    music: state({
      type: 'event',
      title: 'Jazz Night',
      location: 'Abuja',
      dates: [],
      confidence: 0.9,
    }),
  },
  1000,
);
assert(sameCityOnly.length === 0, 'same city alone should not bundle');

const ignored = buildBundles(
  {
    first: state(startupAbuja),
    second: state(startupAbujaCopy, '', 'ignored'),
  },
  1000,
);
assert(ignored.length === 0, 'ignored screenshots should be excluded');

const dayTwo = buildBundles({ first: state(startupAbuja), second: state(startupAbujaCopy) }, 1000);
const dayThree = buildBundles(
  {
    first: state(startupAbuja),
    second: state(startupAbujaCopy),
    third: state({
      ...startupAbuja,
      dates: [{ type: 'travel', raw: 'November', precision: 'month', confidence: 0.8 }],
    }),
  },
  2000,
);
assert(
  dayTwo.length === 1 && dayThree.length === 1,
  'matching screenshots should converge on one bundle',
);
assert(dayTwo[0].id === dayThree[0].id, 'bundle ID should remain stable when a match joins');
assert(dayThree[0].screenshotIds.length === 3, 'new matching screenshot should join the bundle');

const archived = { ...dayTwo[0], status: 'archived' as const, createdAt: 500 };
const reconciled = reconcileBundles(
  dayThree,
  [archived],
  {
    first: state(startupAbuja),
    second: state(startupAbujaCopy),
    third: state(startupAbujaCopy),
  },
  2000,
);
assert(reconciled.length === 1, 'reconciliation should not duplicate a bundle');
assert(reconciled[0].status === 'archived', 'archived state should survive refresh');
assert(reconciled[0].createdAt === 500, 'createdAt should survive refresh');

assert(
  buildBundles({ missingAsset: state(startupAbuja), second: state(startupAbujaCopy) }, 1000)
    .length === 1,
  'grouping should not depend on a Gallery asset',
);

console.log('Smart Bundle grouping checks passed');
