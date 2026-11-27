import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENV, sh, tempDir } from './eval-fixture.mjs';

const HOOK = fileURLToPath(new URL('../plugins/mochi/scripts/guard-git.mjs', import.meta.url));

// A repository on <branch> whose origin/HEAD names it, or with no origin/HEAD.
const repo = (branch = 'main', withOriginHead = true) => {
  const dir = tempDir('guard-git-');
  sh(dir, `git init -q -b ${branch} && git -c user.name=shop -c user.email=shop@example.invalid commit -q --allow-empty -m init && git remote add origin https://example.invalid/shop.git`);
  if (withOriginHead) sh(dir, `git update-ref refs/remotes/origin/${branch} HEAD && git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/${branch}`);
  return dir;
};
const MAIN = repo();
const TRUNK = repo('trunk');
const FEATURE = repo();
sh(FEATURE, 'git switch -q -c feat/x');
const OUTSIDE = tempDir('guard-git-outside-');

const decide = (command, cwd = MAIN) => {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd }),
    encoding: 'utf8',
    env: ENV,
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput : undefined;
};
const asks = (command, cwd) => decide(command, cwd)?.permissionDecision === 'ask';
const reason = (command, cwd) => decide(command, cwd)?.permissionDecisionReason ?? '';

test('a push to the default branch asks, and says why', () => {
  for (const command of [
    'git push origin main',
    'git push origin HEAD',
    'git push origin @',
    'git push origin HEAD:main',
    'git push origin feat/x:main',
    'git push origin :main',
    'git push origin refs/heads/main',
    'git push',
    'git push -u origin',
    'git push > /tmp/push.log 2>&1',
    'FOO=1 git push origin main',
    'env FOO=1 git push origin main',
    'if git push origin main; then echo ok; fi',
    'git \\\n  push origin main',
  ])
    assert.ok(asks(command), command);
  assert.match(reason('git push origin main'), /default branch/);
});

test('the default branch is the one origin/HEAD names, read in the folder of the command', () => {
  assert.ok(asks('git push origin trunk', TRUNK));
  assert.ok(!asks('git push origin main', TRUNK), 'main is not the default here');
  assert.ok(asks(`cd ${TRUNK} && git push origin trunk`, OUTSIDE));
  assert.ok(asks(`git -C ${TRUNK} push origin trunk`, OUTSIDE));
  assert.ok(!asks('git push origin trunk', OUTSIDE), 'outside a repository, trunk is not main or master');
});

test('the integration branch of CLAUDE.md is guarded too, and so is origin/HEAD', () => {
  const dir = repo();
  sh(dir, "git switch -q -c develop && printf 'Integration branch: `develop`\\n' > CLAUDE.md");
  assert.ok(asks('git push origin develop', dir));
  assert.ok(asks('git push', dir), 'the current branch is develop');
  assert.ok(asks('git push origin main', dir), 'origin/HEAD stays guarded');
  assert.ok(!asks('git push origin feat/x', dir));
  assert.match(reason('git push origin develop', dir), /default branch/);
});

test('with the line and no origin/HEAD, main and master stay guarded', () => {
  const dir = repo('main', false);
  sh(dir, "printf 'Integration branch: `develop`\\n' > CLAUDE.md");
  assert.ok(asks('git push origin develop', dir));
  assert.ok(asks('git push origin main', dir));
  assert.ok(asks('git push origin master', dir));
  assert.ok(!asks('git push origin feat/x', dir));
});

test('without origin/HEAD, main and master count as the default branch', () => {
  const dir = repo('main', false);
  assert.ok(asks('git push origin main', dir));
  assert.ok(asks('git push origin master', dir));
  assert.ok(!asks('git push origin feat/x', dir));
});

