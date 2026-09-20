import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePersistence } from '@/features/persistence/context';
import { useScreenshots } from '@/features/screenshots/context';
import type { RecallItem } from '@/services/ai/types';
import type { BundleItemRef } from '../types';

export function BundleItemRow({
  refItem,
  membership,
  actionLabel,
  onAction,
}: {
  refItem: BundleItemRef;
  membership: 'active' | 'removed';
  actionLabel: string;
  onAction: () => void;
}) {
  const { screenshots } = useScreenshots();
  const { state } = usePersistence();
  const screenshot = screenshots.find((candidate) => candidate.id === refItem.screenshotId);
  const analysis = state.screenshots[refItem.screenshotId]?.analysis;
  const item =
    refItem.itemIndex === undefined ? undefined : analysis?.semantic?.items[refItem.itemIndex];
  const onPress = screenshot
    ? () => router.push(`/screenshot/${encodeURIComponent(screenshot.id)}`)
    : undefined;

  return (
    <ThemedView type="backgroundElement" style={styles.itemRow}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        disabled={!onPress}
        onPress={onPress}
        style={styles.itemContent}
      >
        {screenshot ? (
          <Image source={{ uri: screenshot.uri }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <ThemedText type="small" themeColor="textSecondary">
              Unavailable
            </ThemedText>
          </View>
        )}
        <View style={styles.itemDetails}>
          <ThemedText numberOfLines={2}>{itemLabel(item, analysis?.summary)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item ? item.type[0].toUpperCase() + item.type.slice(1) : 'Screenshot'}
            {screenshot?.filename ? ` · ${screenshot.filename}` : ''}
            {!screenshot ? ' · Gallery asset missing' : ''}
          </ThemedText>
          {__DEV__ ? (
            <View>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                Item ref: {refItem.screenshotId}:{refItem.itemIndex ?? 0}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Membership: {membership}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onAction} style={styles.membershipButton}>
        <ThemedText type="smallBold">{actionLabel}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function itemLabel(item: RecallItem | undefined, summary: string | undefined): string {
  if (!item) return summary || 'Analyzed screenshot';
  if ('title' in item && item.title) return item.title;
  return item.type === 'content' || item.type === 'general' ? item.summary : summary || 'Item';
}

const styles = StyleSheet.create({
  itemRow: { overflow: 'hidden', borderRadius: 8 },
  itemContent: { flexDirection: 'row', minHeight: 104 },
  thumbnail: { width: 104, height: 104, backgroundColor: '#d9d9de' },
  thumbnailPlaceholder: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d9d9de',
  },
  itemDetails: { flex: 1, justifyContent: 'center', padding: 12, gap: 4 },
  membershipButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c9cf',
  },
});
