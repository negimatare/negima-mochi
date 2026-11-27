import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENV, scaffold, sh, tempDir } from './eval-fixture.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/mochi/skills/review/scripts/review-target.mjs', import.meta.url));
const BEHIND = 'review-asks-before-pulling-a-branch';
const SMALL = 'review-sends-a-small-change-to-the-quick-reviewer';

const which = (name) => spawnSync('bash', ['-c', `command -v ${name}`], { encoding: 'utf8' }).stdout.trim();
// A PATH with git and, when given, a fake gh: `answers` maps the gh
// arguments to the JSON it prints; any other call fails, as a gh with no
// login does. The string "none" prints gh's error for a branch with no
// pull request.
const pathWith = (answers) => {
  const bin = tempDir('review-target-bin-');
  symlinkSync(which('git'), join(bin, 'git'));
  if (answers) {
    const cases = Object.entries(answers)
      .map(([args, out]) =>
        out === 'none'
          ? `  ${JSON.stringify(args)}) echo 'no pull requests found for branch' >&2; exit 1 ;;`
          : `  ${JSON.stringify(args)}) printf '%s' '${typeof out === 'string' ? out : JSON.stringify(out)}'; exit 0 ;;`,
      )
      .join('\n');
    writeFileSync(join(bin, 'gh'), `#!/bin/bash\ncase "$*" in\n${cases}\nesac\nexit 1\n`);
    chmodSync(join(bin, 'gh'), 0o755);
  }
  return bin;
};
const target = (dir, args = [], gh) => {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8', env: { ...ENV, PATH: pathWith(gh) } });
  return { ...result, json: result.status === 0 ? JSON.parse(result.stdout) : undefined };
};
const FIELDS = 'number,state,baseRefName,headRefName,author';
const pr = (number, base, head, author, state = 'OPEN') => ({ number, state, baseRefName: base, headRefName: head, author: { login: author } });

test('a branch one commit behind its upstream gives behind 1', () => {
  const dir = scaffold(BEHIND);
  const { json } = target(dir, ['recent-export']);
  assert.deepEqual(json, {
    kind: 'branch',
    pr: null,
    gh: false,
    default: 'main',
    base: 'origin/main',
    head: 'recent-export',
    checkedOut: true,
    own: true,
    fetched: true,
    upstream: 'origin/recent-export',
    behind: 1,
    ahead: 1,
    uncommitted: [],
  });
});

test('a failed fetch leaves behind unknown, and the current branch is the target', () => {
  const dir = scaffold(SMALL);
  const { json } = target(dir);
  assert.equal(json.kind, 'current');
  assert.equal(json.head, 'discount-rounding');
  assert.equal(json.fetched, false, 'origin is https://example.invalid');
  assert.equal(json.behind, null);
  assert.equal(json.base, 'origin/main');
  assert.equal(json.ahead, 1);
  sh(dir, 'echo "// wip" >> src/cart.ts && echo x > notes.txt');
  assert.deepEqual(target(dir).json.uncommitted, [' M src/cart.ts', '?? notes.txt']);
});

test('a pull request by another person names its base and its author', () => {
  const dir = scaffold(BEHIND);
  const gh = { [`pr view 7 --json ${FIELDS}`]: pr(7, 'main', 'recent-export', 'ana'), 'api user --jq .login': 'me' };
  const { json } = target(dir, ['7'], gh);
  assert.equal(json.kind, 'pr');
  assert.deepEqual(json.pr, { number: 7, baseRefName: 'main', headRefName: 'recent-export', author: 'ana' });
  assert.equal(json.base, 'origin/main');
  assert.equal(json.own, false);
  assert.equal(json.checkedOut, true);
  assert.equal(json.behind, 1);
  gh['api user --jq .login'] = 'ana';
  assert.equal(target(dir, ['7'], gh).json.own, true);
  delete gh['api user --jq .login'];
  assert.equal(target(dir, ['7'], gh).json.own, true, 'gh api user fails: the pull request is the user\'s own');
});

test('a pull request URL works as its number, and a head that is not checked out says so', () => {
  const dir = scaffold(BEHIND);
  sh(dir, 'git switch -q main');
  const gh = { [`pr view https://github.com/o/r/pull/7 --json ${FIELDS}`]: pr(7, 'main', 'recent-export', 'ana') };
  const { json } = target(dir, ['https://github.com/o/r/pull/7'], gh);
  assert.equal(json.kind, 'pr');
  assert.equal(json.head, 'recent-export');
  assert.equal(json.checkedOut, false);
  assert.equal(json.uncommitted, null, 'the working tree is not the change');
  assert.equal(json.behind, 1, 'the local head branch is still compared with its upstream');
});

test('a branch or the current branch with an open pull request is reviewed as that pull request', () => {
  const dir = scaffold(BEHIND);
  const open = pr(9, 'main', 'recent-export', 'me');
  assert.equal(target(dir, ['recent-export'], { [`pr view recent-export --json ${FIELDS}`]: open }).json.kind, 'pr');
  assert.equal(target(dir, [], { [`pr view --json ${FIELDS}`]: open }).json.pr.number, 9);
  const merged = { [`pr view recent-export --json ${FIELDS}`]: pr(9, 'main', 'recent-export', 'me', 'MERGED') };
  const result = target(dir, ['recent-export'], merged).json;
  assert.equal(result.kind, 'branch', 'a merged pull request is not the change');
  assert.equal(result.gh, true);
  const none = target(dir, ['recent-export'], { [`pr view recent-export --json ${FIELDS}`]: 'none' }).json;
  assert.equal(none.kind, 'branch');
  assert.equal(none.gh, true, 'no pull request is an answer, not a gh failure');
});

test('a base named in the arguments, and a repo with no origin/HEAD', () => {
  const dir = scaffold(BEHIND);
  sh(dir, 'git branch -q stacked-base main');
  assert.equal(target(dir, ['recent-export', '--base', 'stacked-base']).json.base, 'stacked-base');
  assert.equal(target(dir, ['recent-export', '--base', 'main']).json.base, 'origin/main', 'origin/<base> first');
  sh(dir, 'git symbolic-ref -d refs/remotes/origin/HEAD');
  const { json } = target(dir, ['recent-export']);
  assert.equal(json.default, null);
  assert.equal(json.base, null);
  assert.equal(json.ahead, null);
});

test('a branch with no upstream has behind null', () => {
  const dir = scaffold(BEHIND);
  sh(dir, 'git branch -q --unset-upstream');
  const { json } = target(dir, ['recent-export']);
  assert.equal(json.upstream, null);
  assert.equal(json.behind, null);
});

test('outside a repository, or with an unknown branch, it fails and says why', () => {
  let result = target(tempDir('review-target-none-'));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not a git repository/i);
  result = target(scaffold(BEHIND), ['no-such-branch']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no-such-branch/);
  result = target(scaffold(BEHIND), ['--base']);
  assert.equal(result.status, 2);
});
