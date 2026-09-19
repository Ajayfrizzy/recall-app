import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { loadRecallState, saveRecallState, type PersistedRecallStateV1 } from '@/services/storage';
import { PersistenceContext, type PersistedStateUpdater } from './context';

export function PersistenceProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PersistedRecallStateV1 | null>(null);
  const stateRef = useRef<PersistedRecallStateV1 | null>(null);

  useEffect(() => {
    let active = true;
    void loadRecallState().then((restored) => {
      if (!active) return;
      stateRef.current = restored;
      setState(restored);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateState = useCallback(async (updater: PersistedStateUpdater) => {
    if (!stateRef.current) return;
    const next = updater(stateRef.current);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setState(next);
    await saveRecallState(next);
  }, []);

  const value = useMemo(
    () => (state ? { state, hydrated: true, updateState } : null),
    [state, updateState],
  );

  if (!value) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator accessibilityLabel="Restoring Recall" />
      </View>
    );
  }
  return <PersistenceContext.Provider value={value}>{children}</PersistenceContext.Provider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
