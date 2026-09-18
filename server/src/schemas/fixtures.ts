import { RecallAnalysisSchema, type RecallAnalysis } from './recall-analysis.js';

export const schemaFixtures: Array<{ name: string; value: RecallAnalysis }> = [
  {
    name: 'event email',
    value: {
      category: 'event',
      confidence: 0.86,
      summary: 'Startup Abuja Conference 2026 in Abuja this November.',
      cardinality: 'single',
      items: [
        {
          type: 'event',
          title: 'Startup Abuja Conference 2026',
          location: 'Abuja',
          dates: [
            {
              type: 'event',
              raw: 'this November',
              normalized: '2026-11',
              precision: 'month',
              confidence: 0.8,
            },
          ],
          confidence: 0.86,
          missingDetails: ['Exact date', 'Exact time'],
        },
      ],
      suggestedActions: ['add_to_calendar'],
    },
  },
  {
    name: 'four product cards',
    value: {
      category: 'product',
      confidence: 0.9,
      summary: 'Four products found.',
      cardinality: 'multiple',
      items: [1, 2, 3, 4].map((index) => ({
        type: 'product' as const,
        title: `Product ${index}`,
        confidence: 0.8,
      })),
      suggestedActions: ['save_product'],
    },
  },
  {
    name: 'X content post',
    value: {
      category: 'content',
      confidence: 0.82,
      summary: 'Discussion about frontend/backend development and earning money.',
      cardinality: 'single',
      sourceApp: 'X',
      items: [
        {
          type: 'content',
          title: undefined,
          author: 'Crazy Codes',
          source: 'X',
          summary: 'Discussion about frontend/backend development and earning money.',
          dates: [
            {
              type: 'published',
              raw: 'September 12, 2025',
              normalized: '2025-09-12',
              precision: 'exact',
              confidence: 0.9,
            },
          ],
          confidence: 0.82,
        },
      ],
      suggestedActions: ['read_later'],
    },
  },
  {
    name: 'deadline',
    value: {
      category: 'deadline',
      confidence: 0.8,
      summary: 'Scholarship application deadline.',
      cardinality: 'single',
      items: [
        {
          type: 'deadline',
          title: 'Scholarship application',
          dates: [{ type: 'deadline', raw: 'September 30', precision: 'exact', confidence: 0.8 }],
          confidence: 0.8,
        },
      ],
      suggestedActions: ['create_reminder'],
    },
  },
  {
    name: 'place',
    value: {
      category: 'place',
      confidence: 0.8,
      summary: 'Restaurant in Lagos.',
      cardinality: 'single',
      items: [{ type: 'place', title: 'Terra Kulture', address: 'Lagos', confidence: 0.8 }],
      suggestedActions: ['save_place'],
    },
  },
  {
    name: 'general',
    value: {
      category: 'general',
      confidence: 0.35,
      summary: 'No clear actionable text.',
      cardinality: 'single',
      items: [{ type: 'general', summary: 'No clear actionable text.', confidence: 0.35 }],
      suggestedActions: ['keep'],
    },
  },
];

export function validateSchemaFixtures(): void {
  for (const fixture of schemaFixtures) RecallAnalysisSchema.parse(fixture.value);
}
