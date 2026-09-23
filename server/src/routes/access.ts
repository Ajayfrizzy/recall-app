import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { AccessControlError, InvalidJsonError, PayloadTooLargeError } from '../errors.js';
import { getAnalysisAccessStore } from '../services/access-control.js';

const RedeemSchema = z.object({ code: z.string().trim().min(8).max(128) }).strict();
const MAX_BODY_BYTES = 2_048;

function sendJson(response: ServerResponse, status: number, body: object): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
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

export async function redeemAccessRoute(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const header = request.headers['content-type'];
    const contentType = Array.isArray(header) ? header[0] : header;
    if (contentType?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
      sendJson(response, 415, { error: 'invalid_content_type' });
      return;
    }
    const { code } = RedeemSchema.parse(await readBody(request));
    const result = getAnalysisAccessStore().redeemInvitation(code, request.socket.remoteAddress);
    sendJson(response, 200, result);
  } catch (error) {
    if (error instanceof AccessControlError) {
      sendJson(response, error.status, { error: error.code });
    } else if (error instanceof InvalidJsonError || error instanceof z.ZodError) {
      sendJson(response, 400, { error: 'invalid_request' });
    } else if (error instanceof PayloadTooLargeError) {
      sendJson(response, 413, { error: 'payload_too_large' });
    } else {
      sendJson(response, 500, { error: 'internal_error' });
    }
  }
}
