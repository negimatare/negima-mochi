// Keeps the eval results of each release in <plugin>/evals/history.tsv, as
// the run JSONs are git-ignored.
//
//   node scripts/eval-history.mjs <plugin dir> <release> <run.json>...
//     Adds one row for each case, model and arm of the runs, and replaces
//     the rows that the file already has for that release.
//   node scripts/eval-history.mjs <plugin dir> --demote
//     Lists the core cases that passed all their runs on Opus and on
//     Sonnet in each of the last three releases.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const COLUMNS = ['release', 'case', 'model', 'arm', 'passes', 'runs', 'cost_usd', 'seconds'];
const RELEASES_TO_DEMOTE = 3;

const [pluginDir, release, ...runFiles] = process.argv.slice(2);
if (!pluginDir || !release || (release !== '--demote' && !runFiles.length)) {
  console.error('Usage: eval-history.mjs <plugin dir> <release> <run.json>... | <plugin dir> --demote');
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
        return runs.length > 0 && runs.every((row) => row.passes === row.runs);
      }),
    );
  const ready = core.filter(passedEverywhere);
  console.log(`Core cases that passed every run on Opus and Sonnet in ${releases.join(', ')}:`);
  console.log(ready.length ? ready.map((name) => `- ${name}`).join('\n') : '(none)');
  process.exit(0);
}

const totals = new Map();
for (const file of runFiles) {
  const run = JSON.parse(readFileSync(file, 'utf8'));
  const model = modelName(run.suite.modelOverride ?? 'default');
  for (const testCase of run.cases) {
    for (const [arm, runs] of Object.entries(testCase.arms)) {
      const key = [testCase.name, model, arm].join('\t');
      const total = totals.get(key) ?? { passes: 0, runs: 0, cost: 0, seconds: 0 };
      for (const result of runs) {
        total.passes += result.passed ? 1 : 0;
        total.runs += 1;
        total.cost += result.costUsd + (result.judgeCostUsd ?? 0);
        total.seconds += result.durationSeconds;
      }
      totals.set(key, total);
    }
  }
}

const added = [...totals].map(([key, total]) => {
  const [name, model, arm] = key.split('\t');
  const { passes, runs, cost, seconds } = total;
  return { release, case: name, model, arm, passes, runs, cost_usd: cost.toFixed(2), seconds };
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
  [COLUMNS.join('\t'), ...rows.map((row) => COLUMNS.map((column) => row[column]).join('\t'))].join('\n') + '\n',
);
console.log(`${historyFile}: ${added.length} rows for ${release}, ${rows.length} rows in all.`);
