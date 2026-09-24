import 'dotenv/config';
import { createServer } from 'node:http';
import { redeemAccessRoute } from './routes/access.js';
import { analyzeRoute } from './routes/analyze.js';

function validateDeploymentConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.MOCK_ANALYSIS?.trim().toLowerCase() === 'true') {
    throw new Error('MOCK_ANALYSIS cannot be enabled in production.');
  }
  const publicUrl = process.env.RECALL_PUBLIC_BASE_URL?.trim();
  if (!publicUrl || new URL(publicUrl).protocol !== 'https:') {
    throw new Error('RECALL_PUBLIC_BASE_URL must be an HTTPS URL in production.');
  }
}

validateDeploymentConfiguration();

const port = Number(process.env.PORT ?? 8787);
const origin = process.env.ALLOWED_ORIGIN ?? 'http://localhost:8081';

const server = createServer(async (request, response) => {
  response.setHeader('access-control-allow-origin', origin);
  response.setHeader('access-control-allow-headers', 'authorization,content-type');
  response.setHeader('access-control-allow-methods', 'POST,GET,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
    return;
  }
  if (request.url === '/access/redeem') {
    if (request.method !== 'POST') {
      response.writeHead(405, { 'content-type': 'application/json', allow: 'POST' });
      response.end(JSON.stringify({ error: 'method_not_allowed' }));
      return;
    }
    await redeemAccessRoute(request, response);
    return;
  }
  if (request.url === '/analyze') {
    if (request.method !== 'POST') {
      response.writeHead(405, { 'content-type': 'application/json', allow: 'POST' });
      response.end(JSON.stringify({ error: 'method_not_allowed' }));
      return;
    }
    await analyzeRoute(request, response);
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, '0.0.0.0', () =>
  console.log(`Recall analysis server listening on http://0.0.0.0:${port}`),
);
