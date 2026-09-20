import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCleanup } from '@/features/cleanup/context';
import type { CleanupDeleteResult, ScreenshotCleanupCandidate } from '@/features/cleanup/types';
import { useScreenshots } from '@/features/screenshots/context';
import type { RecallScreenshot } from '@/features/screenshots/types';

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
  } = useCleanup();
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
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: selectedCount === 0 || deleting }}
          disabled={selectedCount === 0 || deleting}
          onPress={() => setConfirming(true)}
          style={[
            styles.deleteButton,
            (selectedCount === 0 || deleting) && styles.deleteButtonDisabled,
          ]}
        >
          <ThemedText style={styles.deleteText}>
            {deleting
              ? 'Deleting...'
              : `Delete ${selectedCount} ${selectedCount === 1 ? 'screenshot' : 'screenshots'}`}
          </ThemedText>
        </Pressable>
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
  const date = screenshot.creationTime
    ? new Date(screenshot.creationTime * 1000).toLocaleDateString()
    : undefined;
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.cardContent}>
        <Image
          source={{ uri: screenshot.uri }}
          style={styles.thumbnail}
          resizeMode="cover"
          accessibilityLabel={screenshot.filename ?? 'Screenshot'}
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
    <ThemedView type="backgroundElement" style={styles.result}>
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
    backgroundColor: '#dbeafe',
  },
  empty: { paddingVertical: 40, gap: 6 },
  card: { overflow: 'hidden', borderRadius: 8 },
  cardContent: { flexDirection: 'row', minHeight: 112 },
  thumbnail: { width: 112, height: 112, backgroundColor: '#d9d9de' },
  cardDetails: { flex: 1, justifyContent: 'center', padding: 12, gap: 3 },
  selection: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c9cf',
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#60646c',
    borderRadius: 4,
  },
  checkboxSelected: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  checkmark: { color: '#fff' },
  deleteButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#c53030',
    marginTop: 8,
  },
  deleteButtonDisabled: { opacity: 0.45 },
  deleteText: { color: '#fff', fontWeight: '700' },
  result: { padding: 12, borderRadius: 8, gap: 4 },
});
