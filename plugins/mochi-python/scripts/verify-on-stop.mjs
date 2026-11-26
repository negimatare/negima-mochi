// Stop: before Claude ends a turn with uncommitted Python changes, run the type
// checker, the import contracts, and the tests of every FastAPI project those
// changes touch, with the tools each project installed. A change to the
// project's config counts, and so does a deleted or renamed file.
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { findTool, isFastApiProject, nearestProjectDir, tomlTables, virtualenvBins } from './stack.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));

// Claude Code cancels the hook at its 600 s timeout and drops its output, so
// the checks share a shorter deadline and report a check that runs past it.
const DEADLINE_SECONDS = Number(process.env.MOCHI_VERIFY_DEADLINE_SECONDS) || 540;
const deadline = Date.now() + DEADLINE_SECONDS * 1000;
const CONFIG_FILES = ['pyproject.toml', 'mypy.ini', '.mypy.ini', 'pyrightconfig.json', '.importlinter'];

const git = (args) => spawnSync('git', args, { cwd: input.cwd, encoding: 'utf8' });
const root = git(['rev-parse', '--show-toplevel']).stdout?.trim();
if (!root) process.exit(0);

// `git status --porcelain -z` gives "XY path" for each entry, and after a
// rename or a copy (R, C) one more entry with the original path.
const entries = git(['status', '--porcelain', '-z', '--untracked-files=all']).stdout.split('\0');
const changed = [];
for (let k = 0; k < entries.length; k += 1) {
  const entry = entries[k];
  if (!entry) continue;
  if (/[RC]/.test(entry.slice(0, 2))) k += 1;
  const path = join(root, entry.slice(3));
  if (/\.pyi?$/.test(path) || CONFIG_FILES.includes(basename(path))) changed.push(path);
}
if (changed.length === 0) process.exit(0);

// Only re-run when the changed files differ from the last run, so a failure
// is reported once instead of blocking every turn.
const fingerprint = changed
  .map((path) => `${path}:${existsSync(path) ? statSync(path).mtimeMs : 'deleted'}`)
  .sort()
  .join('|');
const stateFile = join(tmpdir(), `negima-python-verify-${input.session_id}.txt`);
if (existsSync(stateFile) && readFileSync(stateFile, 'utf8') === fingerprint) process.exit(0);

const projects = new Map();
for (const path of changed) {
  const dir = nearestProjectDir(dirname(path));
  if (!dir || !dir.startsWith(root) || !isFastApiProject(dir)) continue;
  projects.set(dir, [...(projects.get(dir) ?? []), path]);
}

const configured = (dir, table, files) =>
  files.some((name) => existsSync(join(dir, name))) ||
  tomlTables(readFileSync(join(dir, 'pyproject.toml'), 'utf8')).has(table);

// The project's config picks the type checker; with none, whichever is installed.
// mypy needs targets unless its config lists `files`, so it gets the changed
// Python files that still exist; with none, it is skipped.
const typecheck = (dir, bins, files) => {
  const pyright = findTool(bins, 'basedpyright') ?? findTool(bins, 'pyright');
  const mypy = findTool(bins, 'mypy');
  const usesPyright = configured(dir, 'tool.pyright', ['pyrightconfig.json']) || configured(dir, 'tool.basedpyright', []);
  const usesMypy = configured(dir, 'tool.mypy', ['mypy.ini', '.mypy.ini']);
  if (pyright && (usesPyright || !usesMypy)) return [pyright, []];
  if (!mypy) return undefined;
  const mypyFiles = /^files\s*=/m.test(tomlTables(readFileSync(join(dir, 'pyproject.toml'), 'utf8')).get('tool.mypy') ?? '');
  if (mypyFiles) return [mypy, []];
  const targets = files.filter((path) => /\.pyi?$/.test(path) && existsSync(path));
  return targets.length ? [mypy, targets.map((path) => relative(dir, path))] : undefined;
};

// Runs one check into a file, not a pipe: a child process that the check
// leaves behind could hold a pipe open after the deadline.
let runs = 0;
const run = (tool, args, dir) => {
  const left = deadline - Date.now();
  if (left < 1000) return { skipped: true };
  const log = join(tmpdir(), `negima-python-verify-output-${process.pid}-${(runs += 1)}.txt`);
  const fd = openSync(log, 'w');
  const result = spawnSync(tool, args, { cwd: dir, stdio: ['ignore', fd, fd], timeout: left, killSignal: 'SIGKILL' });
  closeSync(fd);
  const output = readFileSync(log, 'utf8');
  rmSync(log, { force: true });
  return { ...result, output };
};

const NO_TESTS_COLLECTED = 5;
const failures = [];
for (const [dir, files] of projects) {
  const bins = virtualenvBins(dir);
  const importLinter = findTool(bins, 'lint-imports');
  const pytest = findTool(bins, 'pytest');
  const checks = [
    typecheck(dir, bins, files),
    importLinter && configured(dir, 'tool.importlinter', ['.importlinter']) ? [importLinter, []] : undefined,
    pytest ? [pytest, ['-q', '-x']] : undefined,
  ].filter(Boolean);
  for (const [tool, args] of checks) {
    const command = [basename(tool), ...args].join(' ');
    const result = run(tool, args, dir);
    if (result.skipped) failures.push(`\`${command}\` not run: no time left before the deadline (${dir}).`);
    else if (result.error?.code === 'ETIMEDOUT') failures.push(`\`${command}\` did not finish in ${DEADLINE_SECONDS} s in ${dir}.`);
    else if (result.error) failures.push(`Could not run \`${command}\` in ${dir}: ${result.error.message}`);
    else if (result.status !== 0 && !(tool === pytest && result.status === NO_TESTS_COLLECTED)) {
      const output = result.output.split('\n').slice(-60).join('\n');
      failures.push(`\`${command}\` failed in ${dir}:\n${output}`);
    }
  }
}
writeFileSync(stateFile, fingerprint);
if (failures.length === 0) process.exit(0);

process.stderr.write(`Verification failed. Fix these before finishing:\n\n${failures.join('\n\n')}`);
process.exit(2);