test('a plain force push asks and says why; a push with the lease does not', () => {
  for (const command of ['git push -f origin feat/x', 'git push --force origin feat/x', 'git push origin +feat/x', 'git push -fu origin feat/x'])
    assert.ok(asks(command, FEATURE), command);
  assert.match(reason('git push -f origin feat/x', FEATURE), /--force-with-lease/);
  assert.doesNotMatch(reason('git push -f origin feat/x', FEATURE), /default branch/);
  for (const command of [
    'git push --force-with-lease -u origin feat/x',
    'git push --force-with-lease --force-if-includes origin feat/x',
    'git push --force-with-lease=feat/x:abc123 origin feat/x',
  ])
    assert.ok(!asks(command, FEATURE), command);
});

test('a push of every branch asks, even from a feature branch', () => {
  assert.ok(asks('git push --all origin', FEATURE));
  assert.ok(asks('git push --mirror origin', FEATURE));
});

test('staging all, committing all, and skipping the hooks ask, and say why', () => {
  for (const command of ['git add -A', 'git add --all', 'git add .', 'git add -u', 'git add -Av', 'git add :/', 'git commit -a -m "x"', 'git commit -am "x"', 'git commit --all -m "x"'])
    assert.ok(/explicit path/.test(reason(command, FEATURE)), command);
  for (const command of ['git commit --no-verify -m "x"', 'git commit -n -m "x"', 'git push --no-verify origin feat/x'])
    assert.ok(/git hooks/.test(reason(command, FEATURE)), command);
});

test('the words of a commit message, a heredoc, a quoted string or a comment are not commands', () => {
  for (const command of [
    `git commit -m "$(cat <<'EOF'\nfix: never run git push origin main (or "git add -A")\n\nDo not use --no-verify, -a, or git add -A.\nEOF\n)"`,
    "git commit -F - <<'EOF'\ngit push -f origin main\ngit add -A\nEOF",
    'git commit -m $(printf "%s" "x; git push origin main")',
    'git commit -m "docs: say git add . is refused; git push origin main too"',
    "git commit -m 'docs: x; git push origin main now'",
    "git commit -m $'it\\'s; git push origin main'",
    'git add src/a.ts  # not git add -A',
    'git status # check && git push origin main',
    'git commit -Sabc123 -m x',
    'git commit -uno -m x',
  ])
    assert.ok(!asks(command, FEATURE), command);
});

test('what follows a here-string, an arithmetic expansion or a comment is still read', () => {
  for (const command of [
    'git commit -F - <<< "msg"\ngit push --force origin feat/x',
    'echo $((1 << 2)) && git push --force origin feat/x',
    "git fetch origin  # get the base's commits\ngit push --force origin feat/x",
  ])
    assert.ok(asks(command, FEATURE), command);
});

test('the release steps and other commands are silent', () => {
  for (const command of [
    'git push origin v1.x.y',
    'git push origin --tags',
    'git push -n origin main',
    'git push --dry-run origin main',
    'git add -n .',
    'git restore --source=origin/mochitsuki --staged --worktree :/',
    'git switch main && git pull',
    'git status && git log --oneline -3',
    'git -c core.hooksPath=/dev/null commit -m "x"',
    'npm test',
    'echo main',
  ])
    assert.ok(!asks(command), command);
  for (const command of ['git push -u origin feat/x', 'git push -u origin release/1.x.y', 'git add src/cart.ts README.md', 'git commit -m "feat(cart): count the items"'])
    assert.ok(!asks(command, FEATURE), command);
});

test('a multi-line script is read command by command', () => {
  assert.ok(asks('git add src/cart.ts\ngit commit -m "x"\ngit push origin main'));
  assert.ok(!asks('git add src/cart.ts\ngit commit -m "x"\ngit push -u origin feat/x'));
});

test('on a feature branch, a push with no refspec or HEAD does not ask', () => {
  assert.ok(!asks('git push', FEATURE));
  assert.ok(!asks('git push origin HEAD', FEATURE));
});

test('bad input is silent', () => {
  for (const input of ['not json', '{}', JSON.stringify({ tool_input: {} })]) {
    const result = spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8', env: ENV });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  }
});
