import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActionButton } from '@/components/action-button';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenshotCard } from '@/features/screenshots/components/screenshot-card';
import { useScreenshots } from '@/features/screenshots/context';
import { ResurfacingCard } from '@/features/resurfacing/components/resurfacing-card';
import { useResurfacing } from '@/features/resurfacing/context';
import { Colors, Layout } from '@/constants/theme';
import { getPermissionViewState } from '@/features/screenshots/permission-state';

const galleryIcon = {
  ios: 'photo.on.rectangle.angled',
  android: 'photo_library',
  web: 'photo_library',
} as const;

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
    updateLimitedAccess,
    setStatus,
  } = useScreenshots();
  const pending = screenshots.filter((item) => item.status === 'pending');
  const permissionView = getPermissionViewState({ permission, canAskAgain, loading, error });
  const showPermissionScreen = !['granted', 'limited'].includes(permissionView);
  const openSettings = async () => {
    await Linking.openSettings();
  };
  const retry = async () => {
    if (permission === 'not_requested' || (permission === 'denied' && canAskAgain)) {
      await requestAccess();
    } else await refresh();
  };

  if (showPermissionScreen) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.permissionContent}
          keyboardShouldPersistTaps="handled"
        >
          <PermissionStateView
            view={permissionView}
            error={error}
            onRequest={requestAccess}
            onOpenSettings={openSettings}
            onRetry={retry}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={error || pending.length === 0 ? [] : pending}
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
            {permission === 'limited' ? (
              <LimitedAccessNotice onUpdate={updateLimitedAccess} onOpenSettings={openSettings} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <PermissionStateView
            view={permissionView}
            loading={loading}
            error={error}
            hasScreenshots={screenshots.length > 0}
            onRequest={requestAccess}
            onOpenSettings={openSettings}
            onRetry={retry}
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
function PermissionStateView({
  view,
  loading = false,
  error,
  hasScreenshots = false,
  onRequest,
  onOpenSettings,
  onRetry,
}: {
  view: ReturnType<typeof getPermissionViewState>;
  loading?: boolean;
  error: string | null;
  hasScreenshots?: boolean;
  onRequest: () => Promise<void>;
  onOpenSettings: () => Promise<void>;
  onRetry: () => Promise<void>;
}) {
  const [activeAction, setActiveAction] = useState<'permission' | 'settings' | 'retry'>();
  if (loading || view === 'loading')
    return (
      <View style={styles.state}>
        <ActivityIndicator color={Colors.dark.accent} />
        <ThemedText themeColor="textSecondary">Loading screenshots...</ThemedText>
      </View>
    );
  if (view === 'error')
    return (
      <View style={styles.permissionState}>
        <PermissionIllustration />
        <ThemedText type="subtitle">Could not load screenshots</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.stateDescription}>
          {error}
        </ThemedText>
        <ActionButton
          label="Try Again"
          loadingLabel="Retrying..."
          state={activeAction === 'retry' ? 'loading' : 'idle'}
          accessibilityLabel="Try screenshot access again"
          onPress={() => {
            setActiveAction('retry');
            void onRetry().finally(() => setActiveAction(undefined));
          }}
        />
      </View>
    );

  if (view === 'first_time')
    return (
      <View style={styles.permissionState}>
        <PermissionIllustration />
        <ThemedText type="subtitle">Give Recall access to your screenshots</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.stateDescription}>
          Recall needs permission to find and organize screenshots on your device. Your screenshots
          stay on your phone unless you choose to use AI analysis.
        </ThemedText>
        <ActionButton
          label="Grant Screenshot Access"
          loadingLabel="Requesting access..."
          state={activeAction === 'permission' ? 'loading' : 'idle'}
          accessibilityLabel="Grant screenshot access"
          onPress={() => {
            setActiveAction('permission');
            void onRequest().finally(() => setActiveAction(undefined));
          }}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.supportingText}>
          You can change this permission anytime in your device settings.
        </ThemedText>
      </View>
    );

  if (view === 'denied')
    return (
      <View style={styles.permissionState}>
        <PermissionIllustration />
        <ThemedText type="subtitle">Screenshot access is needed</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.stateDescription}>
          Recall can&apos;t find screenshots on your device without permission. You can enable
          access whenever you&apos;re ready.
        </ThemedText>
        <ActionButton
          label="Grant Access"
          loadingLabel="Requesting access..."
          state={activeAction === 'permission' ? 'loading' : 'idle'}
          accessibilityLabel="Grant screenshot access"
          onPress={() => {
            setActiveAction('permission');
            void onRequest().finally(() => setActiveAction(undefined));
          }}
        />
      </View>
    );

  if (view === 'blocked')
    return (
      <View style={styles.permissionState}>
        <PermissionIllustration />
        <ThemedText type="subtitle">Enable screenshot access in Settings</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.stateDescription}>
          Screenshot access is currently disabled for Recall. Enable photo access in your device
          settings to continue.
        </ThemedText>
        <ActionButton
          label="Open Settings"
          loadingLabel="Opening Settings..."
          state={activeAction === 'settings' ? 'loading' : 'idle'}
          accessibilityLabel="Open Recall photo permission settings"
          onPress={() => {
            setActiveAction('settings');
            void onOpenSettings().finally(() => setActiveAction(undefined));
          }}
        />
      </View>
    );

  if (view === 'unavailable')
    return (
      <View style={styles.permissionState}>
        <PermissionIllustration />
        <ThemedText type="subtitle">Screenshot access is unavailable</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.stateDescription}>
          Screenshot discovery is available in Recall on Android and iOS.
        </ThemedText>
      </View>
    );

  if (hasScreenshots)
    return <EmptyState title="You're caught up" message="No screenshots are waiting for you." />;
  return (
    <EmptyState title="No screenshots found" message="Take a screenshot, then refresh Recall." />
  );
}

