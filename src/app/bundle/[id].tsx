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
  const { getBundle, archiveBundle, excludeItem, restoreItem, getExcludedItemsForBundle } =
    useBundles();
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

  const excludedRefs = getExcludedItemsForBundle(bundle.id);
  const logicalRefs = [...bundle.itemRefs, ...excludedRefs];
  const matchesLogicalRef = (candidate: { screenshotId: string; itemIndex: number }) =>
    logicalRefs.some(
      (ref) =>
        ref.screenshotId === candidate.screenshotId && (ref.itemIndex ?? 0) === candidate.itemIndex,
    );

  const linkedLibrary = libraryItems.filter(matchesLogicalRef);
  const linkedUpcoming = upcomingItems.filter(matchesLogicalRef);
  const linkedActions = actionRecords.filter(
    (record) => record.status === 'completed' && matchesLogicalRef(record),
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
          {excludedRefs.length ? <Stat label="Excluded" value={excludedRefs.length} /> : null}
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
        {bundle.itemRefs.length ? (
          bundle.itemRefs.map((ref) => (
            <BundleItem
              key={`${ref.screenshotId}:${ref.itemIndex ?? ''}`}
              refItem={ref}
              screenshots={screenshots}
              analysis={state.screenshots[ref.screenshotId]?.analysis}
              membership="active"
              actionLabel="Remove from bundle"
              onAction={() => void excludeItem(ref.screenshotId, ref.itemIndex ?? 0)}
            />
          ))
        ) : (
          <ThemedText themeColor="textSecondary">All bundle items are excluded.</ThemedText>
        )}
        {excludedRefs.length ? (
          <>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              EXCLUDED ITEMS
            </ThemedText>
            {excludedRefs.map((ref) => (
              <BundleItem
                key={`${ref.screenshotId}:${ref.itemIndex ?? ''}`}
                refItem={ref}
                screenshots={screenshots}
                analysis={state.screenshots[ref.screenshotId]?.analysis}
                membership="excluded"
                actionLabel="Restore to bundle"
                onAction={() => void restoreItem(ref.screenshotId, ref.itemIndex ?? 0)}
              />
            ))}
          </>
        ) : null}
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

function BundleItem({
  refItem,
  screenshots,
  analysis,
  membership,
  actionLabel,
  onAction,
}: {
  refItem: BundleItemRef;
  screenshots: ReturnType<typeof useScreenshots>['screenshots'];
  analysis: ReturnType<typeof usePersistence>['state']['screenshots'][string]['analysis'];
  membership: 'active' | 'excluded';
  actionLabel: string;
  onAction: () => void;
}) {
  const screenshot = screenshots.find((candidate) => candidate.id === refItem.screenshotId);
  const item =
    refItem.itemIndex === undefined ? undefined : analysis?.semantic?.items[refItem.itemIndex];
  return (
    <BundleItemRow
      refItem={refItem}
      item={item}
      summary={analysis?.summary}
      uri={screenshot?.uri}
      membership={membership}
      actionLabel={actionLabel}
      onAction={onAction}
      onPress={
        screenshot
          ? () => router.push(`/screenshot/${encodeURIComponent(screenshot.id)}`)
          : undefined
      }
    />
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
  membership,
  actionLabel,
  onAction,
}: {
  refItem: BundleItemRef;
  item?: RecallItem;
  summary?: string;
  uri?: string;
  onPress?: () => void;
  membership: 'active' | 'excluded';
  actionLabel: string;
  onAction: () => void;
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
  membershipButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c9cf',
  },
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
