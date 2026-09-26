import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { loadRecallState, saveRecallState, type PersistedRecallStateV1 } from '@/services/storage';
import { PersistenceContext, type PersistedStateUpdater } from './context';
import { saveWithRecovery } from './recovery';

export function PersistenceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PersistedRecallStateV1 | null>(null);
  const stateRef = useRef<PersistedRecallStateV1 | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const retrySave = useRef<(() => void) | null>(null);
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    void loadRecallState()
      .then((restored) => {
        if (!active) return;
        stateRef.current = restored;
        setState(restored);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const updateState = useCallback(async (updater: PersistedStateUpdater) => {
    if (!stateRef.current) return;
    const next = updater(stateRef.current);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
    // Keep optimistic state, but serialize durable writes, including retries.
    // Later snapshots cannot be overwritten by an older retry.
    const pending = saveQueue.current.then(() =>
      saveWithRecovery(
        () => saveRecallState(next),
        () =>
          new Promise<void>((resolve) => {
            retrySave.current = resolve;
            setSaveFailed(true);
          }),
      ),
    );
    saveQueue.current = pending;
    await pending;
  }, []);

  const value = useMemo(
    () => (state ? { state, hydrated: true, updateState } : null),
    [state, updateState],
  );

  if (!value) {
    return (
      <View style={styles.loading}>
        {loadFailed ? (
          <>
            <ThemedText type="subtitle">Could not open saved data</ThemedText>
            <ThemedText>Your saved data has not been replaced. Please try again.</ThemedText>
            <ActionButton label="Try again" onPress={() => setLoadAttempt((value) => value + 1)} />
          </>
        ) : (
          <ActivityIndicator accessibilityLabel="Restoring Recall" />
        )}
      </View>
    );
  }
  return (
    <PersistenceContext.Provider value={value}>
      {children}
      <Modal transparent visible={saveFailed} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.backdrop}>
          <ScrollView style={styles.dialogScroll} contentContainerStyle={styles.dialog}>
            <ThemedText type="subtitle">Changes not saved yet</ThemedText>
            <ThemedText>
              Keep Recall open and try again. Your latest changes could be lost if you close the
              app. If your device is full, free some space first.
            </ThemedText>
            <ActionButton
              label="Retry saving"
              onPress={() => {
                const retry = retrySave.current;
                retrySave.current = null;
                setSaveFailed(false);
                retry?.();
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </PersistenceContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: Colors.dark.background,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.dark.overlay,
  },
  dialog: { padding: 24, gap: 16, backgroundColor: Colors.dark.backgroundElement, borderRadius: 8 },
  dialogScroll: { flexGrow: 0, maxHeight: '90%' },
});
