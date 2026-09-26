import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const docsDirectory = path.join(root, 'docs');
const docs = [
  path.join(root, 'README.md'),
  ...(await readdir(docsDirectory))
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => path.join(docsDirectory, entry)),
];
const failures = [];

for (const document of docs) {
  const markdown = await readFile(document, 'utf8');
  const links = markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g);

  for (const match of links) {
    const destination = match[1]
      .trim()
      .replace(/^<|>$/g, '')
      .split(/\s+["']/)[0];
    if (!destination || destination.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(destination)) {
      continue;
    }

    const relativeTarget = decodeURIComponent(destination.split('#')[0]);
    const target = path.resolve(path.dirname(document), relativeTarget);
    try {
      await access(target);
    } catch {
      failures.push(`${path.relative(root, document)} -> ${destination}`);
    }
  }
}

assert.deepEqual(failures, [], `Broken documentation links:\n${failures.join('\n')}`);
console.log(`Documentation links passed (${docs.length} Markdown files)`);
