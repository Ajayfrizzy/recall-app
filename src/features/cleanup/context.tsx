import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { useActions } from '@/features/actions/context';
import { useBundles } from '@/features/bundles/context';
import { useScreenshots } from '@/features/screenshots/context';
import { deleteScreenshotAssets } from '@/features/screenshots/media-library';
import { reconcileCleanupDeleteResult } from './deletion';
import { getCleanupCandidates, selectSafeCandidateIds } from './eligibility';
import type { CleanupDeleteResult, ScreenshotCleanupCandidate } from './types';

interface CleanupContextValue {
  candidates: ScreenshotCleanupCandidate[];
  selectedIds: string[];
  toggleSelected: (id: string) => void;
  selectSafe: () => void;
  deselectAll: () => void;
  deleteSelected: () => Promise<CleanupDeleteResult | undefined>;
  deleting: boolean;
  lastResult?: CleanupDeleteResult;
}

const CleanupContext = createContext<CleanupContextValue | null>(null);

export function CleanupProvider({ children }: PropsWithChildren) {
  const { records } = useActions();
  const { bundles } = useBundles();
  const { screenshots, refresh } = useScreenshots();
  const candidates = useMemo(
    () => getCleanupCandidates(screenshots, records, bundles),
    [screenshots, records, bundles],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupDeleteResult>();
  const previousConfidence = useRef(new Map<string, ScreenshotCleanupCandidate['confidence']>());

  useEffect(() => {
    const candidateIds = new Set(candidates.map((candidate) => candidate.screenshotId));
    setSelectedIds((current) => {
      const next = new Set(current.filter((id) => candidateIds.has(id)));
      for (const candidate of candidates) {
        const previous = previousConfidence.current.get(candidate.screenshotId);
        if (candidate.confidence === 'safe' && previous !== 'safe') {
          next.add(candidate.screenshotId);
        }
      }
      return [...next];
    });
    previousConfidence.current = new Map(
      candidates.map((candidate) => [candidate.screenshotId, candidate.confidence]),
    );
  }, [candidates]);

  const toggleSelected = useCallback(
    (id: string) => {
      if (!candidates.some((candidate) => candidate.screenshotId === id)) return;
      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter((candidateId) => candidateId !== id)
          : [...current, id],
      );
    },
    [candidates],
  );

  const selectSafe = useCallback(
    () => setSelectedIds(selectSafeCandidateIds(candidates)),
    [candidates],
  );
  const deselectAll = useCallback(() => setSelectedIds([]), []);

  const deleteSelected = useCallback(async () => {
    const requestedIds = selectedIds.filter((id) =>
      candidates.some((candidate) => candidate.screenshotId === id),
    );
    if (!requestedIds.length || deleting) return undefined;
    setDeleting(true);
    setLastResult(undefined);
    let batchReportedSuccess = false;
    try {
      try {
        batchReportedSuccess = await deleteScreenshotAssets(requestedIds);
      } catch {
        // Refresh below determines whether a rejected native request deleted any selected assets.
      }
      const refreshed = await refresh();
      const result = reconcileCleanupDeleteResult(
        requestedIds,
        refreshed?.map((screenshot) => screenshot.id) ?? null,
        batchReportedSuccess,
      );
      setLastResult(result);
      return result;
    } finally {
      setDeleting(false);
    }
  }, [candidates, deleting, refresh, selectedIds]);

  const value = useMemo<CleanupContextValue>(
    () => ({
      candidates,
      selectedIds,
      toggleSelected,
      selectSafe,
      deselectAll,
      deleteSelected,
      deleting,
      lastResult,
    }),
    [
      candidates,
      selectedIds,
      toggleSelected,
      selectSafe,
      deselectAll,
      deleteSelected,
      deleting,
      lastResult,
    ],
  );
  return <CleanupContext.Provider value={value}>{children}</CleanupContext.Provider>;
}

export function useCleanup() {
  const value = useContext(CleanupContext);
  if (!value) throw new Error('useCleanup must be used within CleanupProvider');
  return value;
}
