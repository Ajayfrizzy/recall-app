import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Profile</ThemedText>
      <ThemedText themeColor="textSecondary">
        Manage your Recall account and preferences.
      </ThemedText>
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, paddingBottom: 110 },
});
