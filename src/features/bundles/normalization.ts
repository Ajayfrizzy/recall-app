import type { RecallItem } from '@/services/ai/types';
import type { ScreenshotAnalysis } from '@/services/understanding';
import type { BundleType } from './types';

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'for',
  'from',
  'in',
  'of',
  'on',
  'the',
  'to',
  'your',
  'application',
  'applications',
  'deadline',
  'details',
  'information',
]);

const APPLICATION_TERMS = new Set([
  'application',
  'apply',
  'deadline',
  'fellowship',
  'grant',
  'requirements',
  'scholarship',
]);
const TRAVEL_TERMS = new Set(['booking', 'flight', 'hotel', 'itinerary', 'travel', 'trip']);

export interface BundleSignals {
  type: BundleType;
  title: string;
  normalizedTitle: string;
  terms: string[];
  source?: string;
  normalizedSource?: string;
  location?: string;
  normalizedLocation?: string;
  date?: string;
  applicationRelated: boolean;
  travelRelated: boolean;
}

export function normalizeBundleText(value: string | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractImportantTerms(value: string | undefined): string[] {
  return [
    ...new Set(
      normalizeBundleText(value)
        .split(' ')
        .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
    ),
  ];
}

function itemTitle(item: RecallItem | undefined, analysis: ScreenshotAnalysis): string {
  if (!item) return analysis.metadata.title ?? analysis.summary;
  if ('title' in item && item.title) return item.title;
  return item.type === 'content' || item.type === 'general' ? item.summary : analysis.summary;
}

function inferType(
  item: RecallItem | undefined,
  analysis: ScreenshotAnalysis,
  title: string,
): BundleType {
  const normalized = normalizeBundleText(`${title} ${analysis.extractedText.slice(0, 500)}`);
  const terms = new Set(normalized.split(' '));
  if (item?.type === 'product' || analysis.category === 'product') return 'shopping';
  if (item?.type === 'event' || analysis.category === 'event') return 'event';
  if ([...APPLICATION_TERMS].filter((term) => terms.has(term)).length >= 2) return 'application';
  if ([...TRAVEL_TERMS].filter((term) => terms.has(term)).length >= 2) return 'travel';
  if (item?.type === 'deadline' || analysis.category === 'deadline') return 'project';
  if (item?.type === 'content' || analysis.category === 'content') return 'topic';
  return 'general';
}

export function extractBundleSignals(
  analysis: ScreenshotAnalysis,
  item?: RecallItem,
): BundleSignals {
  const title = itemTitle(item, analysis).trim() || 'Related Screenshots';
  const source =
    (item && 'source' in item ? item.source : undefined) ??
    analysis.semantic?.sourceApp ??
    analysis.metadata.organization;
  const location =
    (item?.type === 'event' ? item.location : undefined) ?? analysis.metadata.location;
  const date =
    item && 'dates' in item
      ? item.dates.find((candidate) => candidate.normalized)?.normalized
      : analysis.metadata.date;
  const searchable = normalizeBundleText(`${title} ${analysis.summary}`);
  return {
    type: inferType(item, analysis, title),
    title,
    normalizedTitle: normalizeBundleText(title),
    terms: extractImportantTerms(title),
    source,
    normalizedSource: source ? normalizeBundleText(source) : undefined,
    location,
    normalizedLocation: location ? normalizeBundleText(location) : undefined,
    date,
    applicationRelated: [...APPLICATION_TERMS].some((term) => searchable.includes(term)),
    travelRelated: [...TRAVEL_TERMS].some((term) => searchable.includes(term)),
  };
}

export function slugifyBundleText(value: string): string {
  return normalizeBundleText(value).replace(/ /g, '-').slice(0, 80) || 'related-screenshots';
}
