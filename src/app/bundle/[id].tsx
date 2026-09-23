import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useActions } from '@/features/actions/context';
import { BundleItemRow } from '@/features/bundles/components/bundle-item-row';
import { useBundles } from '@/features/bundles/context';
import { summarizeBundle } from '@/features/bundles/grouping';
import type { RecallBundle } from '@/features/bundles/types';
import { useLibrary } from '@/features/library/context';
import { useUpcoming } from '@/features/upcoming/context';

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
  const [lifecycleAction, setLifecycleAction] = useState<'archive' | 'restore'>();
  const {
    getBundle,
    archiveBundle,
    restoreBundle,
    excludeItem,
    getExcludedItemsForBundle,
    getBundleLifecycleCounts,
  } = useBundles();
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
  const counts = getBundleLifecycleCounts(bundle.id);
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
          {bundle.status === 'archived' ? ' · Archived' : ''}
        </ThemedText>
        <ThemedText type="subtitle">{bundle.title}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {counts.active ? summarizeBundle(bundle) : 'All items removed.'}
        </ThemedText>
        <View style={styles.stats}>
          <Stat label="Active" value={counts.active} />
          {counts.removed ? <Stat label="Removed" value={counts.removed} /> : null}
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
              onRemove={() => excludeItem(ref.screenshotId, ref.itemIndex ?? 0)}
            />
          ))
        ) : (
          <ThemedText themeColor="textSecondary">All bundle items are excluded.</ThemedText>
        )}
        {counts.removed ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/bundle/${encodeURIComponent(bundle.id)}/removed`)}
            style={styles.manageButton}
          >
            <ThemedText type="smallBold">Manage removed items</ThemedText>
          </Pressable>
        ) : null}
        {bundle.status === 'active' ? (
          <ActionButton
            label="Archive bundle"
            loadingLabel="Archiving..."
            state={lifecycleAction === 'archive' ? 'loading' : 'idle'}
            variant="secondary"
            onPress={() => {
              setLifecycleAction('archive');
              void archiveBundle(bundle.id)
                .then(() => router.back())
                .finally(() => setLifecycleAction(undefined));
            }}
            style={styles.archiveButton}
          />
        ) : (
          <ActionButton
            label="Restore bundle"
            loadingLabel="Restoring..."
            successLabel="Bundle restored"
            state={lifecycleAction === 'restore' ? 'loading' : 'idle'}
            onPress={() => {
              setLifecycleAction('restore');
              void restoreBundle(bundle.id).finally(() => setLifecycleAction(undefined));
            }}
            style={styles.restoreButton}
          />
        )}
      </ScrollView>
    </ThemedView>
  );
}

function BundleItem({
  refItem,
  onRemove,
}: {
  refItem: RecallBundle['itemRefs'][number];
  onRemove: () => Promise<void>;
}) {
  return (
    <BundleItemRow
      refItem={refItem}
      membership="active"
      actionLabel="Remove from bundle"
      onAction={onRemove}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 48 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { minWidth: 82, padding: 10, borderRadius: 8 },
  sectionLabel: { marginTop: 12 },
  debugDetails: { gap: 2 },
  archiveButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  manageButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.dark.backgroundElement,
  },
  restoreButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
});
