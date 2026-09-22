import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import {
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
    checkAnalysisRateLimit(request.socket.remoteAddress);
    const body = AnalyzeRequestSchema.parse(await readBody(request));
    const imageDataUrl = body.imageDataUrl ?? `data:image/jpeg;base64,${body.imageBase64}`;
    const analysis = isMockAnalysisEnabled()
      ? analyzeWithMock(body.ocrText)
      : await analyzeWithOpenAI({
          imageDataUrl,
          ocrText: body.ocrText,
          currentTimestamp: new Date().toISOString(),
          timezone: body.timezone,
        });
    sendJson(response, 200, analysis);
  } catch (error) {
    if (error instanceof InvalidJsonError) {
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
      sendJson(response, 502, { error: 'analysis_provider_unavailable' });
    } else {
      sendJson(response, 500, { error: 'internal_error' });
    }
  }
}
