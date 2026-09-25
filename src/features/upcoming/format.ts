export function formatScheduledDateTime(timestamp: number, locales?: string | string[]): string {
  const date = new Date(timestamp);
  const datePart = date.toLocaleDateString(locales, {
    month: 'short',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString(locales, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${datePart} · ${timePart}`;
}
