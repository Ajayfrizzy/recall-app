import type { RecallAnalysis } from './types';

export class SemanticAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SemanticAnalysisError';
  }
}

function apiUrl(): string | undefined {
  const value = process.env.EXPO_PUBLIC_ANALYSIS_API_URL;
  return value?.replace(/\/$/, '');
}

async function imageUriToDataUrl(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok)
    throw new SemanticAnalysisError('Could not load screenshot for semantic analysis.');
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('image_encoding_failed'));
    reader.onerror = () => reject(new Error('image_encoding_failed'));
    reader.readAsDataURL(blob);
  });
}

function isRecallAnalysis(value: unknown): value is RecallAnalysis {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<RecallAnalysis>;
  return (
    typeof result.category === 'string' &&
    typeof result.confidence === 'number' &&
    Array.isArray(result.items) &&
    Array.isArray(result.suggestedActions)
  );
}

export async function analyzeScreenshotSemantically(input: {
  uri: string;
  ocrText: string;
  metadata: { filename?: string | null; width: number; height: number; creationTime?: number };
}): Promise<RecallAnalysis> {
  const baseUrl = apiUrl();
  if (!baseUrl) throw new SemanticAnalysisError('Semantic analysis is not configured.');
  const imageDataUrl = await imageUriToDataUrl(input.uri);
  const response = await fetch(`${baseUrl}/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      imageDataUrl,
      ocrText: input.ocrText,
      screenshotMetadata: input.metadata,
    }),
  });
  if (!response.ok) throw new SemanticAnalysisError('Semantic analysis is unavailable.');
  const result: unknown = await response.json();
  if (!isRecallAnalysis(result))
    throw new SemanticAnalysisError('Semantic analysis returned an invalid result.');
  return result;
}
