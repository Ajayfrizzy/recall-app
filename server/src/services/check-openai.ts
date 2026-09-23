import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { z } from 'zod';
import { AnalysisNotConfiguredError } from '../errors.js';
import { RecallAnalysisSchema } from '../schemas/recall-analysis.js';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  RECALL_INSTRUCTIONS,
  classifyOpenAIError,
  getOpenAIReasoningEffort,
  getOpenAIRequestTimeoutMs,
  getOpenAITextVerbosity,
  removeIrrelevantGeneralItems,
} from './openai.js';

assert.equal(getOpenAIRequestTimeoutMs({}), DEFAULT_REQUEST_TIMEOUT_MS);
assert.equal(getOpenAIRequestTimeoutMs({ OPENAI_REQUEST_TIMEOUT_MS: '60000' }), 60_000);
for (const invalidValue of ['not-a-number', '4999', '120001', '45000.5', '']) {
  assert.equal(
    getOpenAIRequestTimeoutMs({ OPENAI_REQUEST_TIMEOUT_MS: invalidValue }),
    DEFAULT_REQUEST_TIMEOUT_MS,
  );
}

assert.equal(getOpenAIReasoningEffort({}), 'low');
assert.equal(getOpenAIReasoningEffort({ OPENAI_REASONING_EFFORT: 'high' }), 'high');
assert.equal(getOpenAIReasoningEffort({ OPENAI_REASONING_EFFORT: 'invalid' }), 'low');
assert.equal(getOpenAITextVerbosity({}), 'low');
assert.equal(getOpenAITextVerbosity({ OPENAI_TEXT_VERBOSITY: 'medium' }), 'medium');
assert.equal(getOpenAITextVerbosity({ OPENAI_TEXT_VERBOSITY: 'invalid' }), 'low');

assert.equal(classifyOpenAIError(new OpenAI.APIConnectionTimeoutError()), 'request_timeout');
assert.equal(
  classifyOpenAIError(new OpenAI.APIConnectionError({ cause: new Error('socket closed') })),
  'network_connection_failure',
);
assert.equal(
  classifyOpenAIError(
    new OpenAI.APIError(
      429,
      { code: 'rate_limit_exceeded', message: 'rate limited' },
      undefined,
      new Headers(),
    ),
  ),
  'openai_api_error',
);
assert.equal(classifyOpenAIError(new SyntaxError('invalid JSON')), 'invalid_json_response');
assert.equal(classifyOpenAIError(new z.ZodError([])), 'schema_validation_failure');
assert.equal(
  classifyOpenAIError(new AnalysisNotConfiguredError()),
  'missing_backend_configuration',
);

const productWithScreenshotMetadata = RecallAnalysisSchema.parse({
  category: 'mixed',
  confidence: 0.88,
  summary: 'One product and screenshot metadata.',
  cardinality: 'multiple',
  items: [
    {
      type: 'product',
      title: 'Example laptop, 16GB RAM',
      currentPrice: { amount: 900000, currency: 'NGN', raw: '₦900,000' },
      confidence: 0.9,
    },
    {
      type: 'general',
      summary: 'Screenshot filename and image resolution shown by the Recall interface.',
      confidence: 0.99,
    },
  ],
  suggestedActions: ['save_product'],
});
const cleanedProduct = removeIrrelevantGeneralItems(productWithScreenshotMetadata);
assert.equal(cleanedProduct.category, 'product');
assert.equal(cleanedProduct.cardinality, 'single');
assert.equal(cleanedProduct.items.length, 1);
assert.equal(cleanedProduct.items[0]?.type, 'product');

assert.match(RECALL_INSTRUCTIONS, /do not create a general item/i);
assert.match(
  RECALL_INSTRUCTIONS,
  /preserve genuinely distinct content even when it has no useful action/i,
);
assert.match(RECALL_INSTRUCTIONS, /Notification and message timestamps/i);
assert.match(RECALL_INSTRUCTIONS, /Playback values[\s\S]*must never become RecallDate/i);
assert.match(RECALL_INSTRUCTIONS, /device clock does not establish an event date/i);
assert.match(RECALL_INSTRUCTIONS, /Do not force an action onto every item/i);
assert.match(RECALL_INSTRUCTIONS, /Temporary device status should normally have no action/i);
assert.match(RECALL_INSTRUCTIONS, /truncated social notification alone is insufficient/i);

console.log('OpenAI configuration and failure classification checks passed');
