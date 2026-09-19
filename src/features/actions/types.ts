import type { RecallItem } from '@/services/ai/types';

export type RecallActionType =
  'add_to_calendar' | 'create_reminder' | 'save_product' | 'save_place' | 'read_later' | 'keep';

export interface RecallActionRecord {
  id: string;
  screenshotId: string;
  itemIndex: number;
  type: RecallActionType;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  externalId?: string;
  error?: string;
  debugMessage?: string;
}

export type ReminderTiming = 'at_deadline' | 'one_hour_before' | 'one_day_before';

export interface ExecuteActionInput {
  screenshotId: string;
  itemIndex: number;
  item: RecallItem;
  sourceApp?: string;
  exactDate?: Date;
  reminderTiming?: ReminderTiming;
  title?: string;
  location?: string;
  allowSemanticDuplicate?: boolean;
}
