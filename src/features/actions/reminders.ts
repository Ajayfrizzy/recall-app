import { Platform } from 'react-native';
import { getReminderDate } from './date-safeguards';
import type { ReminderTiming } from './types';

export class ReminderActionError extends Error {}
const CHANNEL_ID = 'recall-reminders';

export async function scheduleDeadlineReminder(input: {
  title: string;
  deadline: Date;
  timing: ReminderTiming;
}): Promise<{ notificationId: string; reminderAt: Date }> {
  if (Platform.OS === 'web') {
    throw new ReminderActionError('This action is available in the mobile app.');
  }

  const reminderAt = getReminderDate(input.deadline, input.timing);
  if (reminderAt.getTime() <= Date.now()) {
    throw new ReminderActionError('Choose a reminder time in the future.');
  }

  try {
    const Notifications = await import('expo-notifications');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Recall Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted
      ? current
      : await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        });
    if (!permission.granted) {
      throw new ReminderActionError(
        permission.canAskAgain
          ? 'Notification access was not granted. You can try again.'
          : 'Notification access was not granted. Enable it in device settings to continue.',
      );
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Recall reminder',
        body: `${input.title} is coming up.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderAt,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
    return { notificationId, reminderAt };
  } catch (error) {
    if (error instanceof ReminderActionError) throw error;
    throw new ReminderActionError('The reminder could not be scheduled.');
  }
}
