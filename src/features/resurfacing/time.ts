const DAY_MS = 24 * 60 * 60 * 1000;

export type DateBucket = 'overdue' | 'today' | 'tomorrow' | '3days' | '7days' | 'later';

export function startOfLocalDay(value: number | Date = Date.now()): number {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function localCalendarIndex(value: number | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

export function daysUntil(target: number | Date, now: number | Date = Date.now()): number {
  return localCalendarIndex(target) - localCalendarIndex(now);
}

export function dateBucket(target: number | Date, now: number | Date = Date.now()): DateBucket {
  const days = daysUntil(target, now);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 3) return '3days';
  if (days <= 7) return '7days';
  return 'later';
}

export function isWithinNextDays(
  target: number | Date,
  numberOfDays: number,
  now: number | Date = Date.now(),
): boolean {
  const days = daysUntil(target, now);
  return days >= 0 && days <= numberOfDays;
}

export function nextLocalMidnight(now: number | Date = Date.now()): number {
  const date = now instanceof Date ? now : new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
}

export function localDateKey(value: number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localWeekKey(value: number | Date = Date.now()): string {
  const local = value instanceof Date ? value : new Date(value);
  const date = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}
