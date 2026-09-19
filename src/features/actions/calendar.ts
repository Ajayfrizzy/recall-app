import { Platform } from 'react-native';

export class CalendarActionError extends Error {
  constructor(
    message: string,
    public readonly debugMessage?: string,
  ) {
    super(message);
    this.name = 'CalendarActionError';
  }
}

function safeNativeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.trim().slice(0, 500) || 'Unknown native calendar error';
}

export async function addEventToCalendar(input: {
  title: string;
  location?: string;
  startDate: Date;
}): Promise<string | undefined> {
  if (Platform.OS === 'web') {
    throw new CalendarActionError('This action is available in the mobile app.');
  }
  if (!(input.startDate instanceof Date) || Number.isNaN(input.startDate.getTime())) {
    throw new CalendarActionError('Enter a valid event date and time.');
  }

  if (__DEV__) {
    console.debug('Calendar event form payload', {
      title: input.title,
      startDate: input.startDate.toISOString(),
      location: input.location,
    });
  }

  try {
    if (Platform.OS === 'android') {
      const Calendar = await import('expo-calendar/legacy');
      // Android calendar providers are more reliable with a complete timed-event range. This is
      // only an editable system-form default, not a duration inferred from semantic analysis.
      const endDate = new Date(input.startDate.getTime() + 60 * 60 * 1000);
      const result = await Calendar.createEventInCalendarAsync({
        title: input.title,
        location: input.location,
        startDate: input.startDate,
        endDate,
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
    throw new CalendarActionError(
      'The event could not be added to Calendar.',
      __DEV__ ? safeNativeMessage(error) : undefined,
    );
  }
}
