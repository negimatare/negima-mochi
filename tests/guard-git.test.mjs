import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { sh, tempDir } from './eval-fixture.mjs';

const HOOK = fileURLToPath(new URL('../plugins/mochi/scripts/guard-git.mjs', import.meta.url));

// A repository on main whose origin/HEAD names main, and one with no origin/HEAD.
const repo = (withOriginHead = true) => {
  const dir = tempDir('guard-git-');
  sh(dir, 'git init -q -b main && git commit -q --allow-empty -m init && git remote add origin https://example.invalid/shop.git');
  if (withOriginHead) sh(dir, 'git update-ref refs/remotes/origin/main HEAD && git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main');
  return dir;
};
const MAIN = repo();

const decide = (command, cwd = MAIN) => {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd }),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput : undefined;
};
const asks = (command, cwd) => decide(command, cwd)?.permissionDecision === 'ask';

test('a push to the default branch asks', () => {
  for (const command of [
    'git push origin main',
    'git push origin HEAD',
    'git push origin HEAD:main',
    'git push origin feat/x:main',
    'git push origin :main',
    'git push origin refs/heads/main',
    'git push',
    'git push -u origin',
    'cd . && git push origin main',
    `git -C ${MAIN} push origin main`,
  ])
    assert.ok(asks(command), command);
  assert.match(decide('git push origin main').permissionDecisionReason, /default branch/);
});

test('without origin/HEAD, main and master count as the default branch', () => {
  const dir = repo(false);
  assert.ok(asks('git push origin main', dir));
  assert.ok(asks('git push origin master', dir));
  assert.ok(!asks('git push origin feat/x', dir));
});

test('a plain force push asks; a push with the lease does not', () => {
  for (const command of ['git push -f origin feat/x', 'git push --force origin feat/x', 'git push origin +feat/x', 'git push -fu origin feat/x'])
    assert.ok(asks(command), command);
  for (const command of [
    'git push --force-with-lease -u origin feat/x',
    'git push --force-with-lease --force-if-includes origin feat/x',
    'git push --force-with-lease=feat/x:abc123 origin feat/x',
  ])
    assert.ok(!asks(command), command);
});

test('staging all, committing all, and skipping the hooks ask', () => {
  for (const command of [
    'git add -A',
    'git add --all',
    'git add .',
    'git add -u',
    'git commit -a -m "x"',
    'git commit -am "x"',
    'git commit --all -m "x"',
    'git commit --no-verify -m "x"',
    'git commit -n -m "x"',
    'git push --no-verify origin feat/x',
  ])
    assert.ok(asks(command), command);
});

test('the words of a commit message, a heredoc or a quoted string are not commands', () => {
  for (const command of [
    `git commit -m "$(cat <<'EOF'\nfix: never run git push origin main\n\nDo not use --no-verify, -a, or git add -A.\nEOF\n)"`,
    'git commit -F - <<\'EOF\'\nchore: git push -f origin main is refused\nEOF',
    'git commit -m "docs: say git add . is refused; git push origin main too"',
    "echo 'git push origin main' > notes.txt",
    'printf "%s\\n" "git commit -a" >> notes.txt',
  ])
    assert.ok(!asks(command), command);
});

test('the release steps and other commands are silent', () => {
  for (const command of [
    'git push -u origin feat/x',
    'git push origin v1.x.y',
    'git push -u origin release/1.x.y',
    'git push origin --tags',
    'git push -n origin main',
    'git push --dry-run origin main',
    'git add -n .',
    'git add src/cart.ts README.md',
    'git restore --source=origin/mochitsuki --staged --worktree :/',
    'git switch main && git pull',
    'git commit -m "feat(cart): count the items"',
    'git status && git log --oneline -3',
    'npm test',
    'echo main',
  ])
    assert.ok(!asks(command), command);
});

test('a multi-line script is read command by command', () => {
  assert.ok(asks('git add src/cart.ts\ngit commit -m "x"\ngit push origin main'));
  assert.ok(!asks('git add src/cart.ts\ngit commit -m "x"\ngit push -u origin feat/x'));
});

test('a push on main with no refspec asks, and on a feature branch it does not', () => {
  const dir = repo();
  sh(dir, 'git switch -q -c feat/x');
  assert.ok(!asks('git push', dir));
  assert.ok(!asks('git push origin HEAD', dir));
});

test('bad input is silent', () => {
  for (const input of ['not json', '{}', JSON.stringify({ tool_input: {} })]) {
    const result = spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  }
});
