import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type PropsWithChildren,
} from 'react';
import { useLibrary } from '@/features/library/context';
import { useScreenshots } from '@/features/screenshots/context';
import { useUpcoming } from '@/features/upcoming/context';
import { actionTypeForItem, executeAction as runAction } from './execute-action';
import type { ExecuteActionInput, RecallActionRecord, RecallActionType } from './types';

type ContextValue = {
  records: RecallActionRecord[];
  executeAction: (input: ExecuteActionInput) => Promise<boolean>;
  getAction: (
    screenshotId: string,
    itemIndex: number,
    type: RecallActionType,
  ) => RecallActionRecord | undefined;
};

type StateAction =
  | { type: 'start'; record: RecallActionRecord }
  | { type: 'complete'; id: string; externalId?: string }
  | { type: 'fail'; id: string; error: string; debugMessage?: string };

function reducer(state: RecallActionRecord[], action: StateAction): RecallActionRecord[] {
  if (action.type === 'start') {
    const existing = state.find((record) => record.id === action.record.id);
    if (existing?.status === 'completed') return state;
    return [...state.filter((record) => record.id !== action.record.id), action.record];
  }
  return state.map((record) =>
    record.id === action.id
      ? {
          ...record,
          status: action.type === 'complete' ? 'completed' : 'failed',
          externalId: action.type === 'complete' ? action.externalId : record.externalId,
          error: action.type === 'fail' ? action.error : undefined,
          debugMessage: action.type === 'fail' ? action.debugMessage : undefined,
        }
      : record,
  );
}

const ActionContext = createContext<ContextValue | null>(null);

export function ActionProvider({ children }: PropsWithChildren) {
  const [records, dispatch] = useReducer(reducer, []);
  const inFlight = useRef(new Set<string>());
  const library = useLibrary();
  const screenshots = useScreenshots();
  const upcoming = useUpcoming();

  const executeAction = useCallback(
    async (input: ExecuteActionInput) => {
      const actionType = actionTypeForItem(input);
      const id = `${input.screenshotId}:${input.itemIndex}:${actionType}`;
      const completed = records.some((record) => record.id === id && record.status === 'completed');
      if (completed || inFlight.current.has(id)) return completed;

      inFlight.current.add(id);
      dispatch({
        type: 'start',
        record: {
          id,
          screenshotId: input.screenshotId,
          itemIndex: input.itemIndex,
          type: actionType,
          status: 'processing',
          createdAt: Date.now(),
        },
      });
      try {
        const result = await runAction(input);
        if (result.libraryItem) library.save(result.libraryItem);
        if (result.upcomingItem) upcoming.add(result.upcomingItem);
        if (input.item.type === 'general') screenshots.setStatus(input.screenshotId, 'kept');
        dispatch({ type: 'complete', id, externalId: result.externalId });
        return true;
      } catch (error) {
        dispatch({
          type: 'fail',
          id,
          error: error instanceof Error ? error.message : 'The action could not be completed.',
          debugMessage:
            __DEV__ &&
            error instanceof Error &&
            'debugMessage' in error &&
            typeof error.debugMessage === 'string'
              ? error.debugMessage
              : undefined,
        });
        return false;
      } finally {
        inFlight.current.delete(id);
      }
    },
    [library, records, screenshots, upcoming],
  );

  const getAction = useCallback(
    (screenshotId: string, itemIndex: number, type: RecallActionType) =>
      records.find(
        (record) =>
          record.screenshotId === screenshotId &&
          record.itemIndex === itemIndex &&
          record.type === type,
      ),
    [records],
  );
  const value = useMemo(
    () => ({ records, executeAction, getAction }),
    [records, executeAction, getAction],
  );
  return <ActionContext.Provider value={value}>{children}</ActionContext.Provider>;
}

export function useActions() {
  const value = useContext(ActionContext);
  if (!value) throw new Error('useActions must be used within ActionProvider');
  return value;
}
