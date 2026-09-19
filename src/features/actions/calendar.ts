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
    const Calendar = await import('expo-calendar');
    const permission = await Calendar.requestCalendarPermissions(Platform.OS === 'ios');
    if (!permission.granted) {
      throw new CalendarActionError(
        permission.canAskAgain
          ? 'Calendar access was not granted. You can try again.'
          : 'Calendar access was not granted. Enable it in device settings to continue.',
      );
    }

    const calendars =
      Platform.OS === 'android' ? await Calendar.getCalendars(Calendar.EntityTypes.EVENT) : [];
    const calendar =
      Platform.OS === 'ios'
        ? Calendar.getDefaultCalendarSync()
        : (calendars.find((candidate) => candidate.allowsModifications && candidate.isPrimary) ??
          calendars.find((candidate) => candidate.allowsModifications));
    if (!calendar) throw new CalendarActionError('No writable calendar is available.');

    const result = await calendar.addEventWithForm({
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