function PermissionIllustration() {
  return (
    <View style={styles.illustration} accessible={false}>
      <SymbolView name={galleryIcon} tintColor={Colors.dark.accent} size={42} />
    </View>
  );
}

function LimitedAccessNotice({
  onUpdate,
  onOpenSettings,
}: {
  onUpdate: () => Promise<void>;
  onOpenSettings: () => Promise<void>;
}) {
  const [activeAction, setActiveAction] = useState<'update' | 'settings'>();
  return (
    <View style={styles.limitedNotice}>
      <ThemedText type="smallBold">Selected photos only</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Recall can organize the screenshots you selected. Other screenshots may not appear.
      </ThemedText>
      <View style={styles.noticeActions}>
        <ActionButton
          label="Choose More Photos"
          loadingLabel="Opening Photos..."
          variant="secondary"
          compact
          state={activeAction ? (activeAction === 'update' ? 'loading' : 'disabled') : 'idle'}
          accessibilityLabel="Update selected photos"
          onPress={() => {
            setActiveAction('update');
            void onUpdate().finally(() => setActiveAction(undefined));
          }}
        />
        <ActionButton
          label="Open Settings"
          variant="ghost"
          compact
          state={activeAction ? (activeAction === 'settings' ? 'loading' : 'disabled') : 'idle'}
          accessibilityLabel="Open Recall photo permission settings"
          onPress={() => {
            setActiveAction('settings');
            void onOpenSettings().finally(() => setActiveAction(undefined));
          }}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 90 },
  content: { padding: Layout.screenPadding },
  permissionContent: {
    flexGrow: 1,
    padding: Layout.screenPadding,
    paddingTop: 40,
    paddingBottom: 110,
  },
  header: { marginBottom: 24 },
  relevant: { gap: 12, marginBottom: 24 },
  sectionLabel: { letterSpacing: 0.8 },
  tagline: { fontSize: 18, marginTop: 8 },
  count: { marginTop: 8, textAlign: 'center' },
  state: { alignItems: 'center', gap: 12, paddingVertical: 56 },
  permissionState: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'stretch',
    gap: 16,
  },
  illustration: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.dark.accentMuted,
    marginBottom: 4,
  },
  stateDescription: { maxWidth: 500 },
  supportingText: { textAlign: 'center' },
  limitedNotice: {
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 22,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.accent,
    backgroundColor: Colors.dark.backgroundElement,
  },
  noticeActions: { gap: 4, marginTop: 4 },
});
