// Stop: before Claude ends a turn with uncommitted Python changes, run the type
// checker, the import contracts, and the tests of every FastAPI project those
// changes touch, with the tools each project installed.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { findTool, isFastApiProject, nearestProjectDir, tomlTables, virtualenvBins } from './stack.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));

const git = (args) => spawnSync('git', args, { cwd: input.cwd, encoding: 'utf8' });
const root = git(['rev-parse', '--show-toplevel']).stdout?.trim();
if (!root) process.exit(0);

const changed = git(['status', '--porcelain', '-z', '--untracked-files=all'])
  .stdout.split('\0')
  .filter(Boolean)
  .map((entry) => entry.slice(3))
  .filter((path) => /\.pyi?$/.test(path))
  .map((path) => join(root, path))
  .filter((path) => existsSync(path));
if (changed.length === 0) process.exit(0);

// Only re-run when the changed files differ from the last run, so an unfixable
// failure is reported once instead of blocking every turn.
const fingerprint = changed.map((path) => `${path}:${statSync(path).mtimeMs}`).sort().join('|');
const stateFile = join(tmpdir(), `negima-python-verify-${input.session_id}.txt`);
if (existsSync(stateFile) && readFileSync(stateFile, 'utf8') === fingerprint) process.exit(0);
writeFileSync(stateFile, fingerprint);

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
// mypy needs targets unless its config lists `files`, so it gets the changed ones.
const typecheck = (dir, bins, files) => {
  const pyright = findTool(bins, 'basedpyright') ?? findTool(bins, 'pyright');
  const mypy = findTool(bins, 'mypy');
  const usesPyright = configured(dir, 'tool.pyright', ['pyrightconfig.json']) || configured(dir, 'tool.basedpyright', []);
  const usesMypy = configured(dir, 'tool.mypy', ['mypy.ini', '.mypy.ini']);
  if (pyright && (usesPyright || !usesMypy)) return [pyright, []];
  if (!mypy) return undefined;
  const mypyFiles = /^files\s*=/m.test(tomlTables(readFileSync(join(dir, 'pyproject.toml'), 'utf8')).get('tool.mypy') ?? '');
  return [mypy, mypyFiles ? [] : files.map((path) => relative(dir, path))];
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
    const result = spawnSync(tool, args, { cwd: dir, encoding: 'utf8' });
    if (result.error) {
      failures.push(`Could not run \`${command}\` in ${dir}: ${result.error.message}`);
    } else if (result.status !== 0 && !(tool === pytest && result.status === NO_TESTS_COLLECTED)) {
      const output = `${result.stdout}${result.stderr}`.split('\n').slice(-60).join('\n');
      failures.push(`\`${command}\` failed in ${dir}:\n${output}`);
    }
  }
}
if (failures.length === 0) process.exit(0);

process.stderr.write(`Verification failed. Fix these before finishing:\n\n${failures.join('\n\n')}`);
process.exit(2);
