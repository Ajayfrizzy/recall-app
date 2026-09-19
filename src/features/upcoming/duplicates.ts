import type { UpcomingItem } from './types';

export type UpcomingFingerprintInput = Pick<UpcomingItem, 'type' | 'title' | 'location' | 'date'>;

function normalizeFingerprintText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[.,!?;:'"()[\]{}-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeFingerprintDate(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.toISOString().slice(0, 16)}Z`;
}

export function createUpcomingFingerprint(input: UpcomingFingerprintInput): string | undefined {
  const title = normalizeFingerprintText(input.title);
  const date = input.date === undefined ? undefined : normalizeFingerprintDate(input.date);
  if (!title || !date) return undefined;

  if (input.type === 'event') {
    const location = input.location ? normalizeFingerprintText(input.location) : '';
    return `event|${title}|${location}|${date}`;
  }
  return `deadline|${title}|${date}`;
}

export function findDuplicateUpcoming(
  items: UpcomingItem[],
  candidate: UpcomingFingerprintInput,
): UpcomingItem | undefined {
  const fingerprint = createUpcomingFingerprint(candidate);
  if (!fingerprint) return undefined;
  return items.find(
    (item) =>
      item.type === candidate.type &&
      (item.semanticFingerprint ?? createUpcomingFingerprint(item)) === fingerprint,
  );
}
