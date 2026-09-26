import { migratePersistedState } from './migrations';
import { createEmptyPersistedState, PERSISTED_STATE_VERSION } from './types';

export function decodeRecallState(stored: string | null) {
  if (stored === null) return createEmptyPersistedState();
  const parsed: unknown = JSON.parse(stored);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('version' in parsed) ||
    parsed.version !== PERSISTED_STATE_VERSION
  ) {
    throw new Error('Saved data format is not supported.');
  }
  return migratePersistedState(parsed);
}
