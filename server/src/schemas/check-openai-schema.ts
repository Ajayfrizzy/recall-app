import 'dotenv/config';
import assert from 'node:assert/strict';
import { analyzeWithOpenAI } from '../services/openai.js';
import { parseModelRecallAnalysis, RecallAnalysisJsonSchema } from './recall-analysis.js';

const forbiddenKeywords = new Set([
  '$defs',
  '$ref',
  '$schema',
  'allOf',
  'const',
  'definitions',
  'dependentRequired',
  'dependentSchemas',
  'else',
  'if',
  'not',
  'then',
]);

function inspectSchema(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectSchema(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const schema = value as Record<string, unknown>;
  for (const keyword of Object.keys(schema)) {
    assert(!forbiddenKeywords.has(keyword), `${path} contains unsupported keyword ${keyword}`);
  }

  if (schema.properties && typeof schema.properties === 'object') {
    assert.equal(schema.type, 'object', `${path} properties must belong to an object`);
    assert.equal(schema.additionalProperties, false, `${path} must reject additional properties`);
    const properties = Object.keys(schema.properties as Record<string, unknown>).sort();
    assert(Array.isArray(schema.required), `${path} must declare all properties as required`);
    assert.deepEqual(
      [...schema.required].sort(),
      properties,
      `${path} required keys must be exact`,
    );
  }

  for (const [key, child] of Object.entries(schema)) inspectSchema(child, `${path}.${key}`);
}

assert.equal(RecallAnalysisJsonSchema.type, 'object', 'Structured Output root must be an object');
assert(!('anyOf' in RecallAnalysisJsonSchema), 'Structured Output root must not use anyOf');
inspectSchema(RecallAnalysisJsonSchema);

const normalized = parseModelRecallAnalysis({
  category: 'general',
  confidence: 0.8,
  summary: 'A simple note.',
  cardinality: 'single',
  sourceApp: null,
  items: [{ type: 'general', suggestedAction: null, summary: 'A simple note.', confidence: 0.8 }],
  suggestedActions: [],
  warnings: null,
});
assert.equal(normalized.sourceApp, undefined);
assert.equal(normalized.warnings, undefined);
assert.equal(normalized.items[0]?.suggestedAction, null);

console.log('OpenAI Structured Output schema checks passed');

if (process.env.RUN_OPENAI_LIVE_TEST === 'true') {
  assert(process.env.OPENAI_API_KEY?.trim(), 'OPENAI_API_KEY is required for the live check');
  const { analysis } = await analyzeWithOpenAI({
    imageDataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    ocrText: 'A simple note with no actionable structure.',
    currentTimestamp: '2026-09-22T12:00:00.000Z',
    timezone: 'Africa/Lagos',
  });
  console.log('OpenAI live schema check passed', {
    category: analysis.category,
    itemCount: analysis.items.length,
  });
} else {
  console.log('OpenAI live schema check skipped; set RUN_OPENAI_LIVE_TEST=true to enable it');
}
