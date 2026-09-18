const UI_CHROME = new Set([
  'reply',
  'forward',
  'unsubscribe',
  'to me',
  'inbox',
  'archive',
  'delete',
  'more',
  'share',
  'back',
  'menu',
  'battery',
  'wi-fi',
  'wifi',
  'lte',
  '5g',
  'chrome',
  'gmail',
]);

const STATUS_TIME = /^(?:[01]?\d|2[0-3]):[0-5]\d$/;

export function normalizeOcrText(text: string): string {
  const seen = new Set<string>();
  return text
    .replace(/[\u00a0\u200b]/g, ' ')
    .replace(/[‐‑‒–—]/g, '-')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => {
      if (!line) return false;
      const key = line.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n');
}

export function isUiChromeLine(line: string): boolean {
  const normalized = line.trim().toLocaleLowerCase();
  return UI_CHROME.has(normalized) || STATUS_TIME.test(normalized);
}

export function semanticLineScore(line: string): number {
  const normalized = line.trim();
  if (!normalized || isUiChromeLine(normalized)) return -4;
  let score = Math.min(normalized.split(/\s+/).length, 8) * 0.35;
  if (
    /\b(?:conference|meetup|summit|webinar|workshop|concert|festival|event|session)\b/i.test(
      normalized,
    )
  )
    score += 4;
  if (/\b(?:deadline|due|submit|submission|closes?|expires?|apply before)\b/i.test(normalized))
    score += 3;
  if (
    /\b(?:price|buy|shop|cart|order|sale|discount|quantity|total|specifications?)\b/i.test(
      normalized,
    )
  )
    score += 2.5;
  if (
    /\b(?:restaurant|cafe|hotel|address|street|road|avenue|location|directions)\b/i.test(normalized)
  )
    score += 2.5;
  if (/\b(?:article|thread|post|blog|video|watch|read|newsletter)\b/i.test(normalized)) score += 2;
  if (/\b(?:in|at|venue|location|address)\s+[A-Z][\w'-]+/i.test(normalized)) score += 1.5;
  if (/^\d+(?:[,.]\d+)*$/.test(normalized)) score -= 3;
  return score;
}

export function semanticLines(text: string): string[] {
  return normalizeOcrText(text)
    .split('\n')
    .filter((line) => !isUiChromeLine(line));
}
