import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../scripts/eval-history.mjs', import.meta.url));
const HEADER = 'release\tcase\tmodel\tarm\tpasses\truns\tcost_usd\tseconds\tfailed';

const pluginWith = (cases, history) => {
  const dir = mkdtempSync(join(tmpdir(), 'eval-history-test-'));
  for (const [name, tags] of Object.entries(cases)) {
    mkdirSync(join(dir, 'evals', name), { recursive: true });
    writeFileSync(join(dir, 'evals', name, 'prompt.md'), `---\ndescription: x\ntags: [${tags}]\n---\n\nx\n`);
  }
  mkdirSync(join(dir, 'evals'), { recursive: true });
  if (history) writeFileSync(join(dir, 'evals', 'history.tsv'), [HEADER, ...history].join('\n') + '\n');
  return dir;
};

const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

// --demote compares each case's graders with the tag of the first release.
const git = (dir, ...args) => {
  const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
};
const tagged = (dir, tag) => {
  git(dir, 'init', '-q');
  git(dir, 'add', '-A');
  git(dir, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-q', '--allow-empty', '-m', 'graders');
  git(dir, 'tag', tag);
  return dir;
};
const grader = (dir, name, file, text) => {
  mkdirSync(join(dir, 'evals', name, 'graders'), { recursive: true });
  writeFileSync(join(dir, 'evals', name, 'graders', file), text);
};

// One row: release, case, model, arm, passes, runs, and the graders that failed.
const row = (release, name, model, arm, passes, runs, failed = '') =>
  [release, name, model, arm, passes, runs, '0.10', '10', failed].join('\t');
const cleanRows = (release, name) => [
  row(release, name, 'opus-5-5', 'with', 1, 1),
  row(release, name, 'sonnet-5-5', 'with', 1, 1),
];

test('--demote lists only core cases that passed every run on both models in three releases', () => {
  const releases = ['1.9.0', '1.10.0', '1.11.0'];
  const history = releases.flatMap((release) => [
    ...cleanRows(release, 'clean'),
    row(release, 'clean', 'opus-5-5', 'without', 0, 1),
    ...cleanRows(release, 'not-core'),
    ...(release === '1.10.0'
      ? [row(release, 'rerun', 'opus-5-5', 'with', 1, 1), row(release, 'rerun', 'sonnet-5-5', 'with', 1, 2)]
      : cleanRows(release, 'rerun')),
    ...(release === '1.10.0' ? [row(release, 'no-sonnet', 'opus-5-5', 'with', 1, 1)] : cleanRows(release, 'no-sonnet')),
    ...(release === '1.10.0'
      ? [row(release, 'cut-off', 'opus-5-5', 'with', 0, 0), row(release, 'cut-off', 'sonnet-5-5', 'with', 1, 1)]
      : cleanRows(release, 'cut-off')),
  ]);
  const dir = pluginWith(
    { clean: 'pr, core', 'not-core': 'pr', rerun: 'pr, core', 'no-sonnet': 'pr, core', 'cut-off': 'pr, core' },
    history,
  );
  const result = run(tagged(dir, 'v1.9.0'), '--demote');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1\.9\.0, 1\.10\.0, 1\.11\.0/);
  assert.deepEqual(result.stdout.match(/^- .*$/gm), ['- clean']);
});

test('--demote lists apart a case whose graders changed since the first release', () => {
  const releases = ['1.9.0', '1.10.0', '1.11.0'];
  const names = ['same', 'edited', 'added', 'removed', 'linked', 'still-linked'];
  const dir = pluginWith(
    Object.fromEntries(names.map((name) => [name, 'pr, core'])),
    releases.flatMap((release) => names.flatMap((name) => cleanRows(release, name))),
  );
  for (const name of names) grader(dir, name, 'finds-it.md', '---\ntype: llm\n---\n\nPASS if x.\n');
  grader(dir, 'removed', 'also.md', 'y\n');
  mkdirSync(join(dir, 'evals', '_shared'));
  writeFileSync(join(dir, 'evals', '_shared', 'finds-it.md'), '---\ntype: llm\n---\n\nPASS if x.\n');
  rmSync(join(dir, 'evals', 'still-linked', 'graders', 'finds-it.md'));
  symlinkSync('../../_shared/finds-it.md', join(dir, 'evals', 'still-linked', 'graders', 'finds-it.md'));
  tagged(dir, 'v1.9.0');
  grader(dir, 'edited', 'finds-it.md', '---\ntype: llm\n---\n\nPASS if z.\n');
  grader(dir, 'added', 'more.md', 'z\n');
  rmSync(join(dir, 'evals', 'removed', 'graders', 'also.md'));
  // A grader that became a link to the same text has not changed.
  rmSync(join(dir, 'evals', 'linked', 'graders', 'finds-it.md'));
  symlinkSync('../../_shared/finds-it.md', join(dir, 'evals', 'linked', 'graders', 'finds-it.md'));
  const result = run(dir, '--demote');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.match(/^- .*$/gm), ['- linked', '- same', '- still-linked']);
  assert.deepEqual(result.stdout.match(/^\* .*$/gm), ['* added', '* edited', '* removed']);
  assert.match(result.stdout, /changed since v1\.9\.0/);
});

