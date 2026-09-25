import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionButton } from '@/components/action-button';
import { EmptyState } from '@/components/empty-state';
import { Colors } from '@/constants/theme';
import { useLibrary } from '@/features/library/context';
import { getLibraryContentPreview } from '@/features/library/preview';
import type { LibraryItem } from '@/features/library/types';
import { useScreenshots } from '@/features/screenshots/context';
import { ScreenshotHistoryCard } from '@/features/screenshots/components/history-card';
import { BundleCard } from '@/features/bundles/components/bundle-card';
import { useBundles } from '@/features/bundles/context';
import {
  isBundleInLifecycleSection,
  type BundleLifecycleSection,
} from '@/features/bundles/lifecycle';
import {
  filterScreenshotHistory,
  type ScreenshotHistoryFilter,
} from '@/features/screenshots/history';

type Filter = 'all' | LibraryItem['type'] | 'screenshots' | 'bundles';
const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'product', label: 'Products' },
  { value: 'place', label: 'Places' },
  { value: 'content', label: 'Read Later' },
  { value: 'screenshots', label: 'Screenshots' },
  { value: 'bundles', label: 'Bundles' },
];

const screenshotFilters: Array<{ value: ScreenshotHistoryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'kept', label: 'Kept' },
  { value: 'processed', label: 'Processed' },
];

const bundleSections: Array<{ value: BundleLifecycleSection; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'removed', label: 'Removed' },
  { value: 'archived', label: 'Archived' },
];

export default function LibraryScreen() {
  const { items } = useLibrary();
  const { screenshots } = useScreenshots();
  const {
    bundles,
    refreshBundles,
    restoreBundle,
    getExcludedItemsForBundle,
    getBundleLifecycleCounts,
  } = useBundles();
  const [filter, setFilter] = useState<Filter>('all');
  const [screenshotFilter, setScreenshotFilter] = useState<ScreenshotHistoryFilter>('all');
  const [bundleSection, setBundleSection] = useState<BundleLifecycleSection>('active');
  const visible =
    filter === 'all'
      ? items
      : filter === 'screenshots' || filter === 'bundles'
        ? []
        : items.filter((item) => item.type === filter);
  const history = filterScreenshotHistory(screenshots, screenshotFilter);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Library</ThemedText>
        <View accessibilityRole="tablist" style={styles.filters}>
          {filters.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === option.value }}
              onPress={() => setFilter(option.value)}
              style={[styles.filter, filter === option.value && styles.filterSelected]}
            >
              <ThemedText type="smallBold">{option.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        {filter === 'screenshots' ? (
          <ScreenshotHistory
            screenshots={history}
            filter={screenshotFilter}
            onFilter={setScreenshotFilter}
          />
        ) : filter === 'bundles' ? (
          <BundlesList
            bundles={bundles}
            screenshots={screenshots}
            section={bundleSection}
            onSection={setBundleSection}
            onRefresh={refreshBundles}
            onRestore={restoreBundle}
            getRemovedItems={getExcludedItemsForBundle}
            getCounts={getBundleLifecycleCounts}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? 'Nothing saved yet' : 'No matches'}
            message={
              items.length === 0
                ? 'Items you save from screenshots will appear here.'
                : 'No saved items match this filter.'
            }
          />
        ) : (
          visible.map((item) => <LibraryCard key={item.id} item={item} />)
        )}
      </ScrollView>
    </ThemedView>
  );
}

function BundlesList({
  bundles,
  screenshots,
  section,
  onSection,
  onRefresh,
  onRestore,
  getRemovedItems,
  getCounts,
}: {
  bundles: ReturnType<typeof useBundles>['bundles'];
  screenshots: ReturnType<typeof useScreenshots>['screenshots'];
  section: BundleLifecycleSection;
  onSection: (section: BundleLifecycleSection) => void;
  onRefresh: () => Promise<void>;
  onRestore: (bundleId: string) => Promise<void>;
  getRemovedItems: ReturnType<typeof useBundles>['getExcludedItemsForBundle'];
  getCounts: ReturnType<typeof useBundles>['getBundleLifecycleCounts'];
}) {
  const [refreshing, setRefreshing] = useState(false);
  const visible = bundles.filter((bundle) =>
    isBundleInLifecycleSection(bundle, getCounts(bundle.id), section),
  );
  const emptyMessage =
    section === 'removed'
      ? 'Items you remove from bundles will appear here.'
      : section === 'archived'
        ? 'No archived bundles.'
        : 'Related analyzed screenshots will appear here as bundles.';
  return (
    <>
      <View accessibilityRole="tablist" style={styles.filters}>
        {bundleSections.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === option.value }}
            onPress={() => onSection(option.value)}
            style={[styles.filter, section === option.value && styles.filterSelected]}
          >
            <ThemedText type="smallBold">{option.label}</ThemedText>
          </Pressable>
        ))}
      </View>
      <ActionButton
        label="Refresh bundles"
        loadingLabel="Refreshing bundles..."
        state={refreshing ? 'loading' : 'idle'}
        variant="secondary"
        compact
        onPress={() => {
          setRefreshing(true);
          void onRefresh().finally(() => setRefreshing(false));
        }}
        style={styles.refreshButton}
      />
      {visible.length === 0 ? (
        <EmptyState title="Nothing here yet" message={emptyMessage} />
      ) : (
        visible.map((bundle) => {
          const removedItems = getRemovedItems(bundle.id);
          const removedRoute = `/bundle/${encodeURIComponent(bundle.id)}/removed` as const;
          return (
            <BundleCard
              key={bundle.id}
              bundle={bundle}
              screenshots={screenshots}
              counts={getCounts(bundle.id)}
              removedItems={removedItems}
              onPress={() =>
                router.push(
                  section === 'removed' ? removedRoute : `/bundle/${encodeURIComponent(bundle.id)}`,
                )
              }
              action={
                section === 'removed'
                  ? { label: 'Manage removed', onPress: () => router.push(removedRoute) }
                  : section === 'archived'
                    ? { label: 'Restore bundle', onPress: () => onRestore(bundle.id) }
                    : undefined
              }
            />
          );
        })
      )}
    </>
  );
}

