import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const OptionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? undefined);
const OptionalStringArray = z
  .array(z.string())
  .nullish()
  .transform((value) => value ?? undefined);

const RecallDate = z.object({
  type: z.enum(['event', 'deadline', 'published', 'expires', 'purchase', 'travel', 'other']),
  raw: z.string(),
  normalized: OptionalString,
  precision: z.enum(['exact', 'month', 'year', 'unknown']),
  confidence: z.number().min(0).max(1),
});

const Price = z.object({ amount: z.number(), currency: z.string(), raw: z.string() });
const OptionalPrice = Price.nullish().transform((value) => value ?? undefined);

const ProductItem = z.object({
  type: z.literal('product'),
  title: z.string(),
  currentPrice: OptionalPrice,
  originalPrice: OptionalPrice,
  discount: OptionalString,
  source: OptionalString,
  confidence: z.number().min(0).max(1),
});

const EventItem = z.object({
  type: z.literal('event'),
  title: z.string(),
  location: OptionalString,
  dates: z.array(RecallDate),
  confidence: z.number().min(0).max(1),
  missingDetails: OptionalStringArray,
});

const DeadlineItem = z.object({
  type: z.literal('deadline'),
  title: z.string(),
  organization: OptionalString,
  dates: z.array(RecallDate),
  confidence: z.number().min(0).max(1),
});

const PlaceItem = z.object({
  type: z.literal('place'),
  title: z.string(),
  address: OptionalString,
  source: OptionalString,
  confidence: z.number().min(0).max(1),
});

const ContentItem = z.object({
  type: z.literal('content'),
  title: OptionalString,
  author: OptionalString,
  source: OptionalString,
  summary: z.string(),
  dates: z.array(RecallDate),
  confidence: z.number().min(0).max(1),
});

const GeneralItem = z.object({
  type: z.literal('general'),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export const RecallItem = z.discriminatedUnion('type', [
  ProductItem,
  EventItem,
  DeadlineItem,
  PlaceItem,
  ContentItem,
  GeneralItem,
]);
export const RecallAnalysisSchema = z.object({
  category: z.enum(['event', 'deadline', 'product', 'place', 'content', 'general', 'mixed']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  cardinality: z.enum(['single', 'multiple']),
  sourceApp: OptionalString,
  items: z.array(RecallItem),
  suggestedActions: z.array(
    z.enum([
      'add_to_calendar',
      'create_reminder',
      'save_product',
      'save_place',
      'read_later',
      'keep',
    ]),
  ),
  warnings: OptionalStringArray,
});

export type RecallAnalysis = z.infer<typeof RecallAnalysisSchema>;

// OpenAI Structured Outputs require every property to be present. Nullable fields in this
// model-facing schema are normalized back to optional fields by RecallAnalysisSchema.
const ModelRecallDate = z.object({
  type: z.enum(['event', 'deadline', 'published', 'expires', 'purchase', 'travel', 'other']),
  raw: z.string(),
  normalized: z.string().nullable(),
  precision: z.enum(['exact', 'month', 'year', 'unknown']),
  confidence: z.number().min(0).max(1),
});

const ModelPrice = z.object({
  amount: z.number(),
  currency: z.string(),
  raw: z.string(),
});

const ModelRecallItem = z.union([
  z.object({
    type: z.enum(['product']),
    title: z.string(),
    currentPrice: ModelPrice.nullable(),
    originalPrice: ModelPrice.nullable(),
    discount: z.string().nullable(),
    source: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    type: z.enum(['event']),
    title: z.string(),
    location: z.string().nullable(),
    dates: z.array(ModelRecallDate),
    confidence: z.number().min(0).max(1),
    missingDetails: z.array(z.string()).nullable(),
  }),
  z.object({
    type: z.enum(['deadline']),
    title: z.string(),
    organization: z.string().nullable(),
    dates: z.array(ModelRecallDate),
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    type: z.enum(['place']),
    title: z.string(),
    address: z.string().nullable(),
    source: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    type: z.enum(['content']),
    title: z.string().nullable(),
    author: z.string().nullable(),
    source: z.string().nullable(),
    summary: z.string(),
    dates: z.array(ModelRecallDate),
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    type: z.enum(['general']),
    summary: z.string(),
    confidence: z.number().min(0).max(1),
  }),
]);

export const ModelRecallAnalysisSchema = z.object({
  category: z.enum(['event', 'deadline', 'product', 'place', 'content', 'general', 'mixed']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  cardinality: z.enum(['single', 'multiple']),
  sourceApp: z.string().nullable(),
  items: z.array(ModelRecallItem),
  suggestedActions: z.array(
    z.enum([
      'add_to_calendar',
      'create_reminder',
      'save_product',
      'save_place',
      'read_later',
      'keep',
    ]),
  ),
  warnings: z.array(z.string()).nullable(),
});

export function parseModelRecallAnalysis(value: unknown): RecallAnalysis {
  return RecallAnalysisSchema.parse(ModelRecallAnalysisSchema.parse(value));
}

export const AnalyzeRequestSchema = z
  .object({
    imageBase64: z
      .string()
      .max(12_000_000)
      .regex(/^[A-Za-z0-9+/=]+$/)
      .optional(),
    imageDataUrl: z
      .string()
      .max(12_000_000)
      .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
      .optional(),
    ocrText: z.string().max(100_000).default(''),
    timezone: z.string().min(1).max(100).optional(),
    screenshotMetadata: z
      .object({
        filename: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        creationTime: z.number().optional(),
        analysisWidth: z.number().optional(),
        analysisHeight: z.number().optional(),
      })
      .optional(),
  })
  .refine((value) => Boolean(value.imageBase64 || value.imageDataUrl), {
    message: 'imageBase64 or imageDataUrl is required',
  });

const generatedModelSchema = zodToJsonSchema(ModelRecallAnalysisSchema, {
  target: 'openAi',
  $refStrategy: 'none',
});

// `$schema` is metadata for validators, not part of OpenAI's supported strict subset.
const { $schema: _schemaDeclaration, ...modelSchema } = generatedModelSchema as Record<
  string,
  unknown
>;
export const RecallAnalysisJsonSchema: Record<string, unknown> = modelSchema;
