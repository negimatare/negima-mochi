import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { defaultBranches } from '../plugins/mochi/scripts/default-branch.mjs';
import { ENV, sh, tempDir } from './eval-fixture.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/mochi/scripts/default-branch.mjs', import.meta.url));

// A repository whose origin/HEAD is main, with a sub folder.
const repo = (claude) => {
  const dir = tempDir('default-branch-');
  sh(dir, 'git init -q -b main && git -c user.name=shop -c user.email=shop@example.invalid commit -q --allow-empty -m init && git update-ref refs/remotes/origin/main HEAD && git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main && mkdir -p src');
  if (claude !== undefined) writeFileSync(join(dir, 'CLAUDE.md'), claude);
  return dir;
};
const run = (cwd, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8', env: ENV });
const integration = (claude) => defaultBranches(repo(claude)).integration;

test('the line of the root CLAUDE.md names the integration branch, also from a sub folder', () => {
  const dir = repo('# Shop\n\n- Branch off it.\n\nIntegration branch: `develop`\n');
  assert.deepEqual(defaultBranches(join(dir, 'src')), { integration: 'develop', originHead: 'main', protected: ['develop', 'main'] });
  let result = run(join(dir, 'src'));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'develop\n');
  result = run(dir, '--protected');
  assert.equal(result.stdout, 'develop\nmain\n');
});

test('the line also counts as a list item, in bold, or with CRLF', () => {
  assert.equal(integration('# Shop\n\n- Integration branch: `develop`\n'), 'develop');
  assert.equal(integration('* **Integration branch:** `develop`\n'), 'develop');
  assert.equal(integration('# Shop\r\nIntegration branch: `develop`\r\n'), 'develop');
});

test('without the line, origin/HEAD names it', () => {
  for (const claude of [
    undefined,
    '# Shop\n\nThe integration branch is `develop`.\n',
    'Integration branch: develop\n',
    'Integration branch: `<name>`\n',
    '# Shop\n\n```markdown\nIntegration branch: `develop`\n```\n',
  ])
    assert.deepEqual(defaultBranches(repo(claude)), { integration: 'main', originHead: 'main', protected: ['main'] }, String(claude));
});

test('without origin/HEAD, main and master stay protected, also beside the line', () => {
  const dir = repo('Integration branch: `develop`\n');
  sh(dir, 'git symbolic-ref -d refs/remotes/origin/HEAD');
  assert.deepEqual(defaultBranches(dir), { integration: 'develop', originHead: null, protected: ['develop', 'main', 'master'] });
});

test('with neither, none is known, and the script says why', () => {
  const dir = repo();
  sh(dir, 'git symbolic-ref -d refs/remotes/origin/HEAD');
  assert.deepEqual(defaultBranches(dir), { integration: null, originHead: null, protected: ['main', 'master'] });
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Integration branch: `<name>`/);
  assert.match(result.stderr, /git remote set-head origin --auto/);
  assert.deepEqual(defaultBranches(tempDir('default-branch-none-')), { integration: null, originHead: null, protected: ['main', 'master'] });
});
