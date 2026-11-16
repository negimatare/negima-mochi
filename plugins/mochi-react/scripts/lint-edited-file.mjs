// PostToolUse: run the project's own ESLint with --fix on the file Claude just
// wrote, so property order is fixed and boundary violations surface at once.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isReactFluentPackage, nearestPackageDir } from './stack.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;
if (!file || !/\.(c|m)?(j|t)sx?$/.test(file)) process.exit(0);
if (!isReactFluentPackage(nearestPackageDir(dirname(file)))) process.exit(0);

const configNames = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts'];
let dir = dirname(file);
while (!configNames.some((name) => existsSync(join(dir, name)))) {
  const parent = dirname(dir);
  if (parent === dir) process.exit(0);
  dir = parent;
}

const eslint = join(dir, 'node_modules', '.bin', 'eslint');
if (!existsSync(eslint)) process.exit(0);

const result = spawnSync(eslint, ['--fix', '--no-warn-ignored', file], { cwd: dir, encoding: 'utf8' });
if (result.status === 0) process.exit(0);

process.stderr.write(`ESLint still reports problems in ${file} after --fix:\n${result.stdout}${result.stderr}`);
process.exit(2);
