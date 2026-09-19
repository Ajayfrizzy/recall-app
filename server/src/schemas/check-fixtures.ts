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
assert.equal(analyzeWithMock(mockAnalysisFixtures[1].ocrText).category, 'event');
assert.equal(analyzeWithMock(mockAnalysisFixtures[2].ocrText).category, 'content');
assert.equal(analyzeWithMock('Unrelated settings screenshot').category, 'general');
console.log(
  `Validated ${schemaFixtures.length} schema fixtures and ${mockAnalysisFixtures.length + 1} mock results.`,
);
