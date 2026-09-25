import { getLibraryContentPreview } from './preview';
import type { SavedContent } from './types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const summary = 'A complete summary that remains available after its concise card preview.';
const item: SavedContent = {
  id: 'content-preview',
  screenshotId: 'source-screenshot',
  itemIndex: 0,
  createdAt: 1,
  type: 'content',
  title: 'Saved article',
  summary,
};
const snapshot = JSON.stringify(item);
const preview = getLibraryContentPreview(item);

assert(preview.title === item.title, 'Library preview lost its title');
assert(preview.summary === summary, 'Library preview modified the source summary');
assert(JSON.stringify(item) === snapshot, 'Library preview mutated the saved item');

const untitled = getLibraryContentPreview({ ...item, title: undefined });
assert(untitled.title === summary, 'Untitled Library preview did not retain the complete summary');
assert(untitled.summary === undefined, 'Untitled Library preview duplicated its summary');

console.log('Library preview checks passed');
