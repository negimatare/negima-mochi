import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checks } from '../scripts/kit-rules.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// A copy of the parts of the kit that the checks read, to plant a mistake in.
const copy = () => {
  const dir = mkdtempSync(join(tmpdir(), 'kit-rules-test-'));
  for (const path of ['.claude-plugin', 'plugins', 'CLAUDE.md', 'CONTRIBUTING.md', 'README.md', 'CHANGELOG.md', 'docs', 'extras'])
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
  edit(dir, '.claude-plugin/marketplace.json', (text) => `{,${text.slice(1)}`);
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

test('an eval case off the layout is named', () => {
  const dir = copy();
  const evals = 'plugins/mochi/evals';
  const link = `${evals}/commit-splits-unrelated-changes/graders/git-worked.md`;
  const target = readFileSync(join(dir, link), 'utf8');
  rmSync(join(dir, link));
  writeFileSync(join(dir, link), target);
  edit(dir, `${evals}/tidy-removes-comments-that-restate-the-code/case.yaml`, (text) => text.replace(/^name: .*$/m, 'name: tidy-removes-comments'));
  edit(dir, `${evals}/pr-drafts-without-gh/prompt.md`, (text) => text.replace(/^tags: \[(.*)\]$/m, 'tags: [$1, deploy]'));
  edit(dir, `${evals}/commit-splits-unrelated-changes/prompt.md`, (text) => text.replace(/^tags: \[(.*)\]$/m, 'tags: [$1, smoke]'));
  rmSync(join(dir, `${evals}/fix-bug-asks-for-missing-steps/fixture.sh`));
  edit(dir, `${evals}/split-proposes-parts-and-stops/prompt.md`, (text) => text.replace(/^tags: \[.*\]$/m, 'tags: [core]'));
  edit(dir, `${evals}/commit-leaves-working-state-out/prompt.md`, (text) => text.replace('"../../eval-observer"', '"../_shared"'));
  edit(dir, `${evals}/commit-branches-off-the-default/prompt.md`, (text) => text.replace('"../../eval-observer"', '"../../observer"'));
  assert.deepEqual(checks.evalLayout(dir), [
    `${evals}/commit-branches-off-the-default/prompt.md: plugin ../../observer does not exist.`,
    `${evals}/commit-leaves-working-state-out/prompt.md: plugin ../_shared is in evals/ but not in this case; the eval runner refuses it.`,
    `${evals}/commit-splits-unrelated-changes/graders/git-worked.md: not a link to ../../_shared/git-worked.md.`,
    `${evals}/fix-bug-asks-for-missing-steps: no fixture.sh.`,
    `${evals}/pr-drafts-without-gh/prompt.md: tag deploy is not in CONTRIBUTING's list for mochi.`,
    `${evals}/split-proposes-parts-and-stops/prompt.md: no subject tag from CONTRIBUTING's list for mochi.`,
    `${evals}/tidy-removes-comments-that-restate-the-code/case.yaml: name is tidy-removes-comments, not its folder.`,
    `plugins/mochi/evals: 2 cases have the smoke tag; CONTRIBUTING gives it to one.`,
  ]);
});

test('a real version in a docs example is named', () => {
  const dir = copy();
  edit(dir, 'README.md', (text) => `${text}\nPin it: \`claude plugin install mochi@negima-mochi#v1.3.1\`.\n\n\`\`\`bash\ngit tag -s v2.0.0\n\`\`\`\n`);
  edit(dir, 'CONTRIBUTING.md', (text) => `${text}\nThe figures come from the 1.2.0 runs.\n`);
  const lines = readFileSync(join(dir, 'README.md'), 'utf8').split('\n');
  const at = (needle) => lines.findIndex((line) => line.includes(needle)) + 1;
  assert.deepEqual(checks.docVersions(dir), [
    `README.md:${at('Pin it')}: v1.3.1 in an example; write 1.x.y, or v1.x.y for a tag.`,
    `README.md:${at('git tag -s v2.0.0')}: v2.0.0 in an example; write 1.x.y, or v1.x.y for a tag.`,
  ]);
});

test('a CHANGELOG release off the shape is named', () => {
  const dir = copy();
  edit(dir, 'CHANGELOG.md', (text) =>
    text
      .replace('## 1.3.1 — 2026-11-20', '## 1.3.1')
      .replace('### For contributors\n\n- **A new integration branch.**', '### For contributors\n\n- A new integration branch.')
      .replace(/(## 1\.3\.0 — [^\n]*\n[\s\S]*?)### mochi plugin/, '$1### For contributors\n\n- **Planted.** Text.\n\n### mochi plugin')
      .replace(/(## 1\.1\.0 — [^\n]*\n[\s\S]*?)### mochi-react plugin/, '$1### Notes'),
  );
  assert.deepEqual(checks.changelog(dir), [
    'CHANGELOG.md: "## 1.3.1" is not "## X.Y.Z — YYYY-MM-DD" or "— unreleased".',
    'CHANGELOG.md: in 1.1.0, "### Notes" is not Update, a "<plugin> plugin" or For contributors.',
    'CHANGELOG.md: in 1.3.0, "### For contributors" appears twice.',
    'CHANGELOG.md: in 1.3.0, "### mochi plugin" comes after For contributors, which is last.',
    'CHANGELOG.md: in 1.3.2, the item "- A new integration branch. Pull requests target `mochitsuki`. Only a" has no bold lead.',
  ]);
});
