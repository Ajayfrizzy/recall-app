export type CleanupReason =
  | 'processed'
  | 'saved_to_library'
  | 'action_completed'
  | 'bundled'
  | 'ignored'
  | 'duplicate'
  | 'manual';

export interface ScreenshotHandledState {
  totalItems: number;
  handledItems: number;
  allHandled: boolean;
}

export interface ScreenshotCleanupCandidate {
  screenshotId: string;
  reasons: CleanupReason[];
  confidence: 'safe' | 'review';
  suggested: boolean;
  handledState: ScreenshotHandledState;
  reasonLabels: string[];
}

export interface CleanupDeleteResult {
  requested: number;
  deleted: number;
  failed: string[];
  refreshFailed?: boolean;
}
