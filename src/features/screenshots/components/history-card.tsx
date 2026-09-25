import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatScreenshotCreationDate } from '../creation-time';
import type { RecallScreenshot } from '../types';
import { ScreenshotImage } from './screenshot-image';

export function ScreenshotHistoryCard({
  screenshot,
  onPress,
}: {
  screenshot: RecallScreenshot;
  onPress: () => void;
}) {
  const complete = screenshot.analysis.status === 'complete';
  const date = formatScreenshotCreationDate(screenshot.creationTime);
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${screenshot.filename ?? 'screenshot'}`}
        onPress={onPress}
        style={styles.content}
      >
        <ScreenshotImage
          uri={screenshot.uri}
          screenshotId={screenshot.id}
          style={styles.image}
          accessibilityLabel={date ? `Screenshot from ${date}` : 'Screenshot'}
          compact
        />
        <View style={styles.details}>
          <View style={styles.heading}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.filename}>
              {screenshot.filename ?? 'Screenshot'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {screenshot.status === 'kept' ? 'Kept' : 'Processed'}
            </ThemedText>
          </View>
          {complete ? (
            <ThemedText type="small" themeColor="textSecondary">
              {screenshot.analysis.category[0].toUpperCase() +
                screenshot.analysis.category.slice(1)}
            </ThemedText>
          ) : null}
          {complete && screenshot.analysis.summary ? (
            <ThemedText numberOfLines={2}>{screenshot.analysis.summary}</ThemedText>
          ) : null}
          {date ? (
            <ThemedText type="small" themeColor="textSecondary">
              {date}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Date unavailable
            </ThemedText>
          )}
        </View>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 8 },
  content: { flexDirection: 'row', minHeight: 112 },
  image: { width: 112, height: 112 },
  details: { flex: 1, justifyContent: 'center', padding: 12, gap: 3 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filename: { flex: 1 },
});
