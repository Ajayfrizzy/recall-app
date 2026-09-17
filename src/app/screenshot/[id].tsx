import { useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useScreenshots } from '@/features/screenshots/context';
import type { ScreenshotStatus } from '@/features/screenshots/types';
export default function ScreenshotRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { screenshots, setStatus } = useScreenshots();
  const screenshot = screenshots.find((item) => item.id === id);
  if (!screenshot)
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Screenshot not found.</ThemedText>
        <ThemedText themeColor="textSecondary">
          This screenshot is no longer available in the current session.
        </ThemedText>
      </ThemedView>
    );
  const date = screenshot.creationTime
    ? new Date(screenshot.creationTime * 1000).toLocaleString()
    : null;
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={{ uri: screenshot.uri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel={screenshot.filename ?? 'Screenshot'}
        />
        <ThemedText type="subtitle">Screenshot</ThemedText>
        <View style={styles.metadata}>
          <ThemedText>{screenshot.filename ?? 'Unnamed screenshot'}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {screenshot.width} x {screenshot.height}
            {date ? ` · ${date}` : ''}
          </ThemedText>
          <ThemedText themeColor="textSecondary">Status: {screenshot.status}</ThemedText>
        </View>
        <View style={styles.actions}>
          {(['kept', 'ignored', 'processed'] as ScreenshotStatus[]).map((status) => (
            <Pressable
              key={status}
              accessibilityRole="button"
              onPress={() => setStatus(screenshot.id, status)}
              style={styles.button}
            >
              <ThemedText style={styles.buttonText}>
                {status === 'processed'
                  ? 'Mark Processed'
                  : status[0].toUpperCase() + status.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  content: { gap: 16, paddingBottom: 40 },
  image: { width: '100%', height: 420, backgroundColor: '#e5e5e8' },
  metadata: { gap: 4 },
  actions: { gap: 10 },
  button: {
    backgroundColor: '#208AEF',
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
