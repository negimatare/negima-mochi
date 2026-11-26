import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { observe, scaffold, sh, tempDir } from './eval-fixture.mjs';

const dump = (dir) => readFileSync(join(dir, '.eval/end-state.txt'), 'utf8');

test('the dump lists the commits that the run made, each line with its branch', () => {
  const dir = scaffold('commit-leaves-working-state-out');
  sh(dir, 'git add src scratch.txt && git commit -q -m "feat(cart): count the items" && git switch -q -c feat/item-count && git push -q -u origin feat/item-count');
  const result = observe(dir);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  const lines = dump(dir).split('\n');
  for (const branch of ['main', 'feat/item-count']) {
    assert.ok(lines.includes(`local ${branch} feat(cart): count the items`), branch);
    assert.ok(lines.includes(`file ${branch} feat(cart): count the items scratch.txt`), branch);
    assert.ok(lines.includes(`file ${branch} feat(cart): count the items src/cart.ts`), branch);
  }
  assert.ok(lines.includes('origin feat/item-count feat(cart): count the items'));
  assert.ok(!lines.some((line) => line.startsWith('origin main ')), 'nothing new on origin main');
  assert.ok(lines.includes('status ?? .plans/20261102-item-count.md'));
  assert.match(dump(dir), /^tree [0-9a-f]{40}$/m);
});

test('a failing or partial test run does not make the tree tested', () => {
  const dir = scaffold('commit-leaves-working-state-out');
  sh(dir, 'echo \'throw new Error("broken");\' >> src/cart.ts && { bash scripts/test.sh >/dev/null 2>&1 || true; }');
  observe(dir);
  assert.match(dump(dir), /^tested no$/m, 'a failing run');
  sh(dir, "perl -ni -e 'print unless /broken/' src/cart.ts && bash scripts/test.sh src/cart.test.ts >/dev/null 2>&1");
  observe(dir);
  assert.match(dump(dir), /^tested no$/m, 'a run of one file');
});

test('a tag with the name of a branch, and a deleted file, read right', () => {
  const dir = scaffold('commit-leaves-working-state-out');
  sh(dir, 'git switch -q -c feat/x && git rm -q CLAUDE.md && git commit -q -m "test: drop" && git tag feat/x');
  observe(dir);
  assert.match(dump(dir), /^local feat\/x test: drop$/m);
  assert.doesNotMatch(dump(dir), /^file feat\/x test: drop CLAUDE\.md$/m, 'a deleted file is not a file of the commit');
});

test('a repository whose config sets a filter is not read, and no dump is left', () => {
  const dir = scaffold('commit-leaves-working-state-out');
  observe(dir);
  assert.ok(existsSync(join(dir, '.eval/end-state.txt')));
  sh(dir, 'git config filter.x.clean "touch .eval/ran" && echo "*.ts filter=x" > .gitattributes');
  assert.equal(observe(dir).status, 0);
  assert.equal(existsSync(join(dir, '.eval/end-state.txt')), false, 'a stale dump would pass the not_contains graders');
  assert.equal(existsSync(join(dir, '.eval/ran')), false, 'the filter ran');
  assert.match(readFileSync(join(dir, '.eval/observer-error.txt'), 'utf8'), /filter/);
});

test('the dump says whether the final tree is one that passed its tests', () => {
  const dir = scaffold('commit-leaves-working-state-out');
  sh(dir, 'bash scripts/test.sh >/dev/null 2>&1');
  observe(dir);
  assert.match(dump(dir), /^tested yes$/m);
  sh(dir, 'mkdir -p .reviews && echo "# Findings" > .reviews/REV-20261102-item-count.md');
  observe(dir);
  assert.match(dump(dir), /^tested yes$/m, 'working state is not part of the tree');
  sh(dir, 'echo "// later" >> src/cart.ts');
  observe(dir);
  assert.match(dump(dir), /^tested no$/m);
  sh(dir, 'bash scripts/test.sh >/dev/null 2>&1');
  observe(dir);
  assert.match(dump(dir), /^tested yes$/m);
});

test('outside an eval repository, or with bad input, it writes nothing and stays silent', () => {
  const dir = tempDir('observer-none-');
  sh(dir, 'git init -q');
  for (const result of [observe(dir), observe(dir, 'not json'), observe(dir, { cwd: join(dir, 'missing') })]) {
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
  assert.equal(existsSync(join(dir, '.eval')), false);
});

test('the working files are copied, each after its path', () => {
  const dir = scaffold('commit-leaves-working-state-out');
  sh(dir, 'mkdir -p .reviews && printf "## Bugs\\n- x\\n" > .reviews/REF-20261102-checkout.md');
  observe(dir);
  assert.equal(
    readFileSync(join(dir, '.eval/working-files.txt'), 'utf8'),
    '=== .plans/20261102-item-count.md\n# Item count\n\n=== .reviews/REF-20261102-checkout.md\n## Bugs\n- x\n',
  );
});

test('a git failure leaves no dump, so that each grader of it fails', () => {
  const dir = scaffold('commit-leaves-working-state-out');
  writeFileSync(join(dir, '.eval/fixture-refs'), 'not-a-commit\n');
  assert.equal(observe(dir).status, 0);
  assert.equal(existsSync(join(dir, '.eval/end-state.txt')), false);
  assert.ok(readFileSync(join(dir, '.eval/observer-error.txt'), 'utf8').length > 1);
});
