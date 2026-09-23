import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { FadeInView } from '@/components/motion';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { RecallScreenshot } from '@/features/screenshots/types';
import type { BundleLifecycleCounts } from '../lifecycle';
import type { BundleItemRef, RecallBundle } from '../types';

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
  counts,
  removedItems = [],
  action,
}: {
  bundle: RecallBundle;
  screenshots: RecallScreenshot[];
  onPress: () => void;
  counts: BundleLifecycleCounts;
  removedItems?: BundleItemRef[];
  action?: { label: string; onPress: () => void | Promise<void> };
}) {
  const [acting, setActing] = useState(false);
  const representative = [...bundle.screenshotIds, ...removedItems.map((item) => item.screenshotId)]
    .map((id) => screenshots.find((screenshot) => screenshot.id === id))
    .find(Boolean);
  return (
    <FadeInView>
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
              {lifecycleSummary(counts)}
            </ThemedText>
            {__DEV__ && bundle.reason ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                Bundled because: {bundle.reason}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
        {action ? (
          <ActionButton
            label={action.label}
            loadingLabel="Updating bundle..."
            state={acting ? 'loading' : 'idle'}
            variant="ghost"
            compact
            onPress={() => {
              setActing(true);
              void Promise.resolve(action.onPress()).finally(() => setActing(false));
            }}
            style={styles.action}
          />
        ) : null}
      </ThemedView>
    </FadeInView>
  );
}

function lifecycleSummary(counts: BundleLifecycleCounts): string {
  const active = `${counts.active} active`;
  if (!counts.removed) return active;
  return `${active} · ${counts.removed} removed`;
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 8 },
  content: { flexDirection: 'row', minHeight: 128 },
  image: { width: 120, minHeight: 128, backgroundColor: Colors.dark.backgroundSelected },
  placeholder: {
    width: 120,
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.backgroundSelected,
  },
  details: { flex: 1, justifyContent: 'center', padding: 12, gap: 3 },
  action: {
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    borderRadius: 0,
  },
});
