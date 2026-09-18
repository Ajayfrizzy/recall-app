import type { IncomingMessage, ServerResponse } from 'node:http';
import { AnalyzeRequestSchema } from '../schemas/recall-analysis.js';
import { analyzeWithOpenAI } from '../services/openai.js';

async function readBody(request: IncomingMessage): Promise<unknown> {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 13_000_000) throw new Error('payload_too_large');
  }
  return JSON.parse(body);
}

export async function analyzeRoute(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const body = AnalyzeRequestSchema.parse(await readBody(request));
    const imageDataUrl = body.imageDataUrl ?? `data:image/jpeg;base64,${body.imageBase64}`;
    const analysis = await analyzeWithOpenAI({ imageDataUrl, ocrText: body.ocrText });
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(analysis));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'analysis_failed';
    const status = message === 'payload_too_large' ? 413 : 502;
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({ error: status === 413 ? 'payload_too_large' : 'analysis_failed' }),
    );
  }
}
