import OpenAI from 'openai';
import { z } from 'zod';
import {
  AnalysisNotConfiguredError,
  ProviderUnavailableError,
  type ProviderFailureCategory,
} from '../errors.js';
import {
  RecallAnalysisJsonSchema,
  parseModelRecallAnalysis,
  type RecallAnalysis,
} from '../schemas/recall-analysis.js';
import type { ProviderUsage } from './access-control.js';

const DEFAULT_MODEL = 'gpt-5-mini';
export const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
const MIN_REQUEST_TIMEOUT_MS = 5_000;
const MAX_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_REASONING_EFFORT = 'low';
const DEFAULT_TEXT_VERBOSITY = 'low';
const MAX_OUTPUT_TOKENS = 4_000;
const REASONING_EFFORTS = ['minimal', 'low', 'medium', 'high'] as const;
const TEXT_VERBOSITIES = ['low', 'medium', 'high'] as const;
type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
type TextVerbosity = (typeof TEXT_VERBOSITIES)[number];
type Environment = Record<string, string | undefined>;

let cachedClient: { apiKey: string; timeoutMs: number; client: OpenAI } | undefined;

function conciseProviderMessage(message: string, sensitiveValues: string[] = []): string {
  let redacted = message;
  for (const value of sensitiveValues) {
    if (value && redacted.includes(value)) redacted = redacted.replaceAll(value, '[redacted]');
  }
  return redacted
    .replace(/data:image\/[^;\s]+;base64,[A-Za-z0-9+/=]+/g, '[redacted-image]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-key]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 700);
}

export function getOpenAIErrorDetails(
  error: unknown,
  sensitiveValues: string[] = [],
): {
  status?: number;
  code?: string;
  param?: string;
  message: string;
} {
  if (error instanceof OpenAI.APIError) {
    return {
      status: error.status,
      code: typeof error.code === 'string' ? error.code : undefined,
      param: typeof error.param === 'string' ? error.param : undefined,
      message: conciseProviderMessage(error.message, sensitiveValues),
    };
  }
  return {
    message: conciseProviderMessage(
      error instanceof Error ? error.message : 'Unknown error',
      sensitiveValues,
    ),
  };
}

export function getAnalysisModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

function configuredEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = value?.trim().toLowerCase();
  return allowed.includes(normalized as T) ? (normalized as T) : fallback;
}

export function getOpenAIRequestTimeoutMs(env: Environment = process.env): number {
  const raw = env.OPENAI_REQUEST_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_REQUEST_TIMEOUT_MS;
  const timeout = Number(raw);
  return Number.isInteger(timeout) &&
    timeout >= MIN_REQUEST_TIMEOUT_MS &&
    timeout <= MAX_REQUEST_TIMEOUT_MS
    ? timeout
    : DEFAULT_REQUEST_TIMEOUT_MS;
}

export function getOpenAIReasoningEffort(env: Environment = process.env): ReasoningEffort {
  return configuredEnum(env.OPENAI_REASONING_EFFORT, REASONING_EFFORTS, DEFAULT_REASONING_EFFORT);
}

export function getOpenAITextVerbosity(env: Environment = process.env): TextVerbosity {
  return configuredEnum(env.OPENAI_TEXT_VERBOSITY, TEXT_VERBOSITIES, DEFAULT_TEXT_VERBOSITY);
}

export function isAnalysisConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AnalysisNotConfiguredError();
  const timeoutMs = getOpenAIRequestTimeoutMs();
  if (!cachedClient || cachedClient.apiKey !== apiKey || cachedClient.timeoutMs !== timeoutMs) {
    cachedClient = {
      apiKey,
      timeoutMs,
      client: new OpenAI({ apiKey, timeout: timeoutMs, maxRetries: 0 }),
    };
  }
  return cachedClient.client;
}

export const RECALL_INSTRUCTIONS = `You analyze screenshots for Recall, a screenshot-to-action productivity app.

Use BOTH the image and OCR text. The OCR order may be imperfect. Identify the real semantic units in the screenshot, associate nearby titles and values, and preserve genuinely distinct content even when it has no useful action. Ignore incidental status-bar indicators, device clocks, navigation controls, playback controls, and other UI chrome. A full notification card can be a semantic item, but a status-bar notification icon is not. Do not create a general item for Recall's interface, screenshot filenames, asset IDs, image dimensions, screenshot status, or navigation controls when meaningful content is present.

Do not invent missing details. State when visible content is truncated or incomplete and do not reconstruct hidden notification, message, article, or post text. Use confidence scores conservatively.

Create RecallDate values only when there is sufficient evidence that a date belongs to the underlying content. Distinguish publication dates, event dates, application deadlines, expiration dates, purchase dates, and travel dates from notification timestamps, message timestamps, media playback positions or durations, the device clock, and screenshot capture time. Notification and message timestamps describe when the wrapper was delivered, not when linked content was published. Never infer a publication date from them. A device clock does not establish an event date. Playback values such as "01:46 / 04:25" are elapsed and total duration and must never become RecallDate values. The supplied current timestamp and timezone are context only for explicitly relative content dates such as "tomorrow"; they are not content dates. Preserve the raw visible text for genuine dates; normalize only when justified, use exact/month/year/unknown precision, and never invent an exact date or time. Preserve genuine event dates and application deadlines.

For products, keep title-price pairs together, preserve currency, include a visibly selected configuration in the product title when it distinguishes the item, and retain relevant availability in the overall summary. Keep multiple products distinct. For events, extract visible title, location, date, and time and identify missing details. For deadlines, distinguish deadline dates from publication dates. For content, summarize concisely and identify a visible source or author. For music or video players, identify a visible title and artist or creator, but do not treat playback as a reason to read later. Treat charging, battery, connectivity, and similar notifications as temporary device status unless visible text gives a genuine user-actionable reason. Use general only when no stronger category fits.

Do not force an action onto every item. Set each item's suggestedAction to null when no action is genuinely useful. Use read_later only when the visible content itself gives a meaningful reason to revisit it; a truncated social notification alone is insufficient. Use keep only when preserving the screenshot has a plausible purpose, never as a fallback. Temporary device status should normally have no action. Use add_to_calendar for genuine events, create_reminder for genuine deadlines, and save_product for genuine products. The top-level suggestedActions must be the unique non-null item actions and may be empty. Return only data conforming to the supplied schema.`;

