import 'dotenv/config';
import { createServer } from 'node:http';
import { analyzeRoute } from './routes/analyze.js';
import { isMockAnalysisEnabled } from './services/mock-analysis.js';
import { isAnalysisConfigured } from './services/openai.js';

const port = Number(process.env.PORT ?? 8787);
const origin = process.env.ALLOWED_ORIGIN ?? 'http://localhost:8081';

const server = createServer(async (request, response) => {
  response.setHeader('access-control-allow-origin', origin);
  response.setHeader('access-control-allow-headers', 'content-type');
  response.setHeader('access-control-allow-methods', 'POST,GET,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }
  if (request.method === 'GET' && request.url === '/health') {
    const mockAnalysis = isMockAnalysisEnabled();
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        ok: true,
        analysisConfigured: mockAnalysis ? false : isAnalysisConfigured(),
        mockAnalysis,
      }),
    );
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
