import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  getScreenshotPermission,
  loadDeviceScreenshots,
  requestScreenshotPermission,
  type ScreenshotPermission,
} from './media-library';
import type { RecallScreenshot, ScreenshotStatus } from './types';

type State = Record<string, RecallScreenshot>;
type Action =
  | { type: 'replace'; screenshots: RecallScreenshot[] }
  | { type: 'status'; id: string; status: ScreenshotStatus };

function reducer(state: State, action: Action): State {
  if (action.type === 'replace') {
    const next = { ...state };
    action.screenshots.forEach((screenshot) => {
      next[screenshot.id] = {
        ...screenshot,
        status: state[screenshot.id]?.status ?? screenshot.status,
      };
    });
    return next;
  }
  if (!state[action.id]) return state;
  return { ...state, [action.id]: { ...state[action.id], status: action.status } };
}

type ContextValue = {
  screenshots: RecallScreenshot[];
  permission: ScreenshotPermission | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  requestAccess: () => Promise<void>;
  setStatus: (id: string, status: ScreenshotStatus) => void;
};

const ScreenshotContext = createContext<ContextValue | null>(null);

export function ScreenshotProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, {});
  const [permission, setPermission] = useState<ScreenshotPermission | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const currentPermission = permission ?? (await getScreenshotPermission());
      setPermission(currentPermission);
      if (currentPermission !== 'granted' && currentPermission !== 'limited') return;
      dispatch({ type: 'replace', screenshots: await loadDeviceScreenshots() });
    } catch {
      setError('We could not load your screenshots. Try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [permission]);

  const requestAccess = useCallback(async () => {
    setError(null);
    try {
      const nextPermission = await requestScreenshotPermission();
      setPermission(nextPermission);
      if (nextPermission === 'granted' || nextPermission === 'limited') await refresh();
    } catch {
      setPermission('denied');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      screenshots: Object.values(state).sort(
        (a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0),
      ),
      permission,
      loading,
      refreshing,
      error,
      refresh,
      requestAccess,
      setStatus: (id: string, status: ScreenshotStatus) => dispatch({ type: 'status', id, status }),
    }),
    [state, permission, loading, refreshing, error, refresh, requestAccess],
  );

  return <ScreenshotContext.Provider value={value}>{children}</ScreenshotContext.Provider>;
}

export function useScreenshots() {
  const value = useContext(ScreenshotContext);
  if (!value) throw new Error('useScreenshots must be used within ScreenshotProvider');
  return value;
}
