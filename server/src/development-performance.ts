import type { IncomingMessage } from 'node:http';

const DEVELOPMENT_REQUEST_ID = /^dev-[a-z0-9]{6,16}-[a-z0-9]{8}$/;

export type ServerPerformanceStage = 'upload_receive' | 'openai_processing' | 'backend_request';

export function developmentRequestId(
  request: Pick<IncomingMessage, 'headers'>,
): string | undefined {
  const header = request.headers['x-recall-request-id'];
  const value = Array.isArray(header) ? header[0] : header;
  return value && DEVELOPMENT_REQUEST_ID.test(value) ? value : undefined;
}

export function logDevelopmentPerformance(
  requestId: string | undefined,
  measurement: {
    stage: ServerPerformanceStage;
    durationMs: number;
    outcome: 'ok' | 'failed' | 'cached' | 'mock';
    statusCode?: number;
  },
): void {
  if (!requestId) return;
  console.info('[recall-performance]', {
    requestId,
    ...measurement,
  });
}
