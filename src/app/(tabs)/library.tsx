import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
export default function LibraryScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Library</ThemedText>
      <ThemedText themeColor="textSecondary">
        Your saved screenshots, actions, and bundles.
      </ThemedText>
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, paddingBottom: 110 },
});
