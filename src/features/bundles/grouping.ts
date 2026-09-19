import type { PersistedScreenshotState } from '@/services/storage/types';
import type { RecallItem } from '@/services/ai/types';
import {
  extractBundleSignals,
  normalizeBundleText,
  slugifyBundleText,
  type BundleSignals,
} from './normalization';
import type { BundleItemRef, BundleType, RecallBundle } from './types';

export const BUNDLE_COMPATIBILITY_THRESHOLD = 0.78;

type ScreenshotInput = { id: string; state: PersistedScreenshotState };

export interface BundleCandidate extends BundleItemRef {
  signals: BundleSignals;
}

export interface CompatibilityResult {
  score: number;
  reasons: string[];
}

const COMPATIBLE_TYPES = new Set([
  'application:project',
  'event:travel',
  'project:application',
  'travel:event',
]);

function termSimilarity(left: string[], right: string[]): number {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  const rightSet = new Set(right);
  return left.filter((term) => rightSet.has(term)).length / union.size;
}

function sharedTerms(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((term) => rightSet.has(term));
}

function datesAreClose(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right) return false;
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime))
    return left.slice(0, 7) === right.slice(0, 7);
  return Math.abs(leftTime - rightTime) <= 45 * 24 * 60 * 60 * 1000;
}

export function scoreBundleCompatibility(
  left: BundleSignals,
  right: BundleSignals,
): CompatibilityResult {
  let score = 0;
  const reasons: string[] = [];
  const shared = sharedTerms(left.terms, right.terms);
  const similarity = termSimilarity(left.terms, right.terms);
  const sameType = left.type === right.type;
  const compatibleType = sameType || COMPATIBLE_TYPES.has(`${left.type}:${right.type}`);

  if (left.normalizedTitle && left.normalizedTitle === right.normalizedTitle) {
    score += 0.58;
    reasons.push('same title');
  } else if (similarity >= 0.75 && shared.length >= 2) {
    score += 0.5;
    reasons.push('strong title overlap');
  } else if (similarity >= 0.5 && shared.length >= 1) {
    score += 0.35;
    reasons.push('title overlap');
  }

  if (shared.length >= 2) {
    score += 0.25;
    reasons.push('shared important terms');
  } else if (shared.length === 1) {
    score += 0.12;
    reasons.push(`shared topic: ${shared[0]}`);
  }
  if (sameType) {
    score += 0.1;
    reasons.push('compatible category');
  }
  if (left.normalizedLocation && left.normalizedLocation === right.normalizedLocation) {
    score += 0.12;
    reasons.push('same location');
  } else if (left.normalizedLocation && right.normalizedLocation) {
    score -= 0.3;
    reasons.push('different locations');
  }
  if (left.applicationRelated && right.applicationRelated && compatibleType) {
    score += 0.22;
    reasons.push('same application topic');
  }
  if (datesAreClose(left.date, right.date)) {
    score += 0.05;
    reasons.push('nearby dates');
  }
  const eventTravelPair =
    (left.type === 'event' && right.type === 'travel') ||
    (left.type === 'travel' && right.type === 'event');
  if (
    eventTravelPair &&
    shared.length >= 2 &&
    left.normalizedLocation &&
    left.normalizedLocation === right.normalizedLocation
  ) {
    score += 0.42;
    reasons.push('event and travel details align');
  }

  // Source app alone is intentionally not scored. Merchant grouping is handled separately.
  return { score: Math.max(0, Math.min(1, score)), reasons };
}

function candidatesForScreenshot(input: ScreenshotInput): BundleCandidate[] {
  const analysis = input.state.analysis;
  if (input.state.status === 'ignored' || analysis?.status !== 'complete') return [];
  const semanticItems = analysis.semantic?.items;
  if (semanticItems?.length) {
    return semanticItems
      .map((item, itemIndex) => ({
        screenshotId: input.id,
        itemIndex,
        signals: extractBundleSignals(analysis, item),
      }))
      .filter((candidate) => candidate.signals.type !== 'general');
  }
  return [{ screenshotId: input.id, itemIndex: 0, signals: extractBundleSignals(analysis) }];
}

