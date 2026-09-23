import type { RecallDate } from '@/services/ai/types';
import type { ReminderTiming } from './types';

export function getReminderDate(deadline: Date, timing: ReminderTiming): Date {
  const offsets: Record<ReminderTiming, number> = {
    at_deadline: 0,
    one_hour_before: 60 * 60 * 1000,
    one_day_before: 24 * 60 * 60 * 1000,
  };
  return new Date(deadline.getTime() - offsets[timing]);
}

export function parseExactDate(date: string, time: string): Date | null {
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;
  const value = new Date(year, month - 1, day, hour, minute);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) {
    return null;
  }
  return value;
}

export function validateDateAction(
  type: 'event' | 'deadline',
  exactDate: Date,
  reminderTiming: ReminderTiming | undefined,
  now = new Date(),
): string | undefined {
  if (type !== 'deadline') return undefined;
  if (exactDate.getTime() <= now.getTime()) {
    return 'This deadline has already passed. Choose a future deadline.';
  }
  if (reminderTiming && getReminderDate(exactDate, reminderTiming).getTime() <= now.getTime()) {
    return 'That reminder time has already passed. Choose a later deadline or reminder time.';
  }
  return undefined;
}

function localDateFromNormalized(value: string): Date | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return undefined;
  const [, year, month, day, hour = '0', minute = '0'] = match;
  const parsed = new Date(+year, +month - 1, +day, +hour, +minute);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function formatRecallDate(date: RecallDate): string {
  if (!date.normalized) return date.raw;
  if (/^\d{4}-\d{2}$/.test(date.normalized)) {
    const [year, month] = date.normalized.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    });
  }
  if (/^\d{4}$/.test(date.normalized)) return date.normalized;
  const parsed = localDateFromNormalized(date.normalized);
  if (!parsed) return date.raw;
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(date.normalized.includes('T') || date.normalized.includes(' ')
      ? { hour: 'numeric', minute: '2-digit' }
      : {}),
  });
}
