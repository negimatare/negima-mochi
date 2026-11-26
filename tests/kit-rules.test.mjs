import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checks } from '../scripts/kit-rules.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// A copy of the parts of the kit that the checks read, to plant a mistake in.
const copy = () => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-rules-test-'));
  for (const path of ['.claude-plugin', 'plugins', 'CLAUDE.md', 'CONTRIBUTING.md', 'README.md', 'CHANGELOG.md', 'docs'])
    cpSync(join(ROOT, path), join(dir, path), { recursive: true, verbatimSymlinks: true, filter: (from) => !from.includes('/evals/results') });
  return dir;
};
const edit = (dir, path, change) => writeFileSync(join(dir, path), change(readFileSync(join(dir, path), 'utf8')));

test('the kit passes every check', () => {
  for (const [name, check] of Object.entries(checks)) assert.deepEqual(check(ROOT), [], name);
});

test('a pinned model on an inherit reviewer is named', () => {
  const dir = copy();
  edit(dir, 'plugins/mochi/agents/quick-reviewer.md', (text) => text.replace('model: inherit', 'model: sonnet'));
  assert.deepEqual(checks.modelPins(dir), ['plugins/mochi/agents/quick-reviewer.md: model is sonnet; CLAUDE.md keeps this reviewer on inherit.']);
});

test('a plugin version that differs from the others is named', () => {
  const dir = copy();
  edit(dir, 'plugins/mochi-react/.claude-plugin/plugin.json', (text) => text.replace(/"version": "[^"]+"/, '"version": "9.9.9"'));
  assert.match(checks.manifests(dir).join('\n'), /plugins\/mochi-react\/\.claude-plugin\/plugin\.json: version 9\.9\.9/);
});

test('a manifest whose name is not its marketplace entry is named', () => {
  const dir = copy();
  edit(dir, 'plugins/mochi-python/.claude-plugin/plugin.json', (text) => text.replace('"name": "mochi-python"', '"name": "mochi-py"'));
  assert.match(checks.manifests(dir).join('\n'), /plugins\/mochi-python\/\.claude-plugin\/plugin\.json: name mochi-py/);
});

test('a manifest that does not parse is named', () => {
  const dir = copy();
  edit(dir, '.claude-plugin/marketplace.json', (text) => text.replace('{', '{,'));
  assert.match(checks.manifests(dir).join('\n'), /\.claude-plugin\/marketplace\.json: not valid JSON/);
});

test('a skill without a description, or with a name that is not its folder, is named', () => {
  const dir = copy();
  edit(dir, 'plugins/mochi/skills/tidy/SKILL.md', (text) => text.replace(/^description: .*\n/m, ''));
  edit(dir, 'plugins/mochi/skills/split/SKILL.md', (text) => text.replace('name: split', 'name: splits'));
  assert.deepEqual(checks.frontmatter(dir), [
    'plugins/mochi/skills/split/SKILL.md: name is splits, not its folder split.',
    'plugins/mochi/skills/tidy/SKILL.md: no description in the frontmatter.',
  ]);
});

test('an agent without a name is named', () => {
  const dir = copy();
  edit(dir, 'plugins/mochi-react/agents/a11y-reviewer.md', (text) => text.replace(/^name: .*\n/m, ''));
  assert.deepEqual(checks.frontmatter(dir), ['plugins/mochi-react/agents/a11y-reviewer.md: no name in the frontmatter.']);
});

test('an agent id that resolves to no agent is named, in skill text and in graders', () => {
  const dir = copy();
  edit(dir, 'plugins/mochi/skills/plan/SKILL.md', (text) => text.replace('mochi:05-032-mendicant-bias', 'mochi:05-032-mendicant-bais'));
  const grader = 'plugins/mochi/evals/review-runs-the-panel-at-a-trust-boundary/graders/ran-test-reviewer.md';
  edit(dir, grader, (text) => text.replace('049-abject-testament', '049-abject-testamint'));
  assert.deepEqual(checks.agentRefs(dir), [
    `${grader}: 049-abject-testamint is no agent's name.`,
    'plugins/mochi/skills/plan/SKILL.md: mochi:05-032-mendicant-bais is no agent of mochi.',
  ]);
});
