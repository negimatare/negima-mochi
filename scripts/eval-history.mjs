// Keeps the eval results of each release in <plugin>/evals/history.tsv, as
// the run JSONs are git-ignored.
//
//   node scripts/eval-history.mjs <plugin dir> <release> <run.json>...
//     Adds one row for each case, model and arm of the runs, and replaces
//     the rows that the file already has for that release. Give every run
//     JSON of the release. A run that the cost cap cut off before its paid
//     graders adds its cost and time, but no pass and no run. The failed
//     column names each scored grader that failed in a counted run.
//   node scripts/eval-history.mjs <plugin dir> --demote
//     Lists the core cases that passed all their runs on Opus and on
//     Sonnet in each of the last three releases, and whose graders read the
//     same at the tag of the first of them (v<release>) as now. A case
//     whose graders changed is listed apart: its record is of an older test.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';

const COLUMNS = ['release', 'case', 'model', 'arm', 'passes', 'runs', 'cost_usd', 'seconds', 'failed'];
const RELEASES_TO_DEMOTE = 3;

const [pluginDir, release, ...runFiles] = process.argv.slice(2);
if (!pluginDir || !release || (release !== '--demote' && !runFiles.length)) {
  console.error('Usage: eval-history.mjs <plugin dir> <release> <run.json>... | <plugin dir> --demote');
  process.exit(1);
}
if (release !== '--demote' && !/^\d+\.\d+\.\d+$/.test(release)) {
  console.error(`The release must be a version such as 1.3.0, not "${release}".`);
  process.exit(1);
}
const historyFile = join(pluginDir, 'evals', 'history.tsv');

const readHistory = () =>
  existsSync(historyFile)
    ? readFileSync(historyFile, 'utf8')
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => Object.fromEntries(line.split('\t').map((value, i) => [COLUMNS[i], value])))
    : [];

// "global.anthropic.claude-opus-5-5" and "claude-opus-5-5" are both "opus-5-5".
const modelName = (id) => id.replace(/^.*claude-/, '');

const byVersion = (a, b) => {
  const [x, y] = [a, b].map((version) => version.split('.').map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

if (release === '--demote') {
  const rows = readHistory();
  const releases = [...new Set(rows.map((row) => row.release))].sort(byVersion).slice(-RELEASES_TO_DEMOTE);
  if (releases.length < RELEASES_TO_DEMOTE) {
    console.log(`The history has ${releases.length} releases. A demotion needs ${RELEASES_TO_DEMOTE}.`);
    process.exit(0);
  }
  const evalsDir = join(pluginDir, 'evals');
  const core = readdirSync(evalsDir).filter((name) => {
    const prompt = join(evalsDir, name, 'prompt.md');
    return existsSync(prompt) && /^tags: \[.*\bcore\b.*\]$/m.test(readFileSync(prompt, 'utf8'));
  });
  const passedEverywhere = (name) =>
    releases.every((version) =>
      ['opus', 'sonnet'].every((family) => {
        const runs = rows.filter(
          (row) => row.release === version && row.case === name && row.arm === 'with' && row.model.startsWith(family),
        );
        return runs.length > 0 && runs.every((row) => row.runs !== '0' && row.passes === row.runs);
      }),
    );
  const tag = `v${releases[0]}`;
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: pluginDir, encoding: 'utf8' });
    if (result.status !== 0) {
      console.error(`Cannot read the graders at ${tag}: ${(result.stderr || result.error?.message || '').trim()}`);
      process.exit(1);
    }
    return result.stdout;
  };
  // Each grader's text by file name. A link reads as the file it points to,
  // so a grader that became a link to the same text has not changed.
  const gradersAtTag = (name) => {
    const texts = {};
    for (const line of git('ls-tree', '-r', tag, '--', `evals/${name}/graders/`).split('\n').filter(Boolean)) {
      const [, mode, , hash, path] = line.match(/^(\d+) (\w+) (\w+)\t(.*)$/);
      const target = mode === '120000' ? posix.join(posix.dirname(path), git('cat-file', 'blob', hash)) : undefined;
      texts[posix.basename(path)] = target ? git('show', `${tag}:./${target}`) : git('cat-file', 'blob', hash);
    }
    return texts;
  };
  const gradersNow = (name) => {
    const dir = join(evalsDir, name, 'graders');
    // A dotfile, such as Finder's .DS_Store, is no grader.
    const files = existsSync(dir) ? readdirSync(dir).filter((file) => !file.startsWith('.')) : [];
    return Object.fromEntries(files.map((file) => [file, readFileSync(join(dir, file), 'utf8')]));
  };
  const sameGraders = (name) => {
    const [before, now] = [gradersAtTag(name), gradersNow(name)];
    const files = new Set([...Object.keys(before), ...Object.keys(now)]);
    return [...files].every((file) => before[file] === now[file]);
  };
  const passed = core.filter(passedEverywhere);
  const ready = passed.filter(sameGraders);
  const changed = passed.filter((name) => !ready.includes(name));
  console.log(`Core cases that passed every run on Opus and Sonnet in ${releases.join(', ')}:`);
  console.log(ready.length ? ready.map((name) => `- ${name}`).join('\n') : '(none)');
  if (changed.length) {
    console.log(`\nThese passed too, but their graders changed since ${tag}, so they keep core:`);
    console.log(changed.map((name) => `* ${name}`).join('\n'));
  }
  process.exit(0);
}

const totals = new Map();
for (const file of runFiles) {
  const run = JSON.parse(readFileSync(file, 'utf8'));
  const model = modelName(run.suite.modelOverride ?? 'default');
  for (const testCase of run.cases) {
    for (const [arm, runs] of Object.entries(testCase.arms)) {
      const key = [testCase.name, model, arm].join('\t');
      const total = totals.get(key) ?? { passes: 0, runs: 0, cost: 0, seconds: 0, failed: new Set() };
      for (const result of runs) {
        total.cost += result.costUsd + (result.judgeCostUsd ?? 0);
        total.seconds += result.durationSeconds;
        if (result.skippedPaidGraders) continue;
        total.passes += result.passed ? 1 : 0;
        total.runs += 1;
        for (const grader of result.graders ?? []) if (grader.scored !== false && !grader.passed) total.failed.add(grader.name);
      }
      totals.set(key, total);
    }
  }
}

const added = [...totals].map(([key, total]) => {
  const [name, model, arm] = key.split('\t');
  const { passes, runs, cost, seconds, failed } = total;
  return { release, case: name, model, arm, passes, runs, cost_usd: cost.toFixed(2), seconds, failed: [...failed].sort().join(',') };
});
const kept = readHistory().filter((row) => row.release !== release);
const rows = [...kept, ...added].sort(
  (a, b) =>
    byVersion(a.release, b.release) ||
    a.case.localeCompare(b.case) ||
    a.model.localeCompare(b.model) ||
    a.arm.localeCompare(b.arm),
);
writeFileSync(
  historyFile,
  [COLUMNS.join('\t'), ...rows.map((row) => COLUMNS.map((column) => row[column] ?? '').join('\t'))].join('\n') + '\n',
);
console.log(`${historyFile}: ${added.length} rows for ${release}, ${rows.length} rows in all.`);
