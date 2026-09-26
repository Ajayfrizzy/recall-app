import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import {
  AccessControlError,
  AnalysisNotConfiguredError,
  InvalidJsonError,
  PayloadTooLargeError,
  ProviderUnavailableError,
  RateLimitExceededError,
} from '../errors.js';
import { checkAnalysisRateLimit } from '../rate-limit.js';
import { AnalyzeRequestSchema } from '../schemas/recall-analysis.js';
import { analyzeWithMock, isMockAnalysisEnabled } from '../services/mock-analysis.js';
import { analyzeWithOpenAI } from '../services/openai.js';
import { bearerToken, getAnalysisAccessStore } from '../services/access-control.js';
import { developmentRequestId, logDevelopmentPerformance } from '../development-performance.js';

const MAX_BODY_BYTES = 13_000_000;

function sendJson(response: ServerResponse, status: number, body: object): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function hasJsonContentType(request: IncomingMessage): boolean {
  const header = request.headers['content-type'];
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(';', 1)[0].trim().toLowerCase() === 'application/json';
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > MAX_BODY_BYTES) throw new PayloadTooLargeError();
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    throw new InvalidJsonError({ cause: error });
  }
}

export async function analyzeRoute(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const requestId = developmentRequestId(request);
  const requestStartedAt = performance.now();
  let requestOutcome: 'ok' | 'failed' | 'cached' | 'mock' = 'ok';
  if (requestId) response.setHeader('x-recall-request-id', requestId);

  try {
    if (!hasJsonContentType(request)) {
      requestOutcome = 'failed';
      sendJson(response, 415, { error: 'invalid_content_type' });
      return;
    }
    const rawToken = bearerToken(request.headers.authorization);
    const limiterKey = rawToken
      ? `token:${createHash('sha256').update(rawToken).digest('hex')}`
      : `address:${request.socket.remoteAddress ?? 'unknown'}`;
    checkAnalysisRateLimit(limiterKey);
    const uploadStartedAt = performance.now();
    let rawBody: unknown;
    try {
      rawBody = await readBody(request);
      logDevelopmentPerformance(requestId, {
        stage: 'upload_receive',
        durationMs: performance.now() - uploadStartedAt,
        outcome: 'ok',
      });
    } catch (error) {
      logDevelopmentPerformance(requestId, {
        stage: 'upload_receive',
        durationMs: performance.now() - uploadStartedAt,
        outcome: 'failed',
      });
      throw error;
    }
    const body = AnalyzeRequestSchema.parse(rawBody);
    const imageDataUrl = body.imageDataUrl ?? `data:image/jpeg;base64,${body.imageBase64}`;
    const access = getAnalysisAccessStore();
    const fingerprint = access.fingerprint([
      imageDataUrl,
      body.ocrText,
      JSON.stringify(body.screenshotMetadata ?? {}),
    ]);
    const reservation = access.reserveAnalysis(rawToken, fingerprint, body.reanalyze);
    if (reservation.kind === 'cached') {
      requestOutcome = 'cached';
      sendJson(response, 200, reservation.analysis);
      return;
    }

    try {
      if (isMockAnalysisEnabled()) {
        requestOutcome = 'mock';
        const analysis = analyzeWithMock(body.ocrText);
        access.completeAnalysis(reservation.id, analysis, {
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
        });
        sendJson(response, 200, analysis);
        return;
      }
      const openAiStartedAt = performance.now();
      let result: Awaited<ReturnType<typeof analyzeWithOpenAI>>;
      try {
        result = await analyzeWithOpenAI({
          imageDataUrl,
          ocrText: body.ocrText,
          currentTimestamp: new Date().toISOString(),
          timezone: body.timezone,
        });
        logDevelopmentPerformance(requestId, {
          stage: 'openai_processing',
          durationMs: performance.now() - openAiStartedAt,
          outcome: 'ok',
        });
      } catch (error) {
        logDevelopmentPerformance(requestId, {
          stage: 'openai_processing',
          durationMs: performance.now() - openAiStartedAt,
          outcome: 'failed',
        });
        throw error;
      }
      access.completeAnalysis(reservation.id, result.analysis, result.usage);
      sendJson(response, 200, result.analysis);
    } catch (error) {
      access.completeAnalysis(reservation.id, undefined, undefined);
      throw error;
    }
  } catch (error) {
    requestOutcome = 'failed';
    if (error instanceof AccessControlError) {
      sendJson(response, error.status, { error: error.code });
    } else if (error instanceof InvalidJsonError) {
      sendJson(response, 400, { error: 'invalid_json' });
    } else if (error instanceof z.ZodError) {
      sendJson(response, 400, { error: 'invalid_request' });
    } else if (error instanceof PayloadTooLargeError) {
      sendJson(response, 413, { error: 'payload_too_large' });
    } else if (error instanceof RateLimitExceededError) {
      sendJson(response, 429, { error: 'rate_limit_exceeded' });
    } else if (error instanceof AnalysisNotConfiguredError) {
      sendJson(response, 503, { error: 'analysis_not_configured' });
    } else if (error instanceof ProviderUnavailableError) {
      if (error.category === 'request_timeout') {
        sendJson(response, 504, { error: 'analysis_timeout' });
      } else {
        sendJson(response, 502, { error: 'analysis_provider_unavailable' });
      }
    } else {
      sendJson(response, 500, { error: 'internal_error' });
    }
  } finally {
    logDevelopmentPerformance(requestId, {
      stage: 'backend_request',
      durationMs: performance.now() - requestStartedAt,
      outcome: requestOutcome,
      statusCode: response.statusCode,
    });
  }
}