function refKey(ref: BundleItemRef): string {
  return `${ref.screenshotId}:${ref.itemIndex ?? ''}`;
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function candidateTitle(candidates: BundleCandidate[], type: BundleType): string {
  if (type === 'shopping') {
    const source = candidates.map((candidate) => candidate.signals.source).find(Boolean);
    if (source) return `${source} Products`;
  }
  if (
    type === 'application' &&
    candidates.every((candidate) => candidate.signals.terms.includes('scholarship'))
  ) {
    const common = candidates[0].signals.terms.filter((term) =>
      candidates.every((candidate) => candidate.signals.terms.includes(term)),
    );
    const subject = common.length ? common : ['scholarship'];
    return `${subject.map((term) => term[0].toUpperCase() + term.slice(1)).join(' ')} Application`;
  }
  const ranked = [...candidates].sort((left, right) => {
    const typePriority = (candidate: BundleCandidate) =>
      candidate.signals.type === 'event' ? 3 : candidate.signals.type === 'application' ? 2 : 1;
    return (
      typePriority(right) - typePriority(left) ||
      right.signals.terms.length - left.signals.terms.length ||
      right.signals.title.length - left.signals.title.length
    );
  });
  const title = ranked[0]?.signals.title || 'Related Screenshots';
  return title;
}

function bundleType(candidates: BundleCandidate[]): BundleType {
  const types = candidates.map((candidate) => candidate.signals.type);
  if (types.every((type) => type === 'shopping')) return 'shopping';
  if (types.includes('event')) return 'event';
  if (types.includes('application')) return 'application';
  if (types.includes('travel')) return 'travel';
  if (types.includes('project')) return 'project';
  if (types.includes('topic')) return 'topic';
  return 'general';
}

function toBundle(
  candidates: BundleCandidate[],
  confidence: number,
  reasons: string[],
  now: number,
): RecallBundle {
  const sorted = [...candidates].sort((left, right) => refKey(left).localeCompare(refKey(right)));
  const type = bundleType(sorted);
  const title = candidateTitle(sorted, type);
  const identitySignal =
    type === 'shopping'
      ? sorted[0]?.signals.normalizedSource
      : sorted.find((candidate) => candidate.signals.normalizedLocation)?.signals
          .normalizedLocation;
  const identity = `${type}:${normalizeBundleText(title)}:${identitySignal ?? ''}`;
  const baseId = `bundle:${type}:${slugifyBundleText(title)}`;
  const screenshotIds = [...new Set(sorted.map((candidate) => candidate.screenshotId))];
  return {
    id: `${baseId}:${stableHash(identity)}`,
    title,
    type,
    screenshotIds,
    itemRefs: sorted.map(({ screenshotId, itemIndex }) => ({ screenshotId, itemIndex })),
    createdAt: now,
    updatedAt: now,
    confidence,
    reason: [...new Set(reasons)].join(' + '),
    status: 'active',
  };
}

function buildMerchantBundles(
  candidates: BundleCandidate[],
  now: number,
): {
  bundles: RecallBundle[];
  used: Set<string>;
} {
  const groups = new Map<string, BundleCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.signals.type !== 'shopping' || !candidate.signals.normalizedSource) continue;
    const group = groups.get(candidate.signals.normalizedSource) ?? [];
    group.push(candidate);
    groups.set(candidate.signals.normalizedSource, group);
  }
  const used = new Set<string>();
  const bundles: RecallBundle[] = [];
  for (const group of groups.values()) {
    const unique = [...new Map(group.map((candidate) => [refKey(candidate), candidate])).values()];
    if (unique.length < 2) continue;
    unique.forEach((candidate) => used.add(refKey(candidate)));
    bundles.push(toBundle(unique, 0.92, ['same merchant'], now));
  }
  return { bundles, used };
}

export function buildBundles(
  screenshots: Record<string, PersistedScreenshotState>,
  now = Date.now(),
): RecallBundle[] {
  const candidates = Object.entries(screenshots)
    .flatMap(([id, state]) => candidatesForScreenshot({ id, state }))
    .sort((left, right) => refKey(left).localeCompare(refKey(right)));
  const merchant = buildMerchantBundles(candidates, now);
  const remaining = candidates.filter((candidate) => !merchant.used.has(refKey(candidate)));
  const clusters: Array<{ candidates: BundleCandidate[]; scores: number[]; reasons: string[] }> =
    [];

  for (const candidate of remaining) {
    let best:
      { cluster: (typeof clusters)[number]; compatibility: CompatibilityResult } | undefined;
    for (const cluster of clusters) {
      const comparisons = cluster.candidates.map((member) =>
        scoreBundleCompatibility(member.signals, candidate.signals),
      );
      const compatibility = comparisons.sort((a, b) => b.score - a.score)[0];
      const allConservative = comparisons.every(
        (result) => result.score >= BUNDLE_COMPATIBILITY_THRESHOLD - 0.08,
      );
      if (
        compatibility.score >= BUNDLE_COMPATIBILITY_THRESHOLD &&
        allConservative &&
        (!best || compatibility.score > best.compatibility.score)
      ) {
        best = { cluster, compatibility };
      }
    }
    if (best) {
      best.cluster.candidates.push(candidate);
      best.cluster.scores.push(best.compatibility.score);
      best.cluster.reasons.push(...best.compatibility.reasons);
    } else {
      clusters.push({ candidates: [candidate], scores: [], reasons: [] });
    }
  }

  const grouped = clusters
    .filter((cluster) => cluster.candidates.length >= 2)
    .map((cluster) =>
      toBundle(cluster.candidates, Math.min(...cluster.scores), cluster.reasons, now),
    );
  return [...merchant.bundles, ...grouped].sort((left, right) => left.id.localeCompare(right.id));
}

export function suggestBundleTitle(bundle: Pick<RecallBundle, 'title'>): string {
  return bundle.title.trim() || 'Related Screenshots';
}

export function summarizeBundle(bundle: RecallBundle): string {
  if (bundle.type === 'shopping') {
    return `${bundle.itemRefs.length} products from ${bundle.title.replace(/ Products$/i, '')}.`;
  }
  const noun = bundle.screenshotIds.length === 1 ? 'screenshot' : 'screenshots';
  return `${bundle.screenshotIds.length} ${noun} related to ${bundle.title}.`;
}
