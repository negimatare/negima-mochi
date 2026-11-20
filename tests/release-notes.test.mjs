import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../scripts/release-notes.mjs', import.meta.url));

const CHANGELOG = `# Changelog

Intro.

## 1.3.0 — 2026-11-21

The banner shows the
versions.

### mochi

#### Banner
A line right after a heading
stays out of it.

- **Versions.** The banner shows the version of each
  plugin, on one line.
  - A nested item that
    wraps.
1. A numbered item
   that wraps.

| Release | Cost |
|---|---|
| 1.3.0 | $18 |

\`\`\`bash
node scripts/release-notes.mjs 1.3.0
  indented code
\`\`\`

- An item with code:
  \`\`\`bash
  npm test
  \`\`\`
  Then restart.

A paragraph line
> A quote right after it

A paragraph line
* A star item right after it
+ A plus item

A paragraph line
| A | table |
|---|---|

A paragraph line
### A heading right after it

## 1.2.0 — 2026-11-20

Old notes.
`;

const repoWith = ({ changelog = CHANGELOG, versions = {} } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'release-notes-test-'));
  writeFileSync(join(dir, 'CHANGELOG.md'), changelog);
  for (const plugin of ['mochi', 'mochi-react', 'mochi-python']) {
    mkdirSync(join(dir, 'plugins', plugin, '.claude-plugin'), { recursive: true });
    writeFileSync(
      join(dir, 'plugins', plugin, '.claude-plugin', 'plugin.json'),
      JSON.stringify({ version: versions[plugin] ?? '1.3.0' }),
    );
  }
  return dir;
};

const notes = (dir, version = '1.3.0') => spawnSync(process.execPath, [SCRIPT, version], { cwd: dir, encoding: 'utf8' });

test('the notes are the section without its heading, with wrapped lines joined', () => {
  const result = notes(repoWith());
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    `The banner shows the versions.

### mochi

#### Banner
A line right after a heading stays out of it.

- **Versions.** The banner shows the version of each plugin, on one line.
  - A nested item that wraps.
1. A numbered item that wraps.

| Release | Cost |
|---|---|
| 1.3.0 | $18 |

\`\`\`bash
node scripts/release-notes.mjs 1.3.0
  indented code
\`\`\`

- An item with code:
  \`\`\`bash
  npm test
  \`\`\`
  Then restart.

A paragraph line
> A quote right after it

A paragraph line
* A star item right after it
+ A plus item

A paragraph line
| A | table |
|---|---|

A paragraph line
### A heading right after it
`,
  );
});

test('a placeholder that is not filled stops the release', () => {
  const result = notes(repoWith({ changelog: CHANGELOG.replace('The banner shows the', 'It costs @@COST@@. The banner shows the') }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /placeholder @@COST@@/);
});

test('a manifest with another version stops the release', () => {
  const result = notes(repoWith({ versions: { 'mochi-python': '1.2.0' } }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /mochi-python.*1\.2\.0, not 1\.3\.0/);
});

test('a section that is not dated stops the release', () => {
  const result = notes(repoWith({ changelog: CHANGELOG.replace('1.3.0 — 2026-11-21', '1.3.0 — unreleased') }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no date/);
});

test('a version with no section stops the release', () => {
  const result = notes(repoWith({ versions: { mochi: '1.4.0', 'mochi-react': '1.4.0', 'mochi-python': '1.4.0' } }), '1.4.0');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no section for 1\.4\.0/);
});

test('a tag that is not a version stops the release', () => {
  const result = notes(repoWith(), 'latest');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /such as 1\.3\.0/);
});
