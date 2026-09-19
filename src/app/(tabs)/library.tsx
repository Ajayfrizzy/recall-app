import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLibrary } from '@/features/library/context';
import type { LibraryItem } from '@/features/library/types';

type Filter = 'all' | LibraryItem['type'];
const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'product', label: 'Products' },
  { value: 'place', label: 'Places' },
  { value: 'content', label: 'Read Later' },
];

export default function LibraryScreen() {
  const { items } = useLibrary();
  const [filter, setFilter] = useState<Filter>('all');
  const visible = filter === 'all' ? items : items.filter((item) => item.type === filter);

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
        {visible.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {items.length === 0
              ? 'Items you save from screenshots will appear here.'
              : 'No saved items match this filter.'}
          </ThemedText>
        ) : (
          visible.map((item) => <LibraryCard key={item.id} item={item} />)
        )}
      </ScrollView>
    </ThemedView>
  );
}

function LibraryCard({ item }: { item: LibraryItem }) {
  if (item.type === 'product') {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Product</ThemedText>
        <ThemedText>{item.title}</ThemedText>
        {item.currentPrice ? <ThemedText>{item.currentPrice}</ThemedText> : null}
        {item.source ? <Meta>{item.source}</Meta> : null}
      </ThemedView>
    );
  }
  if (item.type === 'place') {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Place</ThemedText>
        <ThemedText>{item.title}</ThemedText>
        {item.address ? <Meta>{item.address}</Meta> : null}
      </ThemedView>
    );
  }
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">Read Later</ThemedText>
      <ThemedText>{item.title ?? item.summary}</ThemedText>
      {item.title ? <Meta>{item.summary}</Meta> : null}
      {item.author || item.source ? (
        <Meta>{[item.author, item.source].filter(Boolean).join(' · ')}</Meta>
      ) : null}
    </ThemedView>
  );
}

function Meta({ children }: { children: string }) {
  return <ThemedText themeColor="textSecondary">{children}</ThemedText>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 110 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  filter: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  filterSelected: { backgroundColor: '#dbeafe' },
  empty: { paddingTop: 20 },
  card: { padding: 16, borderRadius: 8, gap: 5 },
});
