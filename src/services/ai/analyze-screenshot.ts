import { prepareScreenshotForAnalysis } from './prepare-screenshot';
import type { RecallAnalysis } from './types';
import { isRecallAnalysis } from './validation';

export class SemanticAnalysisError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SemanticAnalysisError';
  }
}

function apiUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_ANALYSIS_API_URL?.replace(/\/$/, '');
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
