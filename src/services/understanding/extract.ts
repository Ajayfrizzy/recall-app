import { isUiChromeLine, semanticLineScore, semanticLines } from './clean';
import type { ScreenshotCategory, ScreenshotMetadata } from './types';

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};
const MONTH_PATTERN = Object.keys(MONTHS).join('|');
const MONTH_DATE = new RegExp(
  `\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,
  'i',
);
const DAY_DATE = new RegExp(
  `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})(?:,?\\s+(\\d{4}))?\\b`,
  'i',
);
const MONTH_ONLY = new RegExp(`\\b(${MONTH_PATTERN})(?:\\s+(\\d{4}))?\\b`, 'i');
const ISO_DATE = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
const NUMERIC_DATE = /\b\d{1,2}[/.]\d{1,2}[/.](?:\d{2}|\d{4})\b/;
const TIME_PATTERN =
  /\b(?:(0?[1-9]|1[0-2])(?::([0-5]\d))?\s*([ap])\.?m\.?|([01]?\d|2[0-3]):([0-5]\d))\b/i;
const PRICE_PATTERN =
  /(?:₦|\$|£|€)\s?\d[\d,.]*(?:\.\d{2})?|\b(?:NGN|USD|GBP|EUR)\s?\d[\d,.]*(?:\.\d{2})?/i;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>()]+/i;
const EVENT_WORD =
  /\b(?:conference|meetup|summit|webinar|workshop|concert|festival|event|session|launch)\b/i;
const CONTEXT_LOCATION = /\b(?:in|at)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\b/;
const LABEL_LOCATION = /\b(?:venue|location|address)\s*[:\-]\s*(.+)/i;

function validIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : null;
}

export interface ExtractedDate {
  value: string;
  raw: string;
  precision: 'exact' | 'month' | 'year';
}

export function extractDate(text: string, now = new Date()): ExtractedDate | undefined {
  const iso = text.match(ISO_DATE);
  if (iso) {
    const value = validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    if (value) return { value, raw: iso[0], precision: 'exact' };
  }
  const monthDate = text.match(MONTH_DATE);
  if (monthDate) {
    const value = validIsoDate(
      Number(monthDate[3] ?? now.getFullYear()),
      MONTHS[monthDate[1].toLowerCase()],
      Number(monthDate[2]),
    );
    if (value) return { value, raw: monthDate[0], precision: 'exact' };
  }
  const dayDate = text.match(DAY_DATE);
  if (dayDate) {
    const value = validIsoDate(
      Number(dayDate[3] ?? now.getFullYear()),
      MONTHS[dayDate[2].toLowerCase()],
      Number(dayDate[1]),
    );
    if (value) return { value, raw: dayDate[0], precision: 'exact' };
  }
  const month = text.match(MONTH_ONLY);
  if (month)
    return {
      value: `${month[1][0].toUpperCase()}${month[1].slice(1).toLowerCase()} ${month[2] ?? now.getFullYear()}`,
      raw: month[0],
      precision: 'month',
    };
  const numeric = text.match(NUMERIC_DATE);
  return numeric ? { value: numeric[0], raw: numeric[0], precision: 'exact' } : undefined;
}

export function extractTime(text: string, allowUnlabelled = false): string | undefined {
  if (!allowUnlabelled && !/\b(?:time|starts?|begins?|at)\b/i.test(text)) return undefined;
  const match = text.match(TIME_PATTERN);
  if (!match) return undefined;
  if (match[4] !== undefined) return `${String(Number(match[4])).padStart(2, '0')}:${match[5]}`;
  let hour = Number(match[1]);
  if (match[3].toLowerCase() === 'p' && hour !== 12) hour += 12;
  if (match[3].toLowerCase() === 'a' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${match[2] ?? '00'}`;
}

