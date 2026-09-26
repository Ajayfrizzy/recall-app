import { aiAccessClient, getAnalysisApiUrl } from './access';
import { prepareScreenshotForAnalysis } from './prepare-screenshot';
import type { RecallAnalysis } from './types';
import { isRecallAnalysis } from './validation';
import { readResponseJson } from './response-json';
import { authorizedAnalysisHeaders } from './analysis-policy';
import {
  developmentPerformanceNow,
  logDevelopmentPerformance,
} from '@/services/development-performance';

export type SemanticAnalysisErrorCode =
  | 'missing_access_token'
  | 'invalid_access_token'
  | 'access_token_expired'
  | 'access_token_revoked'
  | 'installation_allowance_exhausted'
  | 'global_allowance_exhausted'
  | 'analysis_busy'
  | 'analysis_disabled'
  | 'estimated_spending_limit_exhausted'
  | 'duplicate_analysis_in_progress'
  | 'analysis_timeout'
  | 'analysis_provider_unavailable'
  | 'analysis_not_configured'
  | 'rate_limit_exceeded'
  | 'invalid_response'
  | 'network_failure'
  | 'request_rejected';

export class SemanticAnalysisError extends Error {
  constructor(
    message: string,
    readonly code: SemanticAnalysisErrorCode,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SemanticAnalysisError';
  }
}

const SERVER_ERROR_MESSAGES: Partial<Record<SemanticAnalysisErrorCode, string>> = {
  missing_access_token: 'Activate Recall AI to use secure AI analysis.',
  invalid_access_token: 'Your AI access is no longer valid. Enter a new invitation code.',
  access_token_expired: 'Your AI access has expired. Enter a new invitation code to continue.',
  access_token_revoked: 'Your AI access was revoked. Enter a new invitation code to continue.',
  installation_allowance_exhausted:
    "You've reached today's AI analysis limit. On-device analysis is still available.",
  global_allowance_exhausted:
    'Recall AI has reached its daily limit. On-device analysis is still available.',
  analysis_busy: 'Recall AI is busy right now. On-device analysis is still available.',
  analysis_disabled:
    'Recall AI is temporarily unavailable. You can continue using on-device analysis.',
  estimated_spending_limit_exhausted:
    'Recall AI is temporarily unavailable. You can continue using on-device analysis.',
  duplicate_analysis_in_progress: 'This screenshot is already being analyzed.',
  analysis_timeout: 'AI analysis took too long, so Recall used on-device analysis.',
  analysis_provider_unavailable:
    'Recall AI is temporarily unavailable. You can continue using on-device analysis.',
  analysis_not_configured:
    'Recall AI is temporarily unavailable. You can continue using on-device analysis.',
  rate_limit_exceeded: 'Recall AI is busy right now. On-device analysis is still available.',
};

function serverErrorCode(value: unknown): SemanticAnalysisErrorCode | null {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (value as { error?: unknown }).error !== 'string'
  ) {
    return null;
  }
  const code = (value as { error: string }).error as SemanticAnalysisErrorCode;
  return code in SERVER_ERROR_MESSAGES ? code : null;
}