function ScreenshotHistory({
  screenshots,
  filter,
  onFilter,
}: {
  screenshots: ReturnType<typeof filterScreenshotHistory>;
  filter: ScreenshotHistoryFilter;
  onFilter: (filter: ScreenshotHistoryFilter) => void;
}) {
  const empty =
    filter === 'kept'
      ? 'No kept screenshots yet.'
      : filter === 'processed'
        ? 'Processed screenshots will appear here.'
        : 'Screenshots you keep or process will appear here.';
  return (
    <>
      <View accessibilityRole="tablist" style={styles.filters}>
        {screenshotFilters.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === option.value }}
            onPress={() => onFilter(option.value)}
            style={[styles.filter, filter === option.value && styles.filterSelected]}
          >
            <ThemedText type="smallBold">{option.label}</ThemedText>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          onPress={() => router.push('/cleanup')}
          style={styles.filter}
        >
          <ThemedText type="smallBold">Cleanup</ThemedText>
        </Pressable>
      </View>
      {screenshots.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          {empty}
        </ThemedText>
      ) : (
        screenshots.map((screenshot) => (
          <ScreenshotHistoryCard
            key={screenshot.id}
            screenshot={screenshot}
            onPress={() => router.push(`/screenshot/${screenshot.id}`)}
          />
        ))
      )}
    </>
  );
}

function LibraryCard({ item }: { item: LibraryItem }) {
  if (item.type === 'product') {
    return (
      <LibraryCardLink item={item}>
        <ThemedText type="smallBold">Product</ThemedText>
        <ThemedText>{item.title}</ThemedText>
        {item.currentPrice ? <ThemedText>{item.currentPrice}</ThemedText> : null}
        {item.source ? <Meta>{item.source}</Meta> : null}
      </LibraryCardLink>
    );
  }
  if (item.type === 'place') {
    return (
      <LibraryCardLink item={item}>
        <ThemedText type="smallBold">Place</ThemedText>
        <ThemedText>{item.title}</ThemedText>
        {item.address ? <Meta>{item.address}</Meta> : null}
      </LibraryCardLink>
    );
  }
  const preview = getLibraryContentPreview(item);
  return (
    <LibraryCardLink item={item}>
      <ThemedText type="smallBold">Read Later</ThemedText>
      <ThemedText numberOfLines={item.title ? 2 : 3} ellipsizeMode="tail">
        {preview.title}
      </ThemedText>
      {preview.summary ? <Meta numberOfLines={3}>{preview.summary}</Meta> : null}
      {item.author || item.source ? (
        <Meta>{[item.author, item.source].filter(Boolean).join(' · ')}</Meta>
      ) : null}
    </LibraryCardLink>
  );
}

function LibraryCardLink({ item, children }: { item: LibraryItem; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.type === 'content' ? 'Read Later item' : item.title}`}
      onPress={() => router.push(`/screenshot/${encodeURIComponent(item.screenshotId)}`)}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        {children}
      </ThemedView>
    </Pressable>
  );
}

function Meta({ children, numberOfLines }: { children: string; numberOfLines?: number }) {
  return (
    <ThemedText
      themeColor="textSecondary"
      numberOfLines={numberOfLines}
      ellipsizeMode={numberOfLines ? 'tail' : undefined}
    >
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 110 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  filterSelected: { backgroundColor: Colors.dark.accentMuted },
  empty: { paddingTop: 20 },
  card: { padding: 16, borderRadius: 8, gap: 5 },
  refreshButton: {
    alignSelf: 'flex-start',
  },
});
