export interface UpcomingItem {
  id: string;
  screenshotId: string;
  itemIndex: number;
  type: 'event' | 'deadline';
  title: string;
  location?: string;
  date?: number;
  rawDate?: string;
  reminderAt?: number;
  createdAt: number;
  externalCalendarId?: string;
  notificationId?: string;
  semanticFingerprint?: string;
}
