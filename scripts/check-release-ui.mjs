import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [
  tabs,
  inbox,
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
  read('src/app/(tabs)/index.tsx'),
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
assert.match(actions, /preserveLabelWidth && styles\.preserveLabelWidth/);
assert.match(actions, /preserveLabelWidth: \{ flexShrink: 0 \}/);
assert.match(
  resurfacing,
  /<View style=\{styles\.actionRows\}>[\s\S]*?<View style=\{styles\.primaryActions\}>[\s\S]*?label=\{card\.action\.label\}[\s\S]*?<\/View>[\s\S]*?<View style=\{styles\.secondaryActions\}>[\s\S]*?label="Snooze 1 day"[\s\S]*?label="Dismiss"[\s\S]*?<\/View>/,
);
const actionRows = resurfacing.match(/actionRows: \{([^}]*)\}/)?.[1] ?? '';
const secondaryActions = resurfacing.match(/secondaryActions: \{([\s\S]*?)\n  \}/)?.[1] ?? '';
const snoozeAction = resurfacing.match(/snoozeAction: \{([^}]*)\}/)?.[1] ?? '';
const dismissAction = resurfacing.match(/dismissAction: \{([^}]*)\}/)?.[1] ?? '';
assert.match(actionRows, /flexDirection: 'column'/);
assert.doesNotMatch(actionRows, /flexDirection: 'row'|flexWrap/);
assert.match(secondaryActions, /flexDirection: 'row'/);
assert.match(secondaryActions, /flexWrap: 'wrap'/);
assert.match(
  resurfacing,
  /label="Snooze 1 day"[\s\S]*?preserveLabelWidth[\s\S]*?style=\{styles\.snoozeAction\}/,
);
assert.match(
  resurfacing,
  /label="Dismiss"[\s\S]*?preserveLabelWidth[\s\S]*?style=\{styles\.dismissAction\}/,
);
assert.match(snoozeAction, /minWidth: 120/);
assert.match(dismissAction, /minWidth: 88/);
assert.doesNotMatch(
  `${secondaryActions}\n${snoozeAction}\n${dismissAction}`,
  /flexShrink|(?:width|maxWidth): '\d+%'/,
);

assert.match(inbox, /useSafeAreaInsets\(\)/);
assert.match(inbox, /paddingTop: insets\.top \+ Layout\.screenPadding/);
assert.match(inbox, /paddingTop: insets\.top \+ 40/);

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
