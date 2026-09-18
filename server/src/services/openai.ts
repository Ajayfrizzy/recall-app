import OpenAI from 'openai';
import {
  RecallAnalysisJsonSchema,
  RecallAnalysisSchema,
  type RecallAnalysis,
} from '../schemas/recall-analysis.js';

const model = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const RECALL_INSTRUCTIONS = `You analyze screenshots for Recall. Your job is not merely to OCR text: understand the screenshot visually and semantically. Determine what it is about, whether it contains one or multiple actionable items, which visible text belongs to each item, which text is UI chrome, and which dates, prices, locations, and titles belong together.

Use visual layout and associate text with the nearest object or card. Separate repeated product cards/list items. Distinguish app controls from actual data. Use OCR as supporting evidence, not the only evidence. Ignore UI chrome such as Reply, Forward, Post your reply, Like, Share, Comments, Bookmarks, Search, Follow, to me, and Unsubscribe.

Never fabricate missing information. Every field must be explicitly visible or a strong contextual inference. If uncertain, omit it or mark it missing. Do not use screenshot creationTime as semantic content. Return confidence values from 0 to 1 that reflect certainty, never 0.99 for ambiguous extraction. Return strict JSON matching the schema.`;

export async function analyzeWithOpenAI(input: {
  imageDataUrl: string;
  ocrText: string;
}): Promise<RecallAnalysis> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const response = await client.responses.create({
    model,
    instructions: RECALL_INSTRUCTIONS,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: `OCR text (supporting evidence):\n${input.ocrText}` },
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
  return RecallAnalysisSchema.parse(parsed);
}
