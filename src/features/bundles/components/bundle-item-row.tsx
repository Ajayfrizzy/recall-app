import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePersistence } from '@/features/persistence/context';
import { useScreenshots } from '@/features/screenshots/context';
import type { RecallItem } from '@/services/ai/types';
import { ScreenshotImage } from '@/features/screenshots/components/screenshot-image';
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
  onAction: () => void | Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
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
          <ScreenshotImage
            uri={screenshot.uri}
            screenshotId={screenshot.id}
            accessibilityLabel={screenshot.filename ?? 'Screenshot'}
            style={styles.thumbnail}
            compact
          />
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
        </View>
      </Pressable>
      <ActionButton
        label={actionLabel}
        loadingLabel={membership === 'active' ? 'Removing...' : 'Restoring...'}
        state={updating ? 'loading' : 'idle'}
        variant="ghost"
        compact
        onPress={() => {
          setUpdating(true);
          void Promise.resolve(onAction()).finally(() => setUpdating(false));
        }}
        style={styles.membershipButton}
      />
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
  thumbnail: { width: 104, height: 104 },
  thumbnailPlaceholder: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.backgroundSelected,
  },
  itemDetails: { flex: 1, justifyContent: 'center', padding: 12, gap: 4 },
  membershipButton: {
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    borderRadius: 0,
  },
});