export function extractPrice(text: string): Pick<ScreenshotMetadata, 'price' | 'currency'> {
  const match = text.match(PRICE_PATTERN);
  if (!match || !/\b(?:price|cost|total|ticket|buy|cart|sale|discount)\b/i.test(text)) return {};
  const price = match[0].trim();
  const marker = price.match(/^(₦|\$|£|€|NGN|USD|GBP|EUR)/i)?.[0].toUpperCase();
  const currency: Record<string, string> = {
    '₦': 'NGN',
    $: 'USD',
    '£': 'GBP',
    '€': 'EUR',
    NGN: 'NGN',
    USD: 'USD',
    GBP: 'GBP',
    EUR: 'EUR',
  };
  return { price, currency: marker ? currency[marker] : undefined };
}

export function extractUrl(text: string): string | undefined {
  return text.match(URL_PATTERN)?.[0].replace(/[.,;:!?]+$/, '');
}

function cleanTitle(line: string, date?: ExtractedDate): string {
  return line
    .replace(date?.raw ?? '', '')
    .replace(TIME_PATTERN, '')
    .replace(PRICE_PATTERN, '')
    .replace(URL_PATTERN, '')
    .replace(/^[\s:|,-]+|[\s:|,-]+$/g, '')
    .trim();
}
function eventTitle(lines: string[], date?: ExtractedDate): string | undefined {
  const candidates = lines
    .filter(
      (line) =>
        EVENT_WORD.test(line) && !/^(?:to attend|flights|hotel|reply|forward)\b/i.test(line),
    )
    .map((line) => cleanTitle(line, date));
  const best = candidates.sort((a, b) => {
    const weight = (value: string) =>
      /(conference|summit|meetup|webinar|workshop|concert|festival)/i.test(value) ? 5 : 0;
    return weight(b) + semanticLineScore(b) - weight(a) - semanticLineScore(a);
  })[0];
  return best?.replace(/^(?:vip trip to|trip to|join us for|invitation to)\s+/i, '').trim();
}
function genericTitle(lines: string[], date?: ExtractedDate): string | undefined {
  return lines
    .filter(
      (line) =>
        !/^(?:reply|forward|add to cart|buy now|quantity|specifications?|share|more|delete|archive)$/i.test(
          line,
        ),
    )
    .map((line) => cleanTitle(line, date))
    .filter(
      (line) =>
        line.length >= 4 &&
        !isUiChromeLine(line) &&
        !TIME_PATTERN.test(line) &&
        !/^\d+[,.\d]*$/.test(line),
    )
    .sort((a, b) => semanticLineScore(b) - semanticLineScore(a))[0];
}
export function extractLocation(text: string): string | undefined {
  const labelled = text.match(LABEL_LOCATION)?.[1]?.trim();
  if (labelled && !isUiChromeLine(labelled)) return labelled;
  const matches = [...text.matchAll(new RegExp(CONTEXT_LOCATION.source, 'gi'))];
  return matches.at(-1)?.[1];
}

export function extractMetadata(
  text: string,
  category: ScreenshotCategory,
  now = new Date(),
): ScreenshotMetadata {
  const lines = semanticLines(text);
  const cleaned = lines.join('\n');
  const date = extractDate(cleaned, now);
  const metadata: ScreenshotMetadata = {
    date: date?.value,
    datePrecision: date?.precision,
    url: extractUrl(cleaned),
  };
  if (category === 'event') {
    metadata.title = eventTitle(lines, date) ?? genericTitle(lines, date);
    metadata.time = extractTime(cleaned);
    metadata.location = extractLocation(cleaned);
  } else if (category === 'deadline') {
    metadata.title = genericTitle(lines, date);
    metadata.title = metadata.title?.replace(/\s+(?:applications?)\s+close.*$/i, ' application');
    metadata.time = extractTime(cleaned);
  } else if (category === 'product') {
    metadata.title = genericTitle(
      lines.filter(
        (line) => !/\b(?:add to cart|quantity|specifications?|price|sale|discount)\b/i.test(line),
      ),
      date,
    );
    Object.assign(metadata, extractPrice(cleaned));
  } else if (category === 'place') {
    metadata.title = genericTitle(
      lines.filter((line) => !/^\d+ .*(?:street|road|avenue|lane|drive)/i.test(line)),
      date,
    );
    metadata.location = extractLocation(cleaned);
  } else if (category === 'content') metadata.title = genericTitle(lines, date);
  else return {};
  return metadata;
}
