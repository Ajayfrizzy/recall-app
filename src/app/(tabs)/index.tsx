import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ActionButton } from '@/components/action-button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenshotCard } from '@/features/screenshots/components/screenshot-card';
import { useScreenshots } from '@/features/screenshots/context';
import { ResurfacingCard } from '@/features/resurfacing/components/resurfacing-card';
import { useResurfacing } from '@/features/resurfacing/context';
import { Colors, Layout } from '@/constants/theme';

export default function InboxScreen() {
  const { cards, dismissCard, snoozeCard } = useResurfacing();
  const {
    screenshots,
    permission,
    canAskAgain,
    loading,
    refreshing,
    error,
    refresh,
    requestAccess,
    setStatus,
  } = useScreenshots();
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
          <View>
            <View style={styles.header}>
              <ThemedText type="title">Recall</ThemedText>
              <ThemedText style={styles.tagline}>Turn screenshots into actions.</ThemedText>
            </View>
            {cards.length ? (
              <View style={styles.relevant}>
                <ThemedText type="smallBold" style={styles.sectionLabel}>
                  RELEVANT NOW
                </ThemedText>
                {cards.map((card) => (
                  <ResurfacingCard
                    key={card.id}
                    card={card}
                    onDismiss={() => dismissCard(card.id)}
                    onSnooze={() => snoozeCard(card.id)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <StateView
            loading={loading}
            error={error}
            permission={permission}
            hasScreenshots={screenshots.length > 0}
            canAskAgain={canAskAgain}
            onRequest={requestAccess}
            onOpenSettings={() => void Linking.openSettings()}
            onRetry={async () => {
              await refresh();
            }}
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
  canAskAgain,
  onRequest,
  onOpenSettings,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  permission: 'granted' | 'limited' | 'denied' | 'unavailable' | null;
  hasScreenshots: boolean;
  canAskAgain: boolean;
  onRequest: () => Promise<void>;
  onOpenSettings: () => void;
  onRetry: () => Promise<void>;
}) {
  const [activeAction, setActiveAction] = useState<'permission' | 'settings' | 'retry'>();
  if (loading)
    return (
      <View style={styles.state}>
        <ActivityIndicator color={Colors.dark.accent} />
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
        {permission !== 'denied' || canAskAgain ? (
          <ActionButton
            label={permission === 'denied' ? 'Try Again' : 'Allow Screenshot Access'}
            loadingLabel="Requesting access..."
            state={activeAction === 'permission' ? 'loading' : 'idle'}
            onPress={() => {
              setActiveAction('permission');
              void onRequest().finally(() => setActiveAction(undefined));
            }}
          />
        ) : null}
        {permission === 'denied' && !canAskAgain ? (
          <ActionButton
            label="Open Settings"
            state={activeAction === 'settings' ? 'loading' : 'idle'}
            onPress={() => {
              setActiveAction('settings');
              onOpenSettings();
              setActiveAction(undefined);
            }}
          />
        ) : null}
      </View>
    );
  if (error)
    return (
      <View style={styles.state}>
        <ThemedText type="subtitle">Could not load screenshots.</ThemedText>
        <ThemedText themeColor="textSecondary">{error}</ThemedText>
        <ActionButton
          label="Try Again"
          loadingLabel="Refreshing..."
          state={activeAction === 'retry' ? 'loading' : 'idle'}
          onPress={() => {
            setActiveAction('retry');
            void onRetry().finally(() => setActiveAction(undefined));
          }}
        />
      </View>
    );
  if (hasScreenshots)
    return <EmptyState title="You're caught up" message="No screenshots are waiting for you." />;
  return (
    <EmptyState title="No screenshots found" message="Take a screenshot, then refresh Recall." />
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 90 },
  content: { padding: Layout.screenPadding },
  header: { marginBottom: 24 },
  relevant: { gap: 12, marginBottom: 24 },
  sectionLabel: { letterSpacing: 0.8 },
  tagline: { fontSize: 18, marginTop: 8 },
  count: { marginTop: 8, textAlign: 'center' },
  state: { alignItems: 'center', gap: 12, paddingVertical: 56 },
});
