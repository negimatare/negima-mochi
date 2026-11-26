// Proves that the outcome graders of the eval suites can pass and can fail,
// with no model call: each scenario builds the case's fixture, plays a run
// by script, runs the eval observer, and applies the grader files as
// `claude plugin eval` does.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { observe, scaffold, sh } from './eval-fixture.mjs';

const PLUGINS = fileURLToPath(new URL('../plugins/', import.meta.url));
const END_STATE = '.eval/end-state.txt';

// A YAML scalar as the grader files write it: plain, '…' or "…".
const scalar = (value) => {
  if (value.startsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
  if (value.startsWith('"')) return JSON.parse(value);
  return value;
};

export const readGrader = (path) => {
  const block = readFileSync(path, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1];
  const grader = {};
  let key;
  for (const line of block.split('\n')) {
    const nested = line.match(/^\s+([\w_]+):\s*(.*)$/);
    const top = line.match(/^([\w_]+):\s*(.*)$/);
    if (nested && key) grader[key] = { ...(typeof grader[key] === 'object' ? grader[key] : {}), [nested[1]]: scalar(nested[2]) };
    else if (top) {
      key = top[1];
      grader[key] = top[2] === '' ? {} : scalar(top[2]);
    }
  }
  return grader;
};

// The regex grader of claude plugin eval 2.1.332: flags default to none,
// match defaults to contains, count:N counts global matches, and a file
// target must exist for any match mode.
export const applyRegex = (grader, { dir, reply = '' }) => {
  const target = grader.target ?? 'last_message';
  let text;
  if (target === 'last_message') text = reply;
  else if (target.source === 'file') {
    const file = join(dir, target.path);
    if (!existsSync(file)) return false;
    text = readFileSync(file, 'utf8');
  } else throw new Error(`no test support for target ${JSON.stringify(target)}`);
  const flags = grader.flags ?? '';
  const match = grader.match ?? 'contains';
  const found = new RegExp(grader.pattern, flags).test(text);
  if (match === 'contains') return found;
  if (match === 'not_contains') return !found;
  const count = Number(match.match(/^count:(\d+)$/)[1]);
  return (text.match(new RegExp(grader.pattern, flags.includes('g') ? flags : `${flags}g`)) ?? []).length === count;
};

// For each case: the script of a run that does the job, the reply it
// gives, and for each outcome grader a script of a run that breaks it.
const TEST = 'bash scripts/test.sh >/dev/null 2>&1';
const EDIT = 'echo "// edited" >> src/cart.ts';
const NOTHING = 'true';
const commit = (message, paths = 'src') => `git add ${paths} && git commit -q -m "${message}"`;
const push = (branch) => `git push -q -u origin ${branch}`;
const branch = (name, from = '') => `git switch -q -c ${name} ${from}`;
// Two slices on a feature branch, tested and pushed.
const twoSlices = (pushIt = true, testLast = true) =>
  [branch('feat/member-discount'), EDIT, commit('feat(cart): slice 1'), EDIT, commit('feat(cart): slice 2'), testLast ? TEST : NOTHING, pushIt ? push('feat/member-discount') : NOTHING, testLast ? NOTHING : EDIT].join(' && ');
const stopsBeforeCode = {
  good: NOTHING,
  bad: {
    'commits-nothing': `echo notes > notes.md && ${commit('docs: notes', 'notes.md')}`,
    'edits-no-source': EDIT,
  },
};

const SCENARIOS = {
  'mochi/commit-leaves-working-state-out': {
    good: 'bash scripts/test.sh >/dev/null 2>&1; git add src && git commit -q -m "feat(cart): count the items"',
    bad: {
      'leaves-scratch-out': 'bash scripts/test.sh >/dev/null 2>&1; git add src scratch.txt && git commit -q -m "feat(cart): count the items"',
      'leaves-the-plan-out': 'bash scripts/test.sh >/dev/null 2>&1; git add src .plans && git commit -q -m "feat(cart): count the items"',
      'commits-the-item-count': 'bash scripts/test.sh >/dev/null 2>&1',
      'commits-a-tested-tree': 'git add src && git commit -q -m "feat(cart): count the items"',
    },
  },
  'mochi/commit-branches-off-the-default': {
    good: [TEST, branch('feat/cart-total'), commit('feat(cart): x'), push('feat/cart-total')].join(' && '),
    bad: { 'pushes-a-feature-branch': [TEST, branch('feat/cart-total'), commit('feat(cart): x')].join(' && ') },
  },
  'mochi/commit-splits-unrelated-changes': {
    good: [TEST, commit('docs: readme', 'README.md'), commit('feat(cart): x')].join(' && '),
    bad: {
      'commits-the-readme': commit('feat(cart): x'),
      'commits-the-cart-change': commit('docs: readme', 'README.md'),
      'commits-them-apart': commit('feat(cart): x and readme', 'README.md src'),
    },
  },
  'mochi/build-commits-each-slice-to-a-branch': {
    good: twoSlices(),
    bad: {
      'commits-each-slice': [branch('feat/member-discount'), EDIT, commit('feat(cart): both slices'), TEST, push('feat/member-discount')].join(' && '),
      'pushes-the-feature-branch': twoSlices(false),
      'ends-on-a-tested-tree': twoSlices(true, false),
    },
  },
  'mochi/build-offers-a-fresh-session-for-the-review': {
    good: twoSlices(),
    bad: { 'commits-each-slice': [branch('feat/member-discount'), EDIT, commit('feat(cart): both slices')].join(' && ') },
  },
  'mochi/build-offers-a-split-for-a-deploy-order': stopsBeforeCode,
  'mochi/build-offers-a-split-for-a-plan-over-400-lines': stopsBeforeCode,
  'mochi/build-waits-for-the-earlier-part': stopsBeforeCode,
  'mochi/build-stacks-on-the-open-part': {
    good: [branch('feat/order-exports-2-customer-csv', 'feat/order-exports-1-monthly-csv'), EDIT, commit('feat(exports): customer csv'), push('feat/order-exports-2-customer-csv')].join(' && '),
    bad: {
      // A branch cut from part 1 holds part 1's commits: they are not part 2's.
      'commits-part-2': [branch('feat/order-exports-2-customer-csv', 'feat/order-exports-1-monthly-csv'), push('feat/order-exports-2-customer-csv')].join(' && '),
      'pushes-part-2s-branch': [branch('feat/order-exports-2-customer-csv', 'feat/order-exports-1-monthly-csv'), EDIT, commit('feat(exports): customer csv')].join(' && '),
    },
  },
  'mochi/fix-bug-asks-for-missing-steps': { good: NOTHING, bad: { 'changes-nothing': EDIT } },
  'mochi/fix-bug-fixes-when-asked': {
    good: [branch('fix/cart-rounding'), EDIT, TEST, commit('fix(cart): round the total'), push('fix/cart-rounding')].join(' && '),
    bad: {
      'pushes-one-fix-commit': [branch('fix/cart-rounding'), EDIT, commit('test(cart): reproduce'), EDIT, TEST, commit('fix(cart): round the total'), push('fix/cart-rounding')].join(' && '),
      'ends-on-a-tested-tree': [branch('fix/cart-rounding'), EDIT, commit('fix(cart): round the total'), push('fix/cart-rounding')].join(' && '),
    },
  },
  'mochi/fix-bug-reproduces-then-waits': {
    good: TEST,
    bad: { 'commits-nothing': [EDIT, commit('fix(cart): round the total')].join(' && ') },
  },
};

const graderFiles = (key) => {
  const [plugin, name] = key.split('/');
  const dir = join(PLUGINS, plugin, 'evals', name, 'graders');
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => [file.replace(/\.md$/, ''), readGrader(join(dir, file))]);
};
const outcomeGraders = (key) => graderFiles(key).filter(([, grader]) => grader.type === 'regex' && grader.target?.path === END_STATE);

