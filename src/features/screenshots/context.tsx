import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  loadDeviceScreenshots,
  getScreenshotPermissionState,
  requestScreenshotPermissionState,
  type ScreenshotPermission,
} from './media-library';
import { usePersistence } from '@/features/persistence/context';
import type { RecallScreenshot, ScreenshotStatus } from './types';
import { OcrError, recognizeScreenshotText } from '@/services/ocr';
import {
  analyzeScreenshotSemantically,
  SemanticAnalysisError,
} from '@/services/ai/analyze-screenshot';
import {
  createIdleScreenshotAnalysis,
  understandScreenshotText,
  type ScreenshotAnalysis,
} from '@/services/understanding';
import { ANALYSIS_VERSION } from '@/services/storage/types';

type State = Record<string, RecallScreenshot>;
type Action =
  | { type: 'replace'; screenshots: RecallScreenshot[] }
  | { type: 'status'; id: string; status: ScreenshotStatus }
  | { type: 'analysis'; id: string; analysis: ScreenshotAnalysis };

function reducer(state: State, action: Action): State {
  if (action.type === 'replace') {
    const next: State = {};
    action.screenshots.forEach((screenshot) => {
      next[screenshot.id] = {
        ...screenshot,
        status: state[screenshot.id]?.status ?? screenshot.status,
        analysis: state[screenshot.id]?.analysis ?? screenshot.analysis,
      };
    });
    return next;
  }
  if (action.type === 'analysis') {
    if (!state[action.id]) return state;
    return { ...state, [action.id]: { ...state[action.id], analysis: action.analysis } };
  }
  if (!state[action.id]) return state;
  return { ...state, [action.id]: { ...state[action.id], status: action.status } };
}

type ContextValue = {
  screenshots: RecallScreenshot[];
  permission: ScreenshotPermission | null;
  canAskAgain: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  requestAccess: () => Promise<void>;
  setStatus: (id: string, status: ScreenshotStatus) => void;
  analyzeScreenshot: (id: string) => Promise<void>;
  semanticAnalysisAcknowledged: boolean;
  acknowledgeSemanticAnalysis: () => void;
};

const ScreenshotContext = createContext<ContextValue | null>(null);

