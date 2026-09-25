export type ResurfacingType =
  | 'deadline_soon'
  | 'event_soon'
  | 'saved_bundle'
  | 'saved_content'
  | 'upcoming_summary'
  | 'general';

export interface RecallResurfacingCard {
  id: string;
  type: ResurfacingType;
  title: string;
  message: string;
  priority: number;
  createdAt: number;
  expiresAt?: number;
  screenshotId?: string;
  bundleId?: string;
  upcomingId?: string;
  scheduledAt?: number;
  bucket?: string;
  action?: {
    label: string;
    route?: string;
  };
}

export interface ResurfacingPreference {
  id: string;
  dismissedAt?: number;
  snoozedUntil?: number;
}

export const RESURFACING_PRIORITY = {
  OVERDUE_DEADLINE: 100,
  DEADLINE_TODAY: 95,
  EVENT_TODAY: 90,
  DEADLINE_TOMORROW: 85,
  EVENT_TOMORROW: 80,
  WITHIN_THREE_DAYS: 70,
  WITHIN_SEVEN_DAYS: 60,
  UPCOMING_SUMMARY: 40,
  SAVED_BUNDLE: 30,
  SAVED_CONTENT: 20,
} as const;

export const MAX_RESURFACING_CARDS = 3;
