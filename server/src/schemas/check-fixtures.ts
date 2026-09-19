import assert from 'node:assert/strict';
import { schemaFixtures, validateSchemaFixtures } from './fixtures.js';
import { analyzeWithMock, mockAnalysisFixtures } from '../services/mock-analysis.js';
import { RecallAnalysisSchema } from './recall-analysis.js';

validateSchemaFixtures();
for (const fixture of mockAnalysisFixtures) {
  assert.deepEqual(analyzeWithMock(fixture.ocrText), RecallAnalysisSchema.parse(fixture.analysis));
}
assert.equal(analyzeWithMock('Unmatched screenshot text').category, 'general');
console.log(
  `Validated ${schemaFixtures.length} schema fixtures and ${mockAnalysisFixtures.length + 1} mock results.`,
);
