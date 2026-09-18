import { semanticLines } from './clean';
import type { ScreenshotMetadata, ScreenshotCategory } from './types';

// A single weak keyword reaches 0.56; anything below that falls back to general.
export const CLASSIFICATION_THRESHOLD = 0.55;

const INDICATORS: Record<Exclude<ScreenshotCategory, 'general'>, RegExp> = {
  event:
    /\b(?:event|meetup|conference|webinar|workshop|concert|session|starts?|venue|register|ticket)\b/gi,
  deadline:
    /\b(?:deadline|due|submit|submission|closes?|closing date|apply before|applications close|expires?|expiry)\b/gi,
  product: /\b(?:price|buy|shop|cart|order|sale|discount|\d+%\s*off)\b/gi,
  place:
    /\b(?:restaurant|cafe|café|hotel|address|street|road|avenue|location|directions|visit)\b/gi,
  content: /\b(?:article|thread|post|blog|video|watch|read|newsletter)\b/gi,
};

const PRIORITY: Exclude<ScreenshotCategory, 'general'>[] = [
  'deadline',
  'event',
  'product',
  'place',
  'content',
];

export interface Classification {
  category: ScreenshotCategory;
  confidence: number;
}

function keywordScore(text: string, pattern: RegExp): number {
  return Math.min(text.match(pattern)?.length ?? 0, 3) * 2;
}

export function classifyScreenshotText(text: string, metadata: ScreenshotMetadata): Classification {
  if (text.trim().length < 3) return { category: 'general', confidence: 0.1 };

  const semanticText = semanticLines(text).join('\n');
  const scores = Object.fromEntries(
    PRIORITY.map((category) => [category, keywordScore(semanticText, INDICATORS[category])]),
  ) as Record<Exclude<ScreenshotCategory, 'general'>, number>;

  if (metadata.date) {
    scores.event += 1;
    scores.deadline += 1.5;
  }
  if (metadata.time) scores.event += 1.5;
  if (metadata.location) {
    scores.event += 0.5;
    scores.place += 1.5;
  }
  if (metadata.price) scores.product += 3;
  if (metadata.url) scores.content += 0.5;
  if (
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(
      semanticText,
    )
  ) {
    scores.event += 0.8;
    scores.deadline += 0.8;
  }
  if (/\b(?:in|at)\s+[A-Z][A-Za-z]+/i.test(semanticText)) scores.event += 0.5;

  let category = PRIORITY[0];
  for (const candidate of PRIORITY.slice(1)) {
    if (scores[candidate] > scores[category]) category = candidate;
  }

  const confidence = Math.min(0.94, 0.35 + scores[category] * 0.11);
  if (confidence < CLASSIFICATION_THRESHOLD) {
    return { category: 'general', confidence: Math.min(confidence, 0.49) };
  }
  return { category, confidence };
}
