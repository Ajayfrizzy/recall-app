import type { OcrBlock } from '@/services/ocr';
import type { RecallAnalysis } from '@/services/ai/types';

export type ScreenshotCategory = 'event' | 'deadline' | 'product' | 'place' | 'content' | 'general';

export type SuggestedAction =
  'add_to_calendar' | 'create_reminder' | 'save_product' | 'save_place' | 'read_later' | 'keep';

export interface ScreenshotMetadata {
  title?: string;
  date?: string;
  datePrecision?: 'exact' | 'month' | 'year' | 'unknown';
  time?: string;
  location?: string;
  price?: string;
  currency?: string;
  url?: string;
  organization?: string;
}

export interface ScreenshotAnalysis {
  status: 'idle' | 'processing' | 'complete' | 'failed';
  extractedText: string;
  blocks: OcrBlock[];
  category: ScreenshotCategory;
  confidence: number;
  summary: string;
  suggestedAction: SuggestedAction;
  metadata: ScreenshotMetadata;
  missingDetails?: string[];
  analysisSource?: 'semantic' | 'local';
  semantic?: RecallAnalysis;
  error?: string;
}

export type ScreenshotUnderstanding = Pick<
  ScreenshotAnalysis,
  'category' | 'confidence' | 'summary' | 'suggestedAction' | 'metadata' | 'missingDetails'
>;

export function createIdleScreenshotAnalysis(): ScreenshotAnalysis {
  return {
    status: 'idle',
    extractedText: '',
    blocks: [],
    category: 'general',
    confidence: 0,
    summary: '',
    suggestedAction: 'keep',
    metadata: {},
    missingDetails: [],
  };
}
