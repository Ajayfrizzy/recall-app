import { RecallAnalysisSchema, type RecallAnalysis } from './recall-analysis.js';

export const schemaFixtures: Array<{ name: string; ocrText?: string; value: RecallAnalysis }> = [
  {
    name: 'music playback without a content date or action',
    ocrText: 'Spotify\nEnd of Beginning\nDjo\n01:46 / 04:25',
    value: {
      category: 'content',
      confidence: 0.94,
      summary: 'End of Beginning by Djo is playing in Spotify.',
      cardinality: 'single',
      sourceApp: 'Spotify',
      items: [
        {
          type: 'content',
          suggestedAction: null,
          title: 'End of Beginning',
          author: 'Djo',
          source: 'Spotify',
          summary: 'End of Beginning by Djo is playing.',
          dates: [],
          confidence: 0.94,
        },
      ],
      suggestedActions: [],
    },
  },
  {
    name: 'temporary charging notification without an action',
    ocrText: 'Charging\nBattery 72%\n1 hr 12 min until full',
    value: {
      category: 'general',
      confidence: 0.96,
      summary: 'The device is charging and shows temporary battery status.',
      cardinality: 'single',
      items: [
        {
          type: 'general',
          suggestedAction: null,
          summary: 'Temporary charging and battery status.',
          confidence: 0.96,
        },
      ],
      suggestedActions: [],
    },
  },
  {
    name: 'truncated social notification without a publication date',
    ocrText: 'TikTok 09:04\nSomeone shared: You need to see what happened when...',
    value: {
      category: 'content',
      confidence: 0.84,
      summary: 'A truncated TikTok notification is visible; the full post is unavailable.',
      cardinality: 'single',
      sourceApp: 'TikTok',
      items: [
        {
          type: 'content',
          suggestedAction: null,
          source: 'TikTok',
          summary: 'Truncated notification; the full underlying post is unavailable.',
          dates: [],
          confidence: 0.84,
        },
      ],
      suggestedActions: [],
      warnings: ['Notification content is incomplete.'],
    },
  },
  {
    name: 'three independent media and notification items',
    ocrText:
      'Spotify\nEnd of Beginning\nDjo\n01:46 / 04:25\nCharging 72%\nTikTok 09:04\nYou need to see...',
    value: {
      category: 'mixed',
      confidence: 0.9,
      summary: 'Music playback, charging status, and a social notification are visible.',
      cardinality: 'multiple',
      items: [
        {
          type: 'content',
          suggestedAction: null,
          title: 'End of Beginning',
          author: 'Djo',
          source: 'Spotify',
          summary: 'End of Beginning by Djo is playing.',
          dates: [],
          confidence: 0.94,
        },
        {
          type: 'general',
          suggestedAction: null,
          summary: 'Temporary charging and battery status.',
          confidence: 0.96,
        },
        {
          type: 'content',
          suggestedAction: null,
          source: 'TikTok',
          summary: 'Truncated notification; the full underlying post is unavailable.',
          dates: [],
          confidence: 0.84,
        },
      ],
      suggestedActions: [],
      warnings: ['Notification content is incomplete.'],
    },
  },
  {
    name: 'genuine event keeps calendar action',
    ocrText: 'Startup Abuja Conference 2026\nVenue: Abuja\nComing this November',
    value: {
      category: 'event',
      confidence: 0.86,
      summary: 'Startup Abuja Conference 2026 in Abuja this November.',
      cardinality: 'single',
      items: [
        {
          type: 'event',
          suggestedAction: 'add_to_calendar',
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
    name: 'multi-product screenshot keeps products distinct and saveable',
    ocrText: 'Product 1 $100\nProduct 2 $200\nProduct 3 $300\nProduct 4 $400',
    value: {
      category: 'product',
      confidence: 0.9,
      summary: 'Four products found.',
      cardinality: 'multiple',
      items: [1, 2, 3, 4].map((index) => ({
        type: 'product' as const,
        suggestedAction: 'save_product' as const,
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
          suggestedAction: 'read_later',
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
    name: 'genuine deadline keeps reminder action',
    ocrText: 'Scholarship applications close September 30 at 5:00 PM',
    value: {
      category: 'deadline',
      confidence: 0.8,
      summary: 'Scholarship application deadline.',
      cardinality: 'single',
      items: [
        {
          type: 'deadline',
          suggestedAction: 'create_reminder',
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
      items: [
        {
          type: 'place',
          suggestedAction: 'save_place',
          title: 'Terra Kulture',
          address: 'Lagos',
          confidence: 0.8,
        },
      ],
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
      items: [
        {
          type: 'general',
          suggestedAction: null,
          summary: 'No clear actionable text.',
          confidence: 0.35,
        },
      ],
      suggestedActions: [],
    },
  },
];

export function validateSchemaFixtures(): void {
  for (const fixture of schemaFixtures) RecallAnalysisSchema.parse(fixture.value);
}
