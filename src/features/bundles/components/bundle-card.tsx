import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { RecallScreenshot } from '@/features/screenshots/types';
import { summarizeBundle } from '../grouping';
import type { RecallBundle } from '../types';

const TYPE_LABELS: Record<RecallBundle['type'], string> = {
  event: 'Event',
  project: 'Project',
  shopping: 'Shopping',
  travel: 'Travel',
  application: 'Application',
  topic: 'Topic',
  general: 'General',
};

export function BundleCard({
  bundle,
  screenshots,
  onPress,
  excludedCount,
}: {
  bundle: RecallBundle;
  screenshots: RecallScreenshot[];
  onPress: () => void;
  excludedCount?: number;
}) {
  const representative = bundle.screenshotIds
    .map((id) => screenshots.find((screenshot) => screenshot.id === id))
    .find(Boolean);
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${bundle.title}`}
        onPress={onPress}
        style={styles.content}
      >
        {representative ? (
          <Image
            source={{ uri: representative.uri }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel={`Preview for ${bundle.title}`}
          />
        ) : (
          <View style={styles.placeholder} accessibilityLabel="Preview unavailable">
            <ThemedText type="small" themeColor="textSecondary">
              No preview
            </ThemedText>
          </View>
        )}
        <View style={styles.details}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {TYPE_LABELS[bundle.type]}
          </ThemedText>
          <ThemedText numberOfLines={2}>{bundle.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {excludedCount
              ? `${excludedCount} ${excludedCount === 1 ? 'item' : 'items'} excluded.`
              : summarizeBundle(bundle)}
          </ThemedText>
          {__DEV__ && bundle.reason ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              Bundled because: {bundle.reason}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 8 },
  content: { flexDirection: 'row', minHeight: 128 },
  image: { width: 120, minHeight: 128, backgroundColor: '#d9d9de' },
  placeholder: {
    width: 120,
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9d9de',
  },
  details: { flex: 1, justifyContent: 'center', padding: 12, gap: 3 },
});
