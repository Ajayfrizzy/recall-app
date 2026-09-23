import type { LibraryItem } from '@/features/library/types';
import type { UpcomingItem } from '@/features/upcoming/types';
import { createUpcomingFingerprint } from '@/features/upcoming/duplicates';
import { addEventToCalendar } from './calendar';
import { scheduleDeadlineReminder } from './reminders';
import { defaultActionTypeForItem } from './suggestions';
import type { ExecuteActionInput, RecallActionType } from './types';

export function actionTypeForItem(input: ExecuteActionInput): RecallActionType {
  return defaultActionTypeForItem(input.item);
}

export async function executeAction(input: ExecuteActionInput): Promise<{
  externalId?: string;
  libraryItem?: LibraryItem;
  upcomingItem?: UpcomingItem;
}> {
  const { item, screenshotId, itemIndex, sourceApp } = input;
  const id = `${screenshotId}:${itemIndex}`;
  const createdAt = Date.now();

  if (item.type === 'product') {
    return {
      libraryItem: {
        id,
        screenshotId,
        itemIndex,
        createdAt,
        type: 'product',
        title: item.title,
        currentPrice: item.currentPrice?.raw,
        originalPrice: item.originalPrice?.raw,
        source: item.source,
        sourceApp,
      },
    };
  }
  if (item.type === 'place') {
    return {
      libraryItem: {
        id,
        screenshotId,
        itemIndex,
        createdAt,
        type: 'place',
        title: item.title,
        address: item.address,
        source: item.source,
        sourceApp,
      },
    };
  }
  if (item.type === 'content') {
    const publishedDate = item.dates.find((date) => date.type === 'published');
    return {
      libraryItem: {
        id,
        screenshotId,
        itemIndex,
        createdAt,
        type: 'content',
        title: item.title,
        author: item.author,
        source: item.source,
        sourceApp,
        summary: item.summary,
        publishedDate: publishedDate?.normalized ?? publishedDate?.raw,
      },
    };
  }
  if (item.type === 'event') {
    if (!input.exactDate) throw new Error('An exact date and time are required.');
    const externalId = await addEventToCalendar({
      title: input.title ?? item.title,
      location: input.location ?? item.location,
      startDate: input.exactDate,
    });
    const upcomingItem: UpcomingItem = {
      id,
      screenshotId,
      itemIndex,
      createdAt,
      type: 'event',
      title: input.title ?? item.title,
      location: input.location ?? item.location,
      date: input.exactDate.getTime(),
      rawDate: item.dates[0]?.raw,
      externalCalendarId: externalId,
    };
    upcomingItem.semanticFingerprint = createUpcomingFingerprint(upcomingItem);
    return {
      externalId,
      upcomingItem,
    };
  }
  if (item.type === 'deadline') {
    if (!input.exactDate || !input.reminderTiming) {
      throw new Error('An exact deadline and reminder timing are required.');
    }
    const result = await scheduleDeadlineReminder({
      title: input.title ?? item.title,
      deadline: input.exactDate,
      timing: input.reminderTiming,
    });
    const upcomingItem: UpcomingItem = {
      id,
      screenshotId,
      itemIndex,
      createdAt,
      type: 'deadline',
      title: input.title ?? item.title,
      date: input.exactDate.getTime(),
      rawDate: item.dates[0]?.raw,
      reminderAt: result.reminderAt.getTime(),
      notificationId: result.notificationId,
    };
    upcomingItem.semanticFingerprint = createUpcomingFingerprint(upcomingItem);
    return {
      externalId: result.notificationId,
      upcomingItem,
    };
  }
  return {};
}