export function classifyOpenAIError(
  error: unknown,
): ProviderFailureCategory | 'missing_backend_configuration' {
  if (error instanceof AnalysisNotConfiguredError) return 'missing_backend_configuration';
  if (error instanceof OpenAI.APIConnectionTimeoutError) return 'request_timeout';
  if (error instanceof OpenAI.APIConnectionError) return 'network_connection_failure';
  if (error instanceof OpenAI.APIError) return 'openai_api_error';
  if (error instanceof SyntaxError) return 'invalid_json_response';
  if (error instanceof z.ZodError) return 'schema_validation_failure';
  return 'unexpected_error';
}

const IRRELEVANT_GENERAL_ITEM =
  /\b(?:recall(?:'s)? interface|screenshot (?:file(?:name)?|status)|asset id|image (?:resolution|dimensions?)|navigation controls?)\b/i;

export function removeIrrelevantGeneralItems(analysis: RecallAnalysis): RecallAnalysis {
  const hasActionableItem = analysis.items.some((item) => item.type !== 'general');
  if (!hasActionableItem) return analysis;

  const items = analysis.items.filter(
    (item) => item.type !== 'general' || !IRRELEVANT_GENERAL_ITEM.test(item.summary),
  );
  if (items.length === analysis.items.length) return analysis;

  const itemTypes = new Set(items.map((item) => item.type));
  const category = itemTypes.size === 1 ? items[0]?.type : 'mixed';
  return {
    ...analysis,
    category: category ?? analysis.category,
    cardinality: items.length === 1 ? 'single' : 'multiple',
    items,
  };
}

export async function analyzeWithOpenAI(input: {
  imageDataUrl: string;
  ocrText: string;
  currentTimestamp: string;
  timezone?: string;
}): Promise<{ analysis: RecallAnalysis; usage?: ProviderUsage }> {
  const model = getAnalysisModel();
  const startedAt = Date.now();
  try {
    const client = getOpenAIClient();
    const response = await client.responses.create({
      model,
      store: false,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      reasoning: { effort: getOpenAIReasoningEffort() },
      instructions: RECALL_INSTRUCTIONS,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Current timestamp: ${input.currentTimestamp}\nTimezone: ${input.timezone ?? 'unknown'}\nUse this context only to interpret explicitly relative content dates. It is not a publication date, event date, or screenshot-derived RecallDate.\n\nOCR text (supporting evidence):\n${input.ocrText}`,
            },
            { type: 'input_image', image_url: input.imageDataUrl, detail: 'high' },
          ],
        },
      ],
      text: {
        verbosity: getOpenAITextVerbosity(),
        format: {
          type: 'json_schema',
          name: 'recall_analysis',
          strict: true,
          schema: RecallAnalysisJsonSchema,
        },
      },
    });
    const parsed: unknown = JSON.parse(response.output_text);
    const analysis = removeIrrelevantGeneralItems(parseModelRecallAnalysis(parsed));
    console.info('[openai-analysis]', {
      model,
      status: 'ok',
      durationMs: Date.now() - startedAt,
      category: analysis.category,
      itemCount: analysis.items.length,
    });
    const usage = response.usage
      ? {
          inputTokens: response.usage.input_tokens,
          cachedInputTokens: response.usage.input_tokens_details?.cached_tokens ?? 0,
          outputTokens: response.usage.output_tokens,
        }
      : undefined;
    return { analysis, usage };
  } catch (error) {
    const failureCategory = classifyOpenAIError(error);
    const details = getOpenAIErrorDetails(error, [input.ocrText]);
    const includeMessage = process.env.OPENAI_ERROR_DETAILS?.trim().toLowerCase() === 'true';
    console.warn('[openai-analysis]', {
      model,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      failureCategory,
      providerStatus: details.status,
      providerCode: details.code,
      providerParam: details.param,
      ...(includeMessage ? { providerMessage: details.message } : {}),
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
    if (failureCategory === 'missing_backend_configuration') throw error;
    throw new ProviderUnavailableError(failureCategory, { cause: error });
  }
}