test('--demote stops when it cannot read the tag of the first release', () => {
  const releases = ['1.9.0', '1.10.0', '1.11.0'];
  const dir = pluginWith({ clean: 'pr, core' }, releases.flatMap((release) => cleanRows(release, 'clean')));
  const result = run(tagged(dir, 'v1.8.0'), '--demote');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Cannot read the graders at v1\.9\.0/);
  assert.doesNotMatch(result.stdout, /^- /m);
});

test('--demote waits for three releases', () => {
  const dir = pluginWith({ clean: 'core' }, [...cleanRows('1.1.0', 'clean'), ...cleanRows('1.2.0', 'clean')]);
  assert.match(run(dir, '--demote').stdout, /needs 3/);
});

test('the runs of a release add up, and replace only the rows of that release', () => {
  const dir = pluginWith({}, [row('1.2.0', 'kept', 'opus-5-5', 'with', 1, 1), row('1.3.0', 'stale', 'opus-5-5', 'with', 1, 1)]);
  const result = (passed, extra = {}) => ({ passed, costUsd: 0.1, durationSeconds: 10, ...extra });
  const json = (name, runs) => {
    const file = join(dir, name);
    writeFileSync(
      file,
      JSON.stringify({
        suite: { modelOverride: 'global.anthropic.claude-sonnet-5-5' },
        cases: [{ name: 'flaky', arms: { with: runs } }],
      }),
    );
    return file;
  };
  const first = json('sonnet-1.json', [result(false), result(false, { skippedPaidGraders: true })]);
  const rerun = json('sonnet-2.json', [result(true)]);
  assert.equal(run(dir, '1.3.0', first, rerun).status, 0);
  const rows = readFileSync(join(dir, 'evals', 'history.tsv'), 'utf8').replace(/\n$/, '').split('\n').slice(1);
  assert.deepEqual(rows, [
    row('1.2.0', 'kept', 'opus-5-5', 'with', 1, 1),
    ['1.3.0', 'flaky', 'sonnet-5-5', 'with', 1, 2, '0.30', '30', ''].join('\t'),
  ]);
});

test('a row names each scored grader that failed in a counted run', () => {
  const oldRow = ['1.2.0', 'kept', 'opus-5-5', 'with', 1, 1, '0.10', '10'].join('\t');
  const dir = pluginWith({}, [oldRow]);
  const grader = (name, passed, scored = true) => ({ name, passed, scored });
  const file = join(dir, 'opus-1.json');
  writeFileSync(
    file,
    JSON.stringify({
      suite: { modelOverride: 'claude-opus-5-5' },
      cases: [
        {
          name: 'push-guard',
          arms: {
            with: [
              { passed: false, costUsd: 0.1, durationSeconds: 10, graders: [grader('git-worked', false), grader('used-reviewer', false, false)] },
              { passed: false, costUsd: 0.1, durationSeconds: 10, graders: [grader('remote-stays', false), grader('git-worked', false)] },
              { passed: false, costUsd: 0.1, durationSeconds: 10, skippedPaidGraders: true, graders: [grader('shows-the-commit', false)] },
            ],
          },
        },
      ],
    }),
  );
  assert.equal(run(dir, '1.3.0', file).status, 0);
  const rows = readFileSync(join(dir, 'evals', 'history.tsv'), 'utf8').replace(/\n$/, '').split('\n');
  assert.equal(rows[0], HEADER);
  assert.deepEqual(rows.slice(1), [
    row('1.2.0', 'kept', 'opus-5-5', 'with', 1, 1),
    ['1.3.0', 'push-guard', 'opus-5-5', 'with', 0, 2, '0.30', '30', 'git-worked,remote-stays'].join('\t'),
  ]);
});

test('a release that is not a version is refused', () => {
  const result = run(pluginWith({}), 'v1.3.0', 'run.json');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must be a version/);
});
