import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/empty-state';
import { useUpcoming } from '@/features/upcoming/context';
import { formatScheduledDateTime } from '@/features/upcoming/format';

export default function UpcomingScreen() {
  const insets = useSafeAreaInsets();
  const { items } = useUpcoming();
  const sorted = [...items].sort((a, b) => {
    if (a.date && b.date) return a.date - b.date;
    if (a.date) return -1;
    if (b.date) return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
        <ThemedText type="subtitle">Upcoming</ThemedText>
        {sorted.length === 0 ? (
          <EmptyState
            title="Nothing upcoming"
            message="Events and deadlines you act on will appear here."
          />
        ) : (
          sorted.map((item) => (
            <ThemedView key={item.id} type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">
                {item.type === 'event' ? 'Event' : 'Deadline'}
              </ThemedText>
              <ThemedText>{item.title}</ThemedText>
              {item.date ? (
                <ThemedText type="smallBold" themeColor="accent">
                  {formatScheduledDateTime(item.date)}
                </ThemedText>
              ) : null}
              {item.location ? (
                <ThemedText themeColor="textSecondary">{item.location}</ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {item.type === 'event' ? 'Calendar added' : 'Reminder scheduled'}
              </ThemedText>
            </ThemedView>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 110 },
  card: { padding: 16, borderRadius: 8, gap: 5 },
});
