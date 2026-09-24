import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius } from '@/constants/theme';
import { useCleanup } from '@/features/cleanup/context';
import type { CleanupDeleteResult, ScreenshotCleanupCandidate } from '@/features/cleanup/types';
import { useScreenshots } from '@/features/screenshots/context';
import { useSubscription } from '@/features/subscription/context';
import type { RecallScreenshot } from '@/features/screenshots/types';
import { ScreenshotImage } from '@/features/screenshots/components/screenshot-image';
import { formatScreenshotCreationDate } from '@/features/screenshots/creation-time';

export default function CleanupRoute() {
  const {
    candidates,
    selectedIds,
    toggleSelected,
    selectSafe,
    deselectAll,
    deleteSelected,
    deleting,
    lastResult,
    selectionLimitExceeded,
  } = useCleanup();
  const { presentPaywall, loading: subscriptionLoading } = useSubscription();
  const { screenshots } = useScreenshots();
  const [confirming, setConfirming] = useState(false);
  const selectedCount = selectedIds.length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Ready to clean up</ThemedText>
        <ThemedText themeColor="textSecondary">
          {candidates.length} {candidates.length === 1 ? 'screenshot' : 'screenshots'} ready for
          review
        </ThemedText>
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" onPress={selectSafe} style={styles.controlButton}>
            <ThemedText type="smallBold">Select safe</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={deselectAll} style={styles.controlButton}>
            <ThemedText type="smallBold">Deselect all</ThemedText>
          </Pressable>
        </View>
        <ThemedText type="smallBold">{selectedCount} selected</ThemedText>
        {selectionLimitExceeded ? (
          <ThemedView type="backgroundElement" style={styles.limitNotice}>
            <ThemedText type="smallBold">
              Free cleanup supports up to 3 screenshots at once.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Deselect screenshots to continue, or upgrade for larger cleanup batches.
            </ThemedText>
            <ActionButton
              label="Upgrade to Pro"
              loadingLabel="Opening paywall..."
              state={subscriptionLoading ? 'loading' : 'idle'}
              onPress={() => void presentPaywall()}
              style={styles.upgradeButton}
            />
          </ThemedView>
        ) : null}
        {lastResult ? <ResultMessage result={lastResult} /> : null}
        {candidates.length ? (
          candidates.map((candidate) => {
            const screenshot = screenshots.find((item) => item.id === candidate.screenshotId);
            return screenshot ? (
              <CleanupCard
                key={candidate.screenshotId}
                candidate={candidate}
                screenshot={screenshot}
                selected={selectedIds.includes(candidate.screenshotId)}
                onToggle={() => toggleSelected(candidate.screenshotId)}
                onOpen={() =>
                  router.push(`/screenshot/${encodeURIComponent(candidate.screenshotId)}`)
                }
              />
            ) : null;
          })
        ) : (
          <View style={styles.empty}>
            <ThemedText type="smallBold">Nothing ready for cleanup.</ThemedText>
            <ThemedText themeColor="textSecondary">
              Process screenshots or save their useful information first.
            </ThemedText>
          </View>
        )}
        <ActionButton
          label={`Delete ${selectedCount} ${selectedCount === 1 ? 'screenshot' : 'screenshots'}`}
          loadingLabel="Deleting from Gallery..."
          variant="danger"
          state={
            deleting
              ? 'loading'
              : selectedCount === 0 || selectionLimitExceeded
                ? 'disabled'
                : 'idle'
          }
          onPress={() => setConfirming(true)}
          style={styles.deleteButton}
        />
      </ScrollView>
      <ConfirmationModal
        visible={confirming}
        destructive
        title={`Delete ${selectedCount} ${selectedCount === 1 ? 'screenshot' : 'screenshots'} from your device?`}
        message="They will be removed from your Gallery. Saved Recall items, reminders, bundles, and actions will stay."
        confirmLabel="Delete Screenshots"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void deleteSelected();
        }}
      />
    </ThemedView>
  );
}

function CleanupCard({
  candidate,
  screenshot,
  selected,
  onToggle,
  onOpen,
}: {
  candidate: ScreenshotCleanupCandidate;
  screenshot: RecallScreenshot;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const date = formatScreenshotCreationDate(screenshot.creationTime);
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.cardContent}>
        <ScreenshotImage
          uri={screenshot.uri}
          screenshotId={screenshot.id}
          style={styles.thumbnail}
          accessibilityLabel={screenshot.filename ?? 'Screenshot'}
          compact
        />
        <View style={styles.cardDetails}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {screenshot.filename ?? 'Screenshot'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {screenshot.status}
            {date ? ` · ${date}` : ''}
          </ThemedText>
          {candidate.reasonLabels.map((reason) => (
            <ThemedText key={reason} type="small" themeColor="textSecondary">
              {reason}
            </ThemedText>
          ))}
          {__DEV__ ? (
            <ThemedText type="small" themeColor="textSecondary">
              {candidate.confidence} · {candidate.handledState.handledItems}/
              {candidate.handledState.totalItems} handled
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        onPress={onToggle}
        style={styles.selection}
      >
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          <ThemedText style={selected ? styles.checkmark : undefined}>
            {selected ? '✓' : ''}
          </ThemedText>
        </View>
        <ThemedText type="smallBold">{selected ? 'Selected' : 'Select'}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function ResultMessage({ result }: { result: CleanupDeleteResult }) {
  const message = result.failed.length
    ? `${result.deleted} ${result.deleted === 1 ? 'screenshot' : 'screenshots'} deleted. ${result.failed.length} could not be deleted.`
    : `${result.deleted} ${result.deleted === 1 ? 'screenshot' : 'screenshots'} deleted.`;
  return (
    <ThemedView type="backgroundElement" style={styles.result} accessibilityLiveRegion="polite">
      <ThemedText>{message}</ThemedText>
      {result.refreshFailed ? (
        <ThemedText type="small" themeColor="textSecondary">
          Recall could not refresh the Gallery. Refresh Screenshots before trying again.
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 12, paddingBottom: 48 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  controlButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.dark.accentMuted,
  },
  empty: { paddingVertical: 40, gap: 6 },
  card: { overflow: 'hidden', borderRadius: Radius.medium },
  cardContent: { flexDirection: 'row', minHeight: 112 },
  thumbnail: { width: 112, height: 112 },
  cardDetails: { flex: 1, justifyContent: 'center', padding: 12, gap: 3 },
  selection: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.textSecondary,
    borderRadius: 4,
  },
  checkboxSelected: { backgroundColor: Colors.dark.accent, borderColor: Colors.dark.accent },
  checkmark: { color: '#fff' },
  deleteButton: { marginTop: 8 },
  result: { padding: 12, borderRadius: 8, gap: 4 },
  limitNotice: { padding: 14, borderRadius: 8, gap: 8 },
  upgradeButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.dark.accent,
  },
});
