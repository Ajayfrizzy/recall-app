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
  if (!hasJsonContentType(request)) {
    sendJson(response, 415, { error: 'invalid_content_type' });
    return;
  }

  try {
    const rawToken = bearerToken(request.headers.authorization);
    const limiterKey = rawToken
      ? `token:${createHash('sha256').update(rawToken).digest('hex')}`
      : `address:${request.socket.remoteAddress ?? 'unknown'}`;
    checkAnalysisRateLimit(limiterKey);
    const body = AnalyzeRequestSchema.parse(await readBody(request));
    const imageDataUrl = body.imageDataUrl ?? `data:image/jpeg;base64,${body.imageBase64}`;
    const access = getAnalysisAccessStore();
    const fingerprint = access.fingerprint([
      imageDataUrl,
      body.ocrText,
      JSON.stringify(body.screenshotMetadata ?? {}),
    ]);
    const reservation = access.reserveAnalysis(rawToken, fingerprint, body.reanalyze);
    if (reservation.kind === 'cached') {
      sendJson(response, 200, reservation.analysis);
      return;
    }

    try {
      if (isMockAnalysisEnabled()) {
        const analysis = analyzeWithMock(body.ocrText);
        access.completeAnalysis(reservation.id, analysis, {
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
        });
        sendJson(response, 200, analysis);
        return;
      }
      const result = await analyzeWithOpenAI({
        imageDataUrl,
        ocrText: body.ocrText,
        currentTimestamp: new Date().toISOString(),
        timezone: body.timezone,
      });
      access.completeAnalysis(reservation.id, result.analysis, result.usage);
      sendJson(response, 200, result.analysis);
    } catch (error) {
      access.completeAnalysis(reservation.id, undefined, undefined);
      throw error;
    }
  } catch (error) {
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
  }
}