export function ScreenshotProvider({ children }: PropsWithChildren) {
  const { state: persistedState, updateState } = usePersistence();
  const persistedScreenshotsRef = useRef(persistedState.screenshots);
  const [state, dispatch] = useReducer(reducer, {});
  const [permission, setPermission] = useState<ScreenshotPermission | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semanticAnalysisAcknowledged, setSemanticAnalysisAcknowledged] = useState(
    persistedState.semanticAnalysisAcknowledged,
  );
  const semanticAnalysisAcknowledgedRef = useRef(persistedState.semanticAnalysisAcknowledged);
  const analysesInFlight = useRef(new Set<string>());

  const loadForPermission = useCallback(async (nextPermission: ScreenshotPermission) => {
    if (nextPermission !== 'granted' && nextPermission !== 'limited') return;
    const screenshots = await loadDeviceScreenshots(nextPermission);
    dispatch({
      type: 'replace',
      screenshots: screenshots.map((screenshot) => {
        const restored = persistedScreenshotsRef.current[screenshot.id];
        return restored
          ? {
              ...screenshot,
              status: restored.status,
              analysis: restored.analysis ?? screenshot.analysis,
            }
          : screenshot;
      }),
    });
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const current = await getScreenshotPermissionState();
      setPermission(current.permission);
      setCanAskAgain(current.canAskAgain);
      await loadForPermission(current.permission);
    } catch {
      setError('We could not load your screenshots. Try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadForPermission]);

  const requestAccess = useCallback(async () => {
    setError(null);
    try {
      const next = await requestScreenshotPermissionState();
      setPermission(next.permission);
      setCanAskAgain(next.canAskAgain);
      await loadForPermission(next.permission);
    } catch {
      setPermission('denied');
      setCanAskAgain(false);
    } finally {
      setLoading(false);
    }
  }, [loadForPermission]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const analyzeScreenshot = useCallback(
    async (id: string) => {
      const screenshot = state[id];
      if (
        !screenshot ||
        screenshot.analysis.status === 'complete' ||
        analysesInFlight.current.has(id)
      ) {
        return;
      }

      analysesInFlight.current.add(id);
      dispatch({
        type: 'analysis',
        id,
        analysis: { ...createIdleScreenshotAnalysis(), status: 'processing' },
      });

      try {
        const ocr = await recognizeScreenshotText(screenshot.uri);
        const localAnalysis: ScreenshotAnalysis = {
          status: 'complete',
          analysisVersion: ANALYSIS_VERSION,
          extractedText: ocr.text,
          blocks: ocr.blocks,
          analysisSource: 'local',
          ...understandScreenshotText(ocr.text),
        };
        let finalAnalysis = localAnalysis;
        if (semanticAnalysisAcknowledgedRef.current) {
          try {
            const semantic = await analyzeScreenshotSemantically({
              uri: screenshot.uri,
              ocrText: ocr.text,
              metadata: screenshot,
            });
            finalAnalysis = { ...localAnalysis, semantic, analysisSource: 'semantic' };
          } catch (semanticError) {
            if (!(semanticError instanceof SemanticAnalysisError)) throw semanticError;
          }
        }
        dispatch({
          type: 'analysis',
          id,
          analysis: finalAnalysis,
        });
        await updateState((current) => {
          const saved = {
            status: current.screenshots[id]?.status ?? screenshot.status,
            analysis: finalAnalysis,
          };
          persistedScreenshotsRef.current = { ...current.screenshots, [id]: saved };
          return { ...current, screenshots: persistedScreenshotsRef.current };
        });
      } catch (analysisError) {
        let message = "Recall couldn't analyze this screenshot. Try again.";
        if (analysisError instanceof OcrError) {
          if (analysisError.code === 'unsupported_platform') {
            message = 'Screenshot analysis is only available on Android and iOS.';
          } else if (analysisError.code === 'module_unavailable') {
            message = 'This build does not include OCR. Install a new development build.';
          } else if (analysisError.code === 'image_load_failed') {
            message = "Recall couldn't load this screenshot. Try again.";
          }
        }
        dispatch({
          type: 'analysis',
          id,
          analysis: { ...createIdleScreenshotAnalysis(), status: 'failed', error: message },
        });
      } finally {
        analysesInFlight.current.delete(id);
      }
    },
    [state, updateState],
  );

  const setStatus = useCallback(
    (id: string, status: ScreenshotStatus) => {
      dispatch({ type: 'status', id, status });
      void updateState((current) => {
        const saved = { ...current.screenshots[id], status };
        persistedScreenshotsRef.current = { ...current.screenshots, [id]: saved };
        return { ...current, screenshots: persistedScreenshotsRef.current };
      });
    },
    [updateState],
  );

  const acknowledgeSemanticAnalysis = useCallback(() => {
    semanticAnalysisAcknowledgedRef.current = true;
    setSemanticAnalysisAcknowledged(true);
    void updateState((current) => ({
      ...current,
      semanticAnalysisAcknowledged: true,
    }));
  }, [updateState]);

  const value = useMemo(
    () => ({
      screenshots: Object.values(state).sort(
        (a, b) => (b.creationTime ?? 0) - (a.creationTime ?? 0),
      ),
      permission,
      canAskAgain,
      loading,
      refreshing,
      error,
      refresh,
      requestAccess,
      setStatus,
      analyzeScreenshot,
      semanticAnalysisAcknowledged,
      acknowledgeSemanticAnalysis,
    }),
    [
      state,
      permission,
      canAskAgain,
      loading,
      refreshing,
      error,
      refresh,
      requestAccess,
      analyzeScreenshot,
      setStatus,
      semanticAnalysisAcknowledged,
      acknowledgeSemanticAnalysis,
    ],
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator accessibilityLabel="Loading screenshots" />
      </View>
    );
  }
  return <ScreenshotContext.Provider value={value}>{children}</ScreenshotContext.Provider>;
}

export function useScreenshots() {
  const value = useContext(ScreenshotContext);
  if (!value) throw new Error('useScreenshots must be used within ScreenshotProvider');
  return value;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
