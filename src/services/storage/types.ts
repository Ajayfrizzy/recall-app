import type { RecallActionRecord } from '@/features/actions/types';
import type { RecallBundle } from '@/features/bundles/types';
import type { LibraryItem } from '@/features/library/types';
import type { ScreenshotStatus } from '@/features/screenshots/types';
import type { UpcomingItem } from '@/features/upcoming/types';
import type { ScreenshotAnalysis } from '@/services/understanding';

export const PERSISTED_STATE_VERSION = 1 as const;
export const ANALYSIS_VERSION = 1 as const;

export interface PersistedScreenshotState {
  status: ScreenshotStatus;
  analysis?: ScreenshotAnalysis;
}

export interface PersistedRecallStateV1 {
  version: typeof PERSISTED_STATE_VERSION;
  screenshots: Record<string, PersistedScreenshotState>;
  library: LibraryItem[];
  upcoming: UpcomingItem[];
  actions: RecallActionRecord[];
  bundles: RecallBundle[];
  semanticAnalysisAcknowledged: boolean;
  onboardingCompleted: boolean;
}

export function createEmptyPersistedState(): PersistedRecallStateV1 {
  return {
    version: PERSISTED_STATE_VERSION,
    screenshots: {},
    library: [],
    upcoming: [],
    actions: [],
    bundles: [],
    semanticAnalysisAcknowledged: false,
    onboardingCompleted: false,
  };
}
