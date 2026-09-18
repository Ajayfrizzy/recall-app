import type { ScreenshotAnalysis } from '@/services/understanding/types';

export type ScreenshotStatus = 'pending' | 'kept' | 'ignored' | 'processed';

export interface RecallScreenshot {
  id: string;
  uri: string;
  filename?: string | null;
  width: number;
  height: number;
  creationTime?: number;
  status: ScreenshotStatus;
  analysis: ScreenshotAnalysis;
}
