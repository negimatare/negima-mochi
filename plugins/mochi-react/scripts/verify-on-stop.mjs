// Stop: before Claude ends a turn with uncommitted TypeScript changes, run the
// typecheck and test scripts of every React + Fluent package those changes touch.
// A change to a package.json counts, and so does a deleted or renamed file.
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { isReactFluentPackage } from './stack.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));

// Claude Code cancels the hook at its 600 s timeout and drops its output, so
// the checks share a shorter deadline and report a check that runs past it.
const DEADLINE_SECONDS = Number(process.env.MOCHI_VERIFY_DEADLINE_SECONDS) || 540;
const deadline = Date.now() + DEADLINE_SECONDS * 1000;

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
  const status = entry.slice(0, 2);
  if (/[RC]/.test(status)) k += 1;
  const path = join(root, entry.slice(3));
  if (/\.(c|m)?(j|t)sx?$/.test(path) || basename(path) === 'package.json') changed.push(path);
}
if (changed.length === 0) process.exit(0);

// Only re-run when the changed files differ from the last run, so a failure
// is reported once instead of blocking every turn.
const fingerprint = changed
  .map((path) => `${path}:${existsSync(path) ? statSync(path).mtimeMs : 'deleted'}`)
  .sort()
  .join('|');
const stateFile = join(tmpdir(), `negima-verify-${input.session_id}.txt`);
if (existsSync(stateFile) && readFileSync(stateFile, 'utf8') === fingerprint) process.exit(0);

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

// Runs one check into a file, not a pipe: a child process that the check
// leaves behind could hold a pipe open after the deadline.
let runs = 0;
const check = (label, command, args, dir) => {
  const left = deadline - Date.now();
  if (left < 1000) return `\`${label}\` not run: no time left before the deadline (${dir}).`;
  const log = join(tmpdir(), `negima-verify-output-${process.pid}-${(runs += 1)}.txt`);
  const fd = openSync(log, 'w');
  const result = spawnSync(command, args, { cwd: dir, stdio: ['ignore', fd, fd], timeout: left, killSignal: 'SIGKILL' });
  closeSync(fd);
  const output = readFileSync(log, 'utf8').split('\n').slice(-60).join('\n');
  rmSync(log, { force: true });
  if (result.error?.code === 'ETIMEDOUT') return `\`${label}\` did not finish in ${DEADLINE_SECONDS} s in ${dir}.`;
  if (result.error) return `Could not run \`${command} ${args.join(' ')}\` in ${dir}: ${result.error.message}`;
  if (result.status !== 0) return `\`${label}\` failed in ${dir}:\n${output}`;
  return undefined;
};

const failures = [];
for (const dir of packages) {
  const scripts = scriptsOf(dir);
  const command = runner(dir);
  for (const script of ['typecheck', 'test'].filter((name) => scripts[name])) {
    const failure = check(script, command, ['run', script], dir);
    if (failure) failures.push(failure);
  }
}
writeFileSync(stateFile, fingerprint);
if (failures.length === 0) process.exit(0);

process.stderr.write(`Verification failed. Fix these before finishing:\n\n${failures.join('\n\n')}`);
process.exit(2);
