import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenshotCard } from '@/features/screenshots/components/screenshot-card';
import { useScreenshots } from '@/features/screenshots/context';

export default function InboxScreen() {
  const { screenshots, permission, loading, refreshing, error, refresh, requestAccess, setStatus } =
    useScreenshots();
  const pending = screenshots.filter((item) => item.status === 'pending');
  const needsPermission =
    permission === null || permission === 'denied' || permission === 'unavailable';
  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={needsPermission || loading || error || pending.length === 0 ? [] : pending}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="title">Recall</ThemedText>
            <ThemedText style={styles.tagline}>Turn screenshots into actions.</ThemedText>
          </View>
        }
        ListEmptyComponent={
          <StateView
            loading={loading}
            error={error}
            permission={permission}
            hasScreenshots={screenshots.length > 0}
            onRequest={requestAccess}
            onRetry={() => void refresh()}
          />
        }
        renderItem={({ item }) => (
          <ScreenshotCard
            screenshot={item}
            onPress={() => router.push(`/screenshot/${item.id}`)}
            onStatus={(status) => setStatus(item.id, status)}
          />
        )}
        ListFooterComponent={
          pending.length > 0 ? (
            <ThemedText style={styles.count}>{pending.length} screenshots waiting</ThemedText>
          ) : null
        }
      />
    </ThemedView>
  );
}
function StateView({
  loading,
  error,
  permission,
  hasScreenshots,
  onRequest,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  permission: 'granted' | 'limited' | 'denied' | 'unavailable' | null;
  hasScreenshots: boolean;
  onRequest: () => Promise<void>;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <View style={styles.state}>
        <ActivityIndicator />
        <ThemedText themeColor="textSecondary">Loading screenshots...</ThemedText>
      </View>
    );
  if (permission === null || permission === 'denied' || permission === 'unavailable')
    return (
      <View style={styles.state}>
        <ThemedText type="subtitle">
          {permission === 'denied'
            ? 'Screenshot access is turned off.'
            : 'Recall needs access to your screenshots.'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Your screenshots stay on your device during this milestone.
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => void onRequest()}
          style={styles.button}
        >
          <ThemedText style={styles.buttonText}>
            {permission === 'denied' ? 'Try Again' : 'Allow Screenshot Access'}
          </ThemedText>
        </Pressable>
      </View>
    );
  if (error)
    return (
      <View style={styles.state}>
        <ThemedText type="subtitle">Could not load screenshots.</ThemedText>
        <ThemedText themeColor="textSecondary">{error}</ThemedText>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
          <ThemedText style={styles.buttonText}>Try Again</ThemedText>
        </Pressable>
      </View>
    );
  if (hasScreenshots)
    return (
      <View style={styles.state}>
        <ThemedText type="subtitle">You're caught up.</ThemedText>
        <ThemedText themeColor="textSecondary">No screenshots are waiting for you.</ThemedText>
      </View>
    );
  return (
    <View style={styles.state}>
      <ThemedText type="subtitle">No screenshots found.</ThemedText>
      <ThemedText themeColor="textSecondary">Take a screenshot, then refresh Recall.</ThemedText>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 90 },
  content: { padding: 24 },
  header: { marginBottom: 24 },
  tagline: { fontSize: 18, marginTop: 8 },
  count: { marginTop: 8, textAlign: 'center' },
  state: { alignItems: 'center', gap: 12, paddingVertical: 56 },
  button: {
    backgroundColor: '#208AEF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
