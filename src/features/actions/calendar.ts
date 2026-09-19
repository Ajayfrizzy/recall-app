import { Platform } from 'react-native';

export class CalendarActionError extends Error {}

export async function addEventToCalendar(input: {
  title: string;
  location?: string;
  startDate: Date;
}): Promise<string | undefined> {
  if (Platform.OS === 'web') {
    throw new CalendarActionError('This action is available in the mobile app.');
  }

  try {
    if (Platform.OS === 'android') {
      const Calendar = await import('expo-calendar/legacy');
      const result = await Calendar.createEventInCalendarAsync({
        title: input.title,
        location: input.location,
        startDate: input.startDate,
      });
      return result.id ?? undefined;
    }

    const Calendar = await import('expo-calendar');
    const permission = await Calendar.requestCalendarPermissions(true);
    if (!permission.granted) {
      throw new CalendarActionError(
        permission.canAskAgain
          ? 'Calendar access was not granted. You can try again.'
          : 'Calendar access was not granted. Enable it in device settings to continue.',
      );
    }

    const result = await Calendar.getDefaultCalendarSync().addEventWithForm({
      title: input.title,
      location: input.location,
      startDate: input.startDate,
    });
    if (result.action === 'canceled' || result.action === 'deleted') {
      throw new CalendarActionError('The calendar action was cancelled.');
    }
    return result.id ?? undefined;
  } catch (error) {
    if (error instanceof CalendarActionError) throw error;
    throw new CalendarActionError('The event could not be added to Calendar.');
  }
}
