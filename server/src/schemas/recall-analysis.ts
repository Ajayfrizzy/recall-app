import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const RecallDate = z.object({
  type: z.enum(['event', 'deadline', 'published', 'expires', 'purchase', 'travel', 'other']),
  raw: z.string(),
  normalized: z.string().optional(),
  precision: z.enum(['exact', 'month', 'year', 'unknown']),
  confidence: z.number().min(0).max(1),
});

const ProductItem = z.object({
  type: z.literal('product'),
  title: z.string(),
  currentPrice: z.object({ amount: z.number(), currency: z.string(), raw: z.string() }).optional(),
  originalPrice: z.object({ amount: z.number(), currency: z.string(), raw: z.string() }).optional(),
  discount: z.string().optional(),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const EventItem = z.object({
  type: z.literal('event'),
  title: z.string(),
  location: z.string().optional(),
  dates: z.array(RecallDate),
  confidence: z.number().min(0).max(1),
  missingDetails: z.array(z.string()).optional(),
});

const DeadlineItem = z.object({
  type: z.literal('deadline'),
  title: z.string(),
  organization: z.string().optional(),
  dates: z.array(RecallDate),
  confidence: z.number().min(0).max(1),
});

const PlaceItem = z.object({
  type: z.literal('place'),
  title: z.string(),
  address: z.string().optional(),
  source: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const ContentItem = z.object({
  type: z.literal('content'),
  title: z.string().optional(),
  author: z.string().optional(),
  source: z.string().optional(),
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
  sourceApp: z.string().optional(),
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
  warnings: z.array(z.string()).optional(),
});

export type RecallAnalysis = z.infer<typeof RecallAnalysisSchema>;

export const AnalyzeRequestSchema = z
  .object({
    imageBase64: z.string().max(12_000_000).optional(),
    imageDataUrl: z.string().max(12_000_000).optional(),
    ocrText: z.string().max(100_000).default(''),
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

export const RecallAnalysisJsonSchema = zodToJsonSchema(RecallAnalysisSchema, {
  name: 'RecallAnalysis',
  target: 'openAi',
});
