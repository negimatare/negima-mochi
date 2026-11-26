import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scaffold, sh, tempDir } from './eval-fixture.mjs';

const SCRIPTS = fileURLToPath(new URL('../plugins/mochi/skills/pr/scripts/', import.meta.url));
const P1 = 'feat/order-exports-1-monthly-csv';
const P2 = 'feat/order-exports-2-customer-statement';

const which = (name) => spawnSync('bash', ['-c', `command -v ${name}`], { encoding: 'utf8' }).stdout.trim();
// A PATH with git and, when given, a fake gh that prints this JSON.
const pathWith = (gh) => {
  const bin = tempDir('stack-check-bin-');
  symlinkSync(which('git'), join(bin, 'git'));
  if (gh !== undefined) {
    writeFileSync(join(bin, 'gh'), `#!/bin/bash\n[ "$1" = auth ] && exit 0\n[ "$1 $2" = "pr view" ] && { printf '%s' '${JSON.stringify(gh)}'; exit 0; }\nexit 1\n`);
    chmodSync(join(bin, 'gh'), 0o755);
  }
  return bin;
};
const run = (script, dir, args, gh) => {
  const env = { ...process.env, PATH: pathWith(gh), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  delete env.CLAUDE_PROJECT_DIR;
  const result = spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { cwd: dir, encoding: 'utf8', env });
  return { ...result, json: result.status === 0 && script === 'stack-check.mjs' ? JSON.parse(result.stdout) : undefined };
};
const check = (dir, base, gh) => run('stack-check.mjs', dir, [base], gh);

test('another person pushed to this branch: diverged, with their commit as lost', () => {
  const dir = scaffold('pr-keeps-commits-that-another-person-pushed');
  sh(dir, 'git fetch -q');
  const { json } = check(dir, P1);
  assert.deepEqual(json.restack, ['base-ahead', 'diverged']);
  assert.equal(json.lost.length, 1);
  assert.match(json.lost[0], /^[0-9a-f]+ test\(exports\): check the statement total$/);
  assert.equal(json.merged, null, 'no gh: unknown, not "no"');
});

test('a review fix on the base: the base is ahead and the branch diverged, with nothing lost', () => {
  const dir = scaffold('pr-pushes-a-review-fix-on-the-base');
  sh(dir, 'git fetch -q');
  const { json } = check(dir, P1);
  assert.deepEqual(json.restack, ['base-ahead', 'diverged']);
  assert.deepEqual(json.lost, []);
});

test('the base moved on the remote', () => {
  const dir = scaffold('review-fixes-on-the-owning-part');
  const other = tempDir('stack-check-other-');
  sh(dir, `git clone -q -b ${P1} "$PWD/.remote/origin.git" ${other} && git -C ${other} -c user.name=r -c user.email=r@example.invalid commit -q --allow-empty -m "fix: more" && git -C ${other} push -q && git fetch -q`);
  assert.deepEqual(check(dir, P1).json.restack, ['base-moved']);
});

test('a clean stack needs no restack', () => {
  const dir = scaffold('review-fixes-on-the-owning-part');
  sh(dir, 'git fetch -q');
  assert.deepEqual(check(dir, P1).json, { merged: null, headRefOid: null, restack: [], lost: [] });
});

test('a base that is gone from the remote, and a branch with no upstream', () => {
  const dir = scaffold('review-fixes-on-the-owning-part');
  sh(dir, `git --git-dir .remote/origin.git update-ref -d refs/heads/${P1} && git fetch -q --prune && git branch -q --unset-upstream`);
  assert.deepEqual(check(dir, P1).json.restack, ['base-gone']);
});

test('gh says the base is merged, and gives its last commit', () => {
  const dir = scaffold('review-fixes-on-the-owning-part');
  const { json } = check(dir, P1, { state: 'MERGED', headRefOid: 'abc123' });
  assert.equal(json.merged, true);
  assert.equal(json.headRefOid, 'abc123');
  assert.deepEqual(json.restack, ['base-merged']);
  assert.equal(check(dir, P1, { state: 'OPEN', headRefOid: 'abc123' }).json.merged, false);
});

test('outside a repository, or with no base, it fails and says why', () => {
  const result = check(tempDir('stack-check-none-'), P1);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not a git repository/i);
  assert.equal(run('stack-check.mjs', tempDir('stack-check-none-'), []).status, 2);
});

test('pushed names each branch whose remote tip is not its local tip', () => {
  const dir = scaffold('pr-pushes-a-review-fix-on-the-base');
  let result = run('pushed.mjs', dir, [P1, P2]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, new RegExp(`^${P1}: `, 'm'));
  assert.match(result.stdout, new RegExp(`^${P2}: `, 'm'));
  sh(dir, `git push -q origin ${P1} && git push -q --force-with-lease origin ${P2}`);
  result = run('pushed.mjs', dir, [P1, P2]);
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.stdout, '');
  sh(dir, `git tag ${P1}-tag && git switch -q -c only-local`);
  result = run('pushed.mjs', dir, ['only-local']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /only-local: origin has no such branch/);
});
