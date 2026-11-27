// PostToolUse: run the project's own ESLint with --fix on the file Claude just
// wrote, so property order is fixed and boundary violations surface at once.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isReactFluentPackage, nearestPackageDir } from './stack.mjs';

// A linter that exits 1 left problems: block, so Claude fixes them. One that
// crashes (a broken config, exit 2) gets a note for Claude that does not
// block; one that cannot start stays silent.
// The cause comes after the linter's own first line ("Oops! Something went
// wrong!", "ruff failed"), so the note keeps the last lines.
const note = (linter, file, result) => {
  const lines = `${result.stdout}\n${result.stderr}`.split('\n').map((line) => line.trim()).filter(Boolean);
  const first = lines.length ? lines.slice(-5).join(' / ').slice(0, 400) : `exit ${result.status}`;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `${linter} could not run on ${file}: ${first.trim()}` },
    }),
  );
  process.exit(0);
};

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;
if (!file || !/\.(c|m)?(j|t)sx?$/.test(file)) process.exit(0);
if (!isReactFluentPackage(nearestPackageDir(dirname(file)))) process.exit(0);

const configNames = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map((extension) => `eslint.config.${extension}`);
let dir = dirname(file);
while (!configNames.some((name) => existsSync(join(dir, name)))) {
  const parent = dirname(dir);
  if (parent === dir) process.exit(0);
  dir = parent;
}

const eslint = join(dir, 'node_modules', '.bin', 'eslint');
if (!existsSync(eslint)) process.exit(0);

const result = spawnSync(eslint, ['--fix', '--no-warn-ignored', file], { cwd: dir, encoding: 'utf8' });
if (result.error || result.status === 0) process.exit(0);
if (result.status !== 1) note('ESLint', file, result);

process.stderr.write(`ESLint still reports problems in ${file} after --fix:\n${result.stdout}${result.stderr}`);
process.exit(2);
