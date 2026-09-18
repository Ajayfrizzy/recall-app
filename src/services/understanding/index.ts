import { normalizeOcrText } from './clean';
import { classifyScreenshotText } from './classify';
import { extractMetadata } from './extract';
import type { ScreenshotCategory, ScreenshotUnderstanding, SuggestedAction } from './types';

export * from './types';
export { CLASSIFICATION_THRESHOLD, classifyScreenshotText } from './classify';
export { extractDate, extractMetadata, extractPrice, extractTime, extractUrl } from './extract';
export { normalizeOcrText, semanticLineScore, semanticLines } from './clean';

const ACTIONS: Record<ScreenshotCategory, SuggestedAction> = {
  event: 'add_to_calendar',
  deadline: 'create_reminder',
  product: 'save_product',
  place: 'save_place',
  content: 'read_later',
  general: 'keep',
};

function summary(
  category: ScreenshotCategory,
  metadata: ScreenshotUnderstanding['metadata'],
): string {
  if (category === 'general') return 'No clear actionable text was detected.';
  const title = metadata.title ?? 'This screenshot';
  if (category === 'event') {
    const when = metadata.date
      ? metadata.datePrecision === 'month'
        ? ` this ${metadata.date.split(' ')[0]}`
        : ` on ${metadata.date}`
      : '';
    const where = metadata.location ? ` in ${metadata.location}` : '';
    return `${title}${where}${when}.`;
  }
  const labels: Record<Exclude<ScreenshotCategory, 'event' | 'general'>, string> = {
    deadline: 'Deadline',
    product: 'Product',
    place: 'Place',
    content: 'Content',
  };
  return `${labels[category]}: ${title}.`;
}

export function understandScreenshotText(text: string, now = new Date()): ScreenshotUnderstanding {
  const cleaned = normalizeOcrText(text);
  const preliminary = extractMetadata(cleaned, 'general', now);
  const classification = classifyScreenshotText(cleaned, preliminary);
  const metadata = extractMetadata(cleaned, classification.category, now);
  const missingDetails =
    classification.category === 'event'
      ? [
          !metadata.date || metadata.datePrecision !== 'exact' ? 'Exact date' : '',
          !metadata.time ? 'Exact time' : '',
        ].filter(Boolean)
      : [];
  let confidence = classification.confidence;
  if (!metadata.title) confidence = Math.max(0.35, confidence - 0.12);
  if (classification.category === 'event' && metadata.location && metadata.date)
    confidence = Math.min(0.94, confidence + 0.06);
  if (classification.category === 'event' && (!metadata.time || metadata.datePrecision !== 'exact'))
    confidence = Math.min(0.88, confidence - 0.08);
  if (classification.category === 'general') confidence = Math.min(confidence, 0.49);
  return {
    category: classification.category,
    confidence,
    summary: summary(classification.category, metadata),
    suggestedAction: ACTIONS[classification.category],
    metadata,
    missingDetails,
  };
}
