import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BundleItemRow } from '@/features/bundles/components/bundle-item-row';
import { useBundles } from '@/features/bundles/context';

export default function RemovedBundleItemsRoute() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getBundle, restoreItem, getExcludedItemsForBundle, getBundleLifecycleCounts } =
    useBundles();
  const bundle = getBundle(id);

  if (!bundle) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.missing}>
          <ThemedText type="subtitle">Bundle not found.</ThemedText>
          <ThemedText themeColor="textSecondary">
            Its removed items are no longer available to manage.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const removedItems = getExcludedItemsForBundle(bundle.id);
  const counts = getBundleLifecycleCounts(bundle.id);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(48, insets.bottom + 24) },
        ]}
      >
        <ThemedText type="subtitle">Removed from {bundle.title}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {counts.active} active · {counts.removed} removed
        </ThemedText>
        {removedItems.length ? (
          removedItems.map((ref) => (
            <BundleItemRow
              key={`${ref.screenshotId}:${ref.itemIndex ?? ''}`}
              refItem={ref}
              membership="removed"
              actionLabel="Restore to bundle"
              onAction={() => restoreItem(ref.screenshotId, ref.itemIndex ?? 0)}
            />
          ))
        ) : (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            No removed bundle items.
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 48 },
  missing: { padding: 24, gap: 8 },
  empty: { paddingTop: 20 },
});
