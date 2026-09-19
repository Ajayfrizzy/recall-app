import { RecallAnalysisSchema, type RecallAnalysis } from '../schemas/recall-analysis.js';

type MockFixture = {
  name: string;
  ocrText: string;
  matches: (normalizedOcrText: string) => boolean;
  analysis: RecallAnalysis;
};

function countSignals(text: string, signals: string[]): number {
  return signals.filter((signal) => text.includes(signal)).length;
}

export function normalizeMockOcr(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9$]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesIngrem(text: string): boolean {
  const productSignals = [
    'fat cat',
    'power recliner',
    'floating table',
    'tilt',
    'adjustable',
    'standing desk',
    'fat bat recliner',
  ];
  const dollarPrices = text.match(/\$/g)?.length ?? 0;
  const usdPrices = text.match(/\busd\b/g)?.length ?? 0;

  return (
    text.includes('ingrem') &&
    countSignals(text, productSignals) >= 3 &&
    dollarPrices >= 4 &&
    usdPrices >= 4
  );
}

function matchesStartupAbuja(text: string): boolean {
  return countSignals(text, ['startup', 'abuja', 'conference', 'november']) >= 3;
}

function matchesXPost(text: string): boolean {
  const hasPublishedDate =
    /\b12 sept(?:ember)? 25\b/.test(text) ||
    /\bsept(?:ember)? 12 2025\b/.test(text) ||
    /\b12 09 2025\b/.test(text);
  const semanticSignals = countSignals(text, ['frontend', 'backend', 'money']);

  return semanticSignals === 3 || (semanticSignals >= 2 && hasPublishedDate);
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
    ocrText: `Sale
$1,450-0 USD
$1,288.00 USD
Sale
INGREM Fat Cat Power Recliner INGREM Electric Floating Table
INGREM Electric Tilt-Adjustable
Standing Desk
$800-0 USD
$700.00 USD
INGREM
Sale
$899.0 USD
$750.00 USD
INGREM Fat Bat Recliner
$949-0 USD
$849.00 USD`,
    matches: matchesIngrem,
    analysis: {
      category: 'product',
      confidence: 0.95,
      summary: '4 INGREM products were detected.',
      cardinality: 'multiple',
      items: [
        {
          type: 'product',
          title: 'INGREM Fat Cat Power Recliner',
          originalPrice: { amount: 1450, currency: 'USD', raw: '$1,450.00 USD' },
          currentPrice: { amount: 1288, currency: 'USD', raw: '$1,288.00 USD' },
          source: 'INGREM',
          confidence: 0.96,
        },
        {
          type: 'product',
          title: 'INGREM Electric Floating Table',
          originalPrice: { amount: 899, currency: 'USD', raw: '$899.00 USD' },
          currentPrice: { amount: 750, currency: 'USD', raw: '$750.00 USD' },
          source: 'INGREM',
          confidence: 0.96,
        },
        {
          type: 'product',
          title: 'INGREM Electric Tilt-Adjustable Standing Desk',
          originalPrice: { amount: 800, currency: 'USD', raw: '$800.00 USD' },
          currentPrice: { amount: 700, currency: 'USD', raw: '$700.00 USD' },
          source: 'INGREM',
          confidence: 0.96,
        },
        {
          type: 'product',
          title: 'INGREM Fat Bat Recliner',
          originalPrice: { amount: 949, currency: 'USD', raw: '$949.00 USD' },
          currentPrice: { amount: 849, currency: 'USD', raw: '$849.00 USD' },
          source: 'INGREM',
          confidence: 0.96,
        },
      ],
      suggestedActions: ['save_product'],
    },
  },
  {
    name: 'Startup Abuja event',
    ocrText: `You are invited!!!
STARTUP   ABUJA
CONFERENCE -- 2026
Venue: Abuja
Coming this NOVEMBER...`,
    matches: matchesStartupAbuja,
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
    ocrText: `For FRONTEND devs + backend people:
how are you earning MONEY???
Reply  Repost  Like
12 Sept 25`,
    matches: matchesXPost,
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
  const normalizedOcrText = normalizeMockOcr(ocrText);
  const fixture = mockAnalysisFixtures.find((candidate) => candidate.matches(normalizedOcrText));
  return RecallAnalysisSchema.parse(fixture?.analysis ?? generalAnalysis);
}
