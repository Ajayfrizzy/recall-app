import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useActions } from '@/features/actions/context';
import { useBundles } from '@/features/bundles/context';
import { summarizeBundle } from '@/features/bundles/grouping';
import type { BundleItemRef, RecallBundle } from '@/features/bundles/types';
import { useLibrary } from '@/features/library/context';
import { usePersistence } from '@/features/persistence/context';
import { useScreenshots } from '@/features/screenshots/context';
import { useUpcoming } from '@/features/upcoming/context';
import type { RecallItem } from '@/services/ai/types';

const TYPE_LABELS: Record<RecallBundle['type'], string> = {
  event: 'Event',
  project: 'Project',
  shopping: 'Shopping',
  travel: 'Travel',
  application: 'Application',
  topic: 'Topic',
  general: 'General',
};

export default function BundleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getBundle, archiveBundle } = useBundles();
  const { screenshots } = useScreenshots();
  const { state } = usePersistence();
  const { items: libraryItems } = useLibrary();
  const { items: upcomingItems } = useUpcoming();
  const { records: actionRecords } = useActions();
  const bundle = getBundle(id);

  if (!bundle) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle">Bundle not found.</ThemedText>
        <ThemedText themeColor="textSecondary">
          It may no longer have enough related screenshots.
        </ThemedText>
      </ThemedView>
    );
  }

  const linkedLibrary = libraryItems.filter((item) =>
    bundle.screenshotIds.includes(item.screenshotId),
  );
  const linkedUpcoming = upcomingItems.filter((item) =>
    bundle.screenshotIds.includes(item.screenshotId),
  );
  const linkedActions = actionRecords.filter(
    (record) => record.status === 'completed' && bundle.screenshotIds.includes(record.screenshotId),
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {TYPE_LABELS[bundle.type]}
        </ThemedText>
        <ThemedText type="subtitle">{bundle.title}</ThemedText>
        <ThemedText themeColor="textSecondary">{summarizeBundle(bundle)}</ThemedText>
        <View style={styles.stats}>
          <Stat label="Screenshots" value={bundle.screenshotIds.length} />
          <Stat label="Items" value={bundle.itemRefs.length} />
          {linkedLibrary.length ? <Stat label="Saved" value={linkedLibrary.length} /> : null}
          {linkedUpcoming.length ? <Stat label="Upcoming" value={linkedUpcoming.length} /> : null}
          {linkedActions.length ? <Stat label="Actions" value={linkedActions.length} /> : null}
        </View>
        {__DEV__ && bundle.reason ? (
          <View style={styles.debugDetails}>
            <ThemedText type="small" themeColor="textSecondary">
              Bundled because: {bundle.reason}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Bundle ID: {bundle.id}
            </ThemedText>
          </View>
        ) : null}
        <ThemedText type="smallBold" style={styles.sectionLabel}>
          RELATED ITEMS
        </ThemedText>
        {bundle.itemRefs.map((ref) => {
          const screenshot = screenshots.find((candidate) => candidate.id === ref.screenshotId);
          const analysis = state.screenshots[ref.screenshotId]?.analysis;
          const item =
            ref.itemIndex === undefined ? undefined : analysis?.semantic?.items[ref.itemIndex];
          return (
            <BundleItemRow
              key={`${ref.screenshotId}:${ref.itemIndex ?? ''}`}
              refItem={ref}
              item={item}
              summary={analysis?.summary}
              uri={screenshot?.uri}
              onPress={
                screenshot
                  ? () => router.push(`/screenshot/${encodeURIComponent(screenshot.id)}`)
                  : undefined
              }
            />
          );
        })}
        {bundle.status === 'active' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void archiveBundle(bundle.id).then(() => router.back())}
            style={styles.archiveButton}
          >
            <ThemedText type="smallBold">Archive bundle</ThemedText>
          </Pressable>
        ) : (
          <ThemedText themeColor="textSecondary">Archived</ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function itemLabel(item: RecallItem | undefined, summary: string | undefined): string {
  if (!item) return summary || 'Analyzed screenshot';
  if ('title' in item && item.title) return item.title;
  return item.type === 'content' || item.type === 'general' ? item.summary : summary || 'Item';
}

function BundleItemRow({
  refItem,
  item,
  summary,
  uri,
  onPress,
}: {
  refItem: BundleItemRef;
  item?: RecallItem;
  summary?: string;
  uri?: string;
  onPress?: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.itemRow}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        disabled={!onPress}
        onPress={onPress}
        style={styles.itemContent}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <ThemedText type="small" themeColor="textSecondary">
              Unavailable
            </ThemedText>
          </View>
        )}
        <View style={styles.itemDetails}>
          <ThemedText numberOfLines={2}>{itemLabel(item, summary)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item ? item.type[0].toUpperCase() + item.type.slice(1) : 'Screenshot'}
            {!uri ? ' · Gallery asset missing' : ''}
          </ThemedText>
          {__DEV__ ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {refItem.screenshotId}:{refItem.itemIndex ?? '-'}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 48 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { minWidth: 82, padding: 10, borderRadius: 8 },
  sectionLabel: { marginTop: 12 },
  debugDetails: { gap: 2 },
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
  archiveButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    marginTop: 12,
  },
});
