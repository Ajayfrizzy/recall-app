import OpenAI from 'openai';
import { AnalysisNotConfiguredError, ProviderUnavailableError } from '../errors.js';
import {
  RecallAnalysisJsonSchema,
  RecallAnalysisSchema,
  type RecallAnalysis,
} from '../schemas/recall-analysis.js';

const DEFAULT_MODEL = 'gpt-5-mini';
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_OUTPUT_TOKENS = 4_000;
let cachedClient: { apiKey: string; client: OpenAI } | undefined;

export function getAnalysisModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export function isAnalysisConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AnalysisNotConfiguredError();
  if (!cachedClient || cachedClient.apiKey !== apiKey) {
    cachedClient = {
      apiKey,
      client: new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 }),
    };
  }
  return cachedClient.client;
}

export const RECALL_INSTRUCTIONS = `You analyze screenshots for Recall, a screenshot-to-action productivity app.

Use BOTH the image and OCR text. The OCR order may be imperfect. Identify the real semantic units in the screenshot, associate nearby titles and values, separate distinct actionable items, and ignore app controls or other UI chrome.

Do not invent missing details. Use confidence scores conservatively. Dates must preserve their raw visible text; normalize only when justified, use exact/month/year/unknown precision, and never invent an exact date or time. For products, keep title-price pairs together and preserve currency. For events, extract visible title, location, date, and time and identify missing details. For deadlines, distinguish deadline dates from publication dates. For content, summarize concisely and identify a visible source or author. Use general when no stronger category fits. Suggested actions must correspond to the detected item types. Return only data conforming to the supplied schema.`;

export async function analyzeWithOpenAI(input: {
  imageDataUrl: string;
  ocrText: string;
  currentTimestamp: string;
  timezone?: string;
}): Promise<RecallAnalysis> {
  const client = getOpenAIClient();
  const model = getAnalysisModel();
  const startedAt = Date.now();
  try {
    const response = await client.responses.create({
      model,
      store: false,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      instructions: RECALL_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Current timestamp: ${input.currentTimestamp}\nTimezone: ${input.timezone ?? 'unknown'}\nUse this context only to interpret genuinely relative dates.\n\nOCR text (supporting evidence):\n${input.ocrText}`,
            },
            { type: 'input_image', image_url: input.imageDataUrl, detail: 'high' },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'recall_analysis',
          strict: true,
          schema: RecallAnalysisJsonSchema,
        },
      },
    });
    const parsed: unknown = JSON.parse(response.output_text);
    const analysis = RecallAnalysisSchema.parse(parsed);
    console.info('[openai-analysis]', {
      model,
      status: 'ok',
      durationMs: Date.now() - startedAt,
      category: analysis.category,
      itemCount: analysis.items.length,
    });
    return analysis;
  } catch (error) {
    console.warn('[openai-analysis]', {
      model,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      providerStatus: error instanceof OpenAI.APIError ? error.status : undefined,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    throw new ProviderUnavailableError({ cause: error });
  }
}
