import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [
  tabs,
  actions,
  resurfacing,
  library,
  screenshot,
  bundleItem,
  bundleCard,
  bundle,
  cleanup,
  history,
] = await Promise.all([
  read('src/app/(tabs)/_layout.tsx'),
  read('src/components/action-button.tsx'),
  read('src/features/resurfacing/components/resurfacing-card.tsx'),
  read('src/app/(tabs)/library.tsx'),
  read('src/app/screenshot/[id].tsx'),
  read('src/features/bundles/components/bundle-item-row.tsx'),
  read('src/features/bundles/components/bundle-card.tsx'),
  read('src/app/bundle/[id].tsx'),
  read('src/app/cleanup.tsx'),
  read('src/features/screenshots/components/history-card.tsx'),
]);

for (const [name, title] of [
  ['index', 'Inbox'],
  ['upcoming', 'Upcoming'],
  ['library', 'Library'],
  ['profile', 'Profile'],
]) {
  assert.match(tabs, new RegExp(`name="${name}"[\\s\\S]*?title: '${title}'`));
}
assert.match(tabs, /tabBarLabelStyle: \{[^}]*fontSize: 11/);
assert.match(actions, /flexShrink: 0/);
assert.match(resurfacing, /flexWrap: 'wrap'/);

assert.match(library, /numberOfLines=\{3\}/);
assert.match(
  library,
  /router\.push\(`\/screenshot\/\$\{encodeURIComponent\(item\.screenshotId\)\}`\)/,
);
assert.match(screenshot, /useSafeAreaInsets\(\)/);
assert.match(screenshot, /keyboardShouldPersistTaps="handled"/);

const visibleUi = [resurfacing, screenshot, bundleItem, bundleCard, bundle, cleanup, history].join(
  '\n',
);
for (const internalLabel of [
  'Asset ID:',
  'Bundle ID:',
  'Bundled because:',
  'Calendar debug:',
  'Item ref:',
  'Membership:',
  'card.id',
  'card.priority',
]) {
  assert.ok(!visibleUi.includes(internalLabel), `${internalLabel} remains in user-facing UI`);
}

console.log('Release UI checks passed');
