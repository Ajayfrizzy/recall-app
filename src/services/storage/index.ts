import AsyncStorage from '@react-native-async-storage/async-storage';
import { RECALL_STATE_KEY } from './keys';
import { migratePersistedState } from './migrations';
import { createEmptyPersistedState, type PersistedRecallStateV1 } from './types';

let writeQueue = Promise.resolve();

function warn(operation: 'read' | 'write' | 'clear', error: unknown) {
  if (__DEV__) console.warn(`Recall storage ${operation} failed`, error);
}

export async function loadRecallState(): Promise<PersistedRecallStateV1> {
  try {
    const stored = await AsyncStorage.getItem(RECALL_STATE_KEY);
    if (stored === null) return createEmptyPersistedState();
    return migratePersistedState(JSON.parse(stored));
  } catch (error) {
    warn('read', error);
    return createEmptyPersistedState();
  }
}

export function saveRecallState(state: PersistedRecallStateV1): Promise<void> {
  const validated = migratePersistedState(state);
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(RECALL_STATE_KEY, JSON.stringify(validated)))
    .catch((error) => warn('write', error));
  return writeQueue;
}

export async function clearRecallStorage(): Promise<void> {
  try {
    await writeQueue.catch(() => undefined);
    await AsyncStorage.removeItem(RECALL_STATE_KEY);
  } catch (error) {
    warn('clear', error);
  }
}

export { RECALL_STATE_KEY } from './keys';
export { migratePersistedState } from './migrations';
export type { PersistedRecallStateV1, PersistedScreenshotState } from './types';
