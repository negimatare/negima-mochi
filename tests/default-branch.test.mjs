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
const print = (cwd) => spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8', env: ENV });

test('the line of the root CLAUDE.md names the integration branch, also from a sub folder', () => {
  const dir = repo('# Shop\n\n- Branch off it.\n\nIntegration branch: `develop`\n');
  assert.deepEqual(defaultBranches(join(dir, 'src')), { integration: 'develop', protected: ['develop', 'main'] });
  const result = print(join(dir, 'src'));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'develop\n');
});

test('a CRLF line reads the same', () => {
  assert.equal(defaultBranches(repo('# Shop\r\nIntegration branch: `develop`\r\n')).integration, 'develop');
});

test('without the line, origin/HEAD names it', () => {
  for (const claude of [undefined, '# Shop\n\nThe integration branch is `develop`.\n', 'Integration branch: develop\n'])
    assert.deepEqual(defaultBranches(repo(claude)), { integration: 'main', protected: ['main'] }, String(claude));
});

test('with neither, none is known, and the script says why', () => {
  const dir = repo();
  sh(dir, 'git symbolic-ref -d refs/remotes/origin/HEAD');
  assert.deepEqual(defaultBranches(dir), { integration: null, protected: [] });
  const result = print(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Integration branch: `<name>`/);
  assert.deepEqual(defaultBranches(tempDir('default-branch-none-')), { integration: null, protected: [] });
});
