// Stop: before Claude ends a turn with uncommitted TypeScript changes, run the
// typecheck and test scripts of every React + Fluent package those changes touch.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { isReactFluentPackage } from './stack.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));

const git = (args) => spawnSync('git', args, { cwd: input.cwd, encoding: 'utf8' });
const root = git(['rev-parse', '--show-toplevel']).stdout?.trim();
if (!root) process.exit(0);

const changed = git(['status', '--porcelain', '-z', '--untracked-files=all'])
  .stdout.split('\0')
  .filter(Boolean)
  .map((entry) => entry.slice(3))
  .filter((path) => /\.(c|m)?(j|t)sx?$/.test(path))
  .map((path) => join(root, path))
  .filter((path) => existsSync(path));
if (changed.length === 0) process.exit(0);

// Only re-run when the changed files differ from the last run, so an unfixable
// failure is reported once instead of blocking every turn.
const fingerprint = changed.map((path) => `${path}:${statSync(path).mtimeMs}`).sort().join('|');
const stateFile = join(tmpdir(), `negima-verify-${input.session_id}.txt`);
if (existsSync(stateFile) && readFileSync(stateFile, 'utf8') === fingerprint) process.exit(0);
writeFileSync(stateFile, fingerprint);

const scriptsOf = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts ?? {};
const packages = new Set();
for (const path of changed) {
  let dir = dirname(path);
  while (dir.startsWith(root)) {
    if (existsSync(join(dir, 'package.json'))) {
      const scripts = scriptsOf(dir);
      if ((scripts.typecheck || scripts.test) && isReactFluentPackage(dir)) packages.add(dir);
      break;
    }
    dir = dirname(dir);
  }
}

const lockfiles = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
];

// Workspaces keep the lockfile and the packageManager field at their root, so
// search from the package up to the repository root, nearest declaration first.
const runner = (dir) => {
  for (let current = dir; ; current = dirname(current)) {
    const manifest = join(current, 'package.json');
    const declared = existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).packageManager;
    if (declared) return declared.split('@')[0];
    const lockfile = lockfiles.find(([name]) => existsSync(join(current, name)));
    if (lockfile) return lockfile[1];
    if (current === root || dirname(current) === current) return 'npm';
  }
};

const failures = [];
for (const dir of packages) {
  const scripts = scriptsOf(dir);
  const command = runner(dir);
  for (const script of ['typecheck', 'test'].filter((name) => scripts[name])) {
    const result = spawnSync(command, ['run', script], { cwd: dir, encoding: 'utf8' });
    if (result.error) {
      failures.push(`Could not run \`${command} run ${script}\` in ${dir}: ${result.error.message}`);
    } else if (result.status !== 0) {
      const output = `${result.stdout}${result.stderr}`.split('\n').slice(-60).join('\n');
      failures.push(`\`${script}\` failed in ${dir}:\n${output}`);
    }
  }
}
if (failures.length === 0) process.exit(0);

process.stderr.write(`Verification failed. Fix these before finishing:\n\n${failures.join('\n\n')}`);
process.exit(2);
