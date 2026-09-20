import assert from 'node:assert/strict';
import { schemaFixtures, validateSchemaFixtures } from './fixtures.js';
import { analyzeWithMock, mockAnalysisFixtures } from '../services/mock-analysis.js';
import { RecallAnalysisSchema } from './recall-analysis.js';

validateSchemaFixtures();
for (const fixture of mockAnalysisFixtures) {
  assert.deepEqual(analyzeWithMock(fixture.ocrText), RecallAnalysisSchema.parse(fixture.analysis));
}

const ingrem = analyzeWithMock(mockAnalysisFixtures[0].ocrText);
assert.equal(ingrem.category, 'product');
assert.equal(ingrem.items.length, 4);

const expectedIngremTitles = [
  'INGREM Fat Cat Power Recliner',
  'INGREM Electric Floating Table',
  'INGREM Electric Tilt-Adjustable Standing Desk',
  'INGREM Fat Bat Recliner',
];
const expectedIngremPrices = [1288, 750, 700, 849];

function assertIngremFixture(ocrText: string, description: string): void {
  const analysis = analyzeWithMock(ocrText);
  assert.equal(analysis.category, 'product', description);
  assert.equal(analysis.cardinality, 'multiple', description);
  assert.deepEqual(
    analysis.items.map((item) => ('title' in item ? item.title : undefined)),
    expectedIngremTitles,
    description,
  );
  assert.deepEqual(
    analysis.items.map((item) => (item.type === 'product' ? item.currentPrice?.amount : undefined)),
    expectedIngremPrices,
    description,
  );
}

assertIngremFixture(mockAnalysisFixtures[0].ocrText, 'original INGREM OCR should match');
assertIngremFixture(
  `INGREM Fat Cat Power Recliner 1,288 USD
  Electric Floating Table 750 USD
  Tilt Adjustable Standing Desk 700 USD
  Fat Bat Recliner 849 USD`,
  'INGREM OCR missing dollar symbols should match',
);
assertIngremFixture(
  `INGREM Fat Cat Power Recliner $1,288
  Electric Floating Table $750
  Tilt-Adjustable Standing Desk $700
  Fat Bat Recliner $849`,
  'INGREM OCR missing USD tokens should match',
);
assertIngremFixture(
  `INGREM
  Fat Cat Power Recliner
  Floating Table
  Standing Desk
  Fat Bat Recliner`,
  'INGREM product names without currency should match',
);
assertIngremFixture(
  'INGREM Power Recliner Floating Table 1288 750',
  'two product signals and two known prices should match',
);
assertIngremFixture(
  'INGREM Power Recliner Floating Table $ USD $',
  'two product signals and multiple currency markers should match',
);

assert.equal(
  analyzeWithMock('Fat Cat Power Recliner Floating Table Standing Desk furniture sale').category,
  'general',
  'generic furniture without INGREM must not match',
);
assert.equal(
  analyzeWithMock('INGREM office furniture sale standing desk').category,
  'general',
  'INGREM with one weak product clue must not match',
);
assert.equal(analyzeWithMock(mockAnalysisFixtures[1].ocrText).category, 'event');
assert.equal(analyzeWithMock(mockAnalysisFixtures[2].ocrText).category, 'content');
assert.equal(analyzeWithMock('Unrelated settings screenshot').category, 'general');
console.log(
  `Validated ${schemaFixtures.length} schema fixtures and ${mockAnalysisFixtures.length + 1} mock results.`,
);
