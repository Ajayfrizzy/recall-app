import { RecallAnalysisSchema, type RecallAnalysis } from '../schemas/recall-analysis.js';

type MockFixture = {
  name: string;
  ocrText: string;
  matches: (normalizedOcrText: string) => boolean;
  analysis: RecallAnalysis;
};

function containsAll(text: string, values: string[]): boolean {
  return values.every((value) => text.includes(value));
}

export function isMockAnalysisEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.MOCK_ANALYSIS?.trim().toLowerCase() === 'true'
  );
}

export const mockAnalysisFixtures: MockFixture[] = [
  {
    name: 'INGREM product grid',
    ocrText: `INGREM
Fat Cat Power Recliner
Electric Floating Table
Tilt-Adjustable Standing Desk
Fat Bat Recliner`,
    matches: (text) =>
      containsAll(text, [
        'ingrem',
        'fat cat power recliner',
        'electric floating table',
        'tilt-adjustable standing desk',
        'fat bat recliner',
      ]),
    analysis: {
      category: 'product',
      confidence: 0.95,
      summary: 'Four INGREM products with current and original prices.',
      cardinality: 'multiple',
      items: [
        {
          type: 'product',
          title: 'INGREM Fat Cat Power Recliner',
          originalPrice: { amount: 1450, currency: 'USD', raw: '$1450' },
          currentPrice: { amount: 1288, currency: 'USD', raw: '$1288' },
          source: 'INGREM',
          confidence: 0.96,
        },
        {
          type: 'product',
          title: 'INGREM Electric Floating Table',
          originalPrice: { amount: 899, currency: 'USD', raw: '$899' },
          currentPrice: { amount: 750, currency: 'USD', raw: '$750' },
          source: 'INGREM',
          confidence: 0.96,
        },
        {
          type: 'product',
          title: 'INGREM Electric Tilt-Adjustable Standing Desk',
          originalPrice: { amount: 800, currency: 'USD', raw: '$800' },
          currentPrice: { amount: 700, currency: 'USD', raw: '$700' },
          source: 'INGREM',
          confidence: 0.96,
        },
        {
          type: 'product',
          title: 'INGREM Fat Bat Recliner',
          originalPrice: { amount: 949, currency: 'USD', raw: '$949' },
          currentPrice: { amount: 849, currency: 'USD', raw: '$849' },
          source: 'INGREM',
          confidence: 0.96,
        },
      ],
      suggestedActions: ['save_product'],
    },
  },
  {
    name: 'Startup Abuja event',
    ocrText: 'Startup Abuja Conference 2026\nAbuja\nNovember 2026',
    matches: (text) => text.includes('startup abuja'),
    analysis: {
      category: 'event',
      confidence: 0.9,
      summary: 'Startup Abuja Conference 2026 in Abuja in November 2026.',
      cardinality: 'single',
      items: [
        {
          type: 'event',
          title: 'Startup Abuja Conference 2026',
          location: 'Abuja',
          dates: [
            {
              type: 'event',
              raw: 'November 2026',
              normalized: '2026-11',
              precision: 'month',
              confidence: 0.9,
            },
          ],
          confidence: 0.9,
          missingDetails: ['Exact date', 'Exact time'],
        },
      ],
      suggestedActions: ['add_to_calendar'],
    },
  },
  {
    name: 'X developer post',
    ocrText: 'X\nFrontend and backend developer discussion about earning money\nSep 12, 2025',
    matches: (text) => containsAll(text, ['frontend', 'backend', 'money']),
    analysis: {
      category: 'content',
      confidence: 0.88,
      summary: 'Developer discussion about frontend/backend work and earning money.',
      cardinality: 'single',
      sourceApp: 'X',
      items: [
        {
          type: 'content',
          source: 'X',
          summary: 'Developer discussion about frontend/backend work and earning money.',
          dates: [
            {
              type: 'published',
              raw: 'September 12, 2025',
              normalized: '2025-09-12',
              precision: 'exact',
              confidence: 0.95,
            },
          ],
          confidence: 0.88,
        },
      ],
      suggestedActions: ['read_later'],
    },
  },
];

const generalAnalysis: RecallAnalysis = {
  category: 'general',
  confidence: 0.2,
  summary: 'No recognized mock fixture was found in the screenshot text.',
  cardinality: 'single',
  items: [
    {
      type: 'general',
      summary: 'No recognized mock fixture was found in the screenshot text.',
      confidence: 0.2,
    },
  ],
  suggestedActions: ['keep'],
  warnings: ['Mock analysis used the safe general fallback.'],
};

export function analyzeWithMock(ocrText: string): RecallAnalysis {
  const normalizedOcrText = ocrText.toLowerCase();
  const fixture = mockAnalysisFixtures.find((candidate) => candidate.matches(normalizedOcrText));
  return RecallAnalysisSchema.parse(fixture?.analysis ?? generalAnalysis);
}
