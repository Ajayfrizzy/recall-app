import { prepareScreenshotForAnalysis } from './prepare-screenshot';
import type { RecallAnalysis, RecallDate, RecallItem } from './types';

const CATEGORIES = new Set([
  'event',
  'deadline',
  'product',
  'place',
  'content',
  'general',
  'mixed',
]);
const ITEM_TYPES = new Set(['product', 'event', 'deadline', 'place', 'content', 'general']);
const ACTIONS = new Set([
  'add_to_calendar',
  'create_reminder',
  'save_product',
  'save_place',
  'read_later',
  'keep',
]);
const DATE_TYPES = new Set([
  'event',
  'deadline',
  'published',
  'expires',
  'purchase',
  'travel',
  'other',
]);
const DATE_PRECISIONS = new Set(['exact', 'month', 'year', 'unknown']);

export class SemanticAnalysisError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SemanticAnalysisError';
  }
}

function apiUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.replace(/\/$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isRecallDate(value: unknown): value is RecallDate {
  if (!isRecord(value)) return false;
  return (
    typeof value.type === 'string' &&
    DATE_TYPES.has(value.type) &&
    typeof value.raw === 'string' &&
    isOptionalString(value.normalized) &&
    typeof value.precision === 'string' &&
    DATE_PRECISIONS.has(value.precision) &&
    isConfidence(value.confidence)
  );
}

function isPrice(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    isRecord(value) &&
    typeof value.amount === 'number' &&
    Number.isFinite(value.amount) &&
    typeof value.currency === 'string' &&
    typeof value.raw === 'string'
  );
}

function isRecallItem(value: unknown): value is RecallItem {
  if (!isRecord(value) || typeof value.type !== 'string' || !ITEM_TYPES.has(value.type))
    return false;
  if (!isConfidence(value.confidence)) return false;

  if (value.type === 'product') {
    return (
      typeof value.title === 'string' &&
      isPrice(value.currentPrice) &&
      isPrice(value.originalPrice) &&
      isOptionalString(value.discount) &&
      isOptionalString(value.source)
    );
  }
  if (value.type === 'event') {
    return (
      typeof value.title === 'string' &&
      isOptionalString(value.location) &&
      Array.isArray(value.dates) &&
      value.dates.every(isRecallDate) &&
      (value.missingDetails === undefined ||
        (Array.isArray(value.missingDetails) &&
          value.missingDetails.every((detail) => typeof detail === 'string')))
    );
  }
  if (value.type === 'deadline') {
    return (
      typeof value.title === 'string' &&
      isOptionalString(value.organization) &&
      Array.isArray(value.dates) &&
      value.dates.every(isRecallDate)
    );
  }
  if (value.type === 'place') {
    return (
      typeof value.title === 'string' &&
      isOptionalString(value.address) &&
      isOptionalString(value.source)
    );
  }
  if (value.type === 'content') {
    return (
      isOptionalString(value.title) &&
      isOptionalString(value.author) &&
      isOptionalString(value.source) &&
      typeof value.summary === 'string' &&
      Array.isArray(value.dates) &&
      value.dates.every(isRecallDate)
    );
  }
  return typeof value.summary === 'string';
}

function isRecallAnalysis(value: unknown): value is RecallAnalysis {
  if (!isRecord(value)) return false;
  return (
    typeof value.category === 'string' &&
    CATEGORIES.has(value.category) &&
    isConfidence(value.confidence) &&
    typeof value.summary === 'string' &&
    (value.cardinality === 'single' || value.cardinality === 'multiple') &&
    isOptionalString(value.sourceApp) &&
    Array.isArray(value.items) &&
    value.items.every(isRecallItem) &&
    Array.isArray(value.suggestedActions) &&
    value.suggestedActions.every((action) => typeof action === 'string' && ACTIONS.has(action)) &&
    (value.warnings === undefined ||
      (Array.isArray(value.warnings) &&
        value.warnings.every((warning) => typeof warning === 'string')))
  );
}

function backendErrorMessage(status: number): string {
  if (status === 400) return 'Semantic analysis request was rejected.';
  if (status === 413) return 'Prepared screenshot is too large for semantic analysis.';
  if (status === 503) return 'Semantic analysis is not configured.';
  if (status === 502) return 'Semantic analysis provider is unavailable.';
  return 'Semantic analysis is unavailable.';
}

export async function analyzeScreenshotSemantically(input: {
  uri: string;
  ocrText: string;
  metadata: { filename?: string | null; width: number; height: number; creationTime?: number };
}): Promise<RecallAnalysis> {
  const baseUrl = apiUrl();
  if (!baseUrl) throw new SemanticAnalysisError('Semantic analysis is not configured.');

  try {
    const prepared = await prepareScreenshotForAnalysis(input.uri, {
      width: input.metadata.width,
      height: input.metadata.height,
    });
    const response = await fetch(`${baseUrl}/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: prepared.imageDataUrl,
        ocrText: input.ocrText,
        screenshotMetadata: {
          filename: input.metadata.filename ?? undefined,
          width: input.metadata.width,
          height: input.metadata.height,
          creationTime: input.metadata.creationTime,
          analysisWidth: prepared.width,
          analysisHeight: prepared.height,
        },
      }),
    });
    if (!response.ok) throw new SemanticAnalysisError(backendErrorMessage(response.status));

    const result: unknown = await response.json();
    if (!isRecallAnalysis(result)) {
      throw new SemanticAnalysisError('Semantic analysis returned an invalid result.');
    }
    return result;
  } catch (error) {
    if (error instanceof SemanticAnalysisError) throw error;
    throw new SemanticAnalysisError('Semantic analysis is unavailable.', { cause: error });
  }
}