export async function analyzeScreenshotSemantically(input: {
  uri: string;
  ocrText: string;
  metadata: { filename?: string | null; width: number; height: number; creationTime?: number };
  accessToken: string;
  requestId?: string;
  reanalyze?: boolean;
}): Promise<RecallAnalysis> {
  if (!input.accessToken) {
    throw new SemanticAnalysisError(
      'Activate Recall AI to use secure AI analysis.',
      'missing_access_token',
    );
  }

  try {
    const baseUrl = getAnalysisApiUrl();
    const prepared = await prepareScreenshotForAnalysis(
      input.uri,
      {
        width: input.metadata.width,
        height: input.metadata.height,
      },
      input.requestId,
    );
    if (input.requestId) {
      const base64 = prepared.imageDataUrl.slice(prepared.imageDataUrl.indexOf(',') + 1);
      const paddingBytes = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
      logDevelopmentPerformance({
        requestId: input.requestId,
        stage: 'prepared_image',
        imageBytes: Math.floor((base64.length * 3) / 4) - paddingBytes,
        outcome: 'ok',
      });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);
    let response: Response;
    const requestStartedAt = developmentPerformanceNow();
    try {
      response = await fetch(`${baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          ...authorizedAnalysisHeaders(input.accessToken),
          ...(input.requestId ? { 'x-recall-request-id': input.requestId } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          imageDataUrl: prepared.imageDataUrl,
          ocrText: input.ocrText,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          screenshotMetadata: {
            filename: input.metadata.filename ?? undefined,
            width: input.metadata.width,
            height: input.metadata.height,
            creationTime: input.metadata.creationTime,
            analysisWidth: prepared.width,
            analysisHeight: prepared.height,
          },
          ...(input.reanalyze ? { reanalyze: true } : {}),
        }),
      });
      if (input.requestId) {
        logDevelopmentPerformance({
          requestId: input.requestId,
          stage: 'backend_round_trip',
          durationMs: developmentPerformanceNow() - requestStartedAt,
          outcome: response.ok ? 'ok' : 'failed',
        });
      }
    } catch (error) {
      clearTimeout(timeout);
      logDevelopmentPerformance({
        requestId: input.requestId,
        stage: 'backend_round_trip',
        durationMs: developmentPerformanceNow() - requestStartedAt,
        outcome: 'failed',
      });
      if (controller.signal.aborted) {
        throw new SemanticAnalysisError(
          'AI analysis took too long, so Recall used on-device analysis.',
          'analysis_timeout',
          { cause: error },
        );
      }
      throw error;
    }
    let result: unknown;
    const parseStartedAt = developmentPerformanceNow();
    try {
      result = await readResponseJson(response, controller.signal);
      if (input.requestId) {
        logDevelopmentPerformance({
          requestId: input.requestId,
          stage: 'response_parse',
          durationMs: developmentPerformanceNow() - parseStartedAt,
          outcome: 'ok',
        });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        throw new SemanticAnalysisError(
          'AI analysis took too long, so Recall used on-device analysis.',
          'analysis_timeout',
          { cause: error },
        );
      }
      if (input.requestId) {
        logDevelopmentPerformance({
          requestId: input.requestId,
          stage: 'response_parse',
          durationMs: developmentPerformanceNow() - parseStartedAt,
          outcome: 'failed',
        });
      }
      throw new SemanticAnalysisError(
        'Recall AI returned an invalid response, so on-device analysis was used.',
        'invalid_response',
        { cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const code = serverErrorCode(result);
      if (code) {
        if (
          code === 'invalid_access_token' ||
          code === 'access_token_expired' ||
          code === 'access_token_revoked'
        ) {
          await aiAccessClient.clear().catch(() => undefined);
        }
        throw new SemanticAnalysisError(SERVER_ERROR_MESSAGES[code]!, code);
      }
      throw new SemanticAnalysisError(
        response.status === 413
          ? 'The prepared screenshot is too large for AI analysis.'
          : 'Recall AI rejected the request, so on-device analysis was used.',
        'request_rejected',
      );
    }
    const validationStartedAt = developmentPerformanceNow();
    if (isRecallAnalysis(result)) {
      logDevelopmentPerformance({
        requestId: input.requestId,
        stage: 'response_validation',
        durationMs: developmentPerformanceNow() - validationStartedAt,
        outcome: 'ok',
      });
      return result;
    }
    logDevelopmentPerformance({
      requestId: input.requestId,
      stage: 'response_validation',
      durationMs: developmentPerformanceNow() - validationStartedAt,
      outcome: 'failed',
    });
    throw new SemanticAnalysisError(
      'Recall AI returned an invalid result, so on-device analysis was used.',
      'invalid_response',
    );
  } catch (error) {
    if (error instanceof SemanticAnalysisError) throw error;
    throw new SemanticAnalysisError(
      'Recall AI could not be reached. On-device analysis is still available.',
      'network_failure',
      { cause: error },
    );
  }
}