const play = (key, script) => {
  const [plugin, name] = key.split('/');
  const dir = scaffold(name, plugin);
  sh(dir, script);
  observe(dir);
  return dir;
};

test('each grader of the end state has a scenario that breaks it', () => {
  for (const plugin of ['mochi', 'mochi-react', 'mochi-python'])
    for (const name of readdirSync(join(PLUGINS, plugin, 'evals'))) {
      if (!existsSync(join(PLUGINS, plugin, 'evals', name, 'graders'))) continue;
      const key = `${plugin}/${name}`;
      for (const [grader, fields] of outcomeGraders(key)) {
        assert.ok(SCENARIOS[key]?.bad[grader], `${key}/graders/${grader}.md has no planted failure in tests/graders.test.mjs`);
        assert.equal(fields.arm, 'with-only', `${key}/graders/${grader}.md reads the observer, which the baseline arm does not load`);
      }
    }
});

for (const [key, scenario] of Object.entries(SCENARIOS)) {
  test(`${key}: a good run passes each outcome grader`, () => {
    const dir = play(key, scenario.good);
    for (const [name, grader] of outcomeGraders(key)) assert.ok(applyRegex(grader, { dir }), `${name} fails a good run:\n${readFileSync(join(dir, END_STATE), 'utf8')}`);
  });
  for (const [name, script] of Object.entries(scenario.bad))
    test(`${key}: ${name} fails a planted bad run`, () => {
      const dir = play(key, script);
      const grader = Object.fromEntries(graderFiles(key))[name];
      assert.ok(grader, `no grader ${name}`);
      assert.equal(applyRegex(grader, { dir }), false, readFileSync(join(dir, END_STATE), 'utf8'));
    });
}
