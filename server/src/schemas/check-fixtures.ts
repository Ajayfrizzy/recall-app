import { schemaFixtures, validateSchemaFixtures } from './fixtures.js';

validateSchemaFixtures();
console.log(`Validated ${schemaFixtures.length} Recall analysis fixtures.`);
