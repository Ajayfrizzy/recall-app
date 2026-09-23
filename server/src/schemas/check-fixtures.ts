import assert from 'node:assert/strict';
import { schemaFixtures, validateSchemaFixtures } from './fixtures.js';
import { analyzeWithMock, mockAnalysisFixtures } from '../services/mock-analysis.js';
import { RecallAnalysisSchema } from './recall-analysis.js';

validateSchemaFixtures();

function schemaFixture(name: string) {
  const fixture = schemaFixtures.find((candidate) => candidate.name === name);
  assert(fixture, `Missing schema fixture: ${name}`);
  return fixture;
}

const musicFixture = schemaFixture('music playback without a content date or action');
assert.match(musicFixture.ocrText ?? '', /01:46 \/ 04:25/);
const music = musicFixture.value;
assert.equal(music.items[0]?.type, 'content');
assert.deepEqual(music.items[0]?.type === 'content' ? music.items[0].dates : undefined, []);
assert.equal(music.items[0]?.suggestedAction, null);
assert(!music.suggestedActions.includes('read_later'));

const charging = schemaFixture('temporary charging notification without an action').value;
assert.equal(charging.items[0]?.type, 'general');
assert.equal(charging.items[0]?.suggestedAction, null);
assert.deepEqual(charging.suggestedActions, []);

const socialFixture = schemaFixture('truncated social notification without a publication date');
assert.match(socialFixture.ocrText ?? '', /09:04/);
const social = socialFixture.value;
assert.match(social.summary, /truncated/i);
assert.deepEqual(social.items[0]?.type === 'content' ? social.items[0].dates : undefined, []);
assert.equal(social.items[0]?.suggestedAction, null);

const mixedNotifications = schemaFixture('three independent media and notification items').value;
assert.equal(mixedNotifications.items.length, 3);
assert.deepEqual(mixedNotifications.suggestedActions, []);

const genuineEvent = schemaFixture('genuine event keeps calendar action').value;
assert.equal(genuineEvent.items[0]?.suggestedAction, 'add_to_calendar');
assert(genuineEvent.suggestedActions.includes('add_to_calendar'));

const genuineDeadline = schemaFixture('genuine deadline keeps reminder action').value;
assert.equal(genuineDeadline.items[0]?.suggestedAction, 'create_reminder');
assert(genuineDeadline.suggestedActions.includes('create_reminder'));

const products = schemaFixture(
  'multi-product screenshot keeps products distinct and saveable',
).value;
assert.equal(products.items.length, 4);
assert(products.items.every((item) => item.suggestedAction === 'save_product'));
assert(products.suggestedActions.includes('save_product'));

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
