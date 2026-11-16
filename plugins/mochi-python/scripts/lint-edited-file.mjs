// PostToolUse: run the project's own Ruff with --fix on the Python file Claude
// just wrote, so import order and fixable rules settle at once and the rest
// surface while the change is fresh.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { findTool, isFastApiProject, nearestProjectDir, virtualenvBins } from './stack.mjs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;
if (!file || !/\.pyi?$/.test(file)) process.exit(0);
const projectDir = nearestProjectDir(dirname(file));
if (!isFastApiProject(projectDir)) process.exit(0);

const ruff = findTool(virtualenvBins(projectDir), 'ruff');
if (!ruff) process.exit(0);

// --force-exclude keeps the project's exclude list in force for a file named
// on the command line, such as a generated client.
const result = spawnSync(ruff, ['check', '--fix', '--force-exclude', '--output-format', 'concise', file], {
  cwd: projectDir,
  encoding: 'utf8',
});
if (result.status === 0) process.exit(0);

process.stderr.write(`Ruff still reports problems in ${file} after --fix:\n${result.stdout}${result.stderr}`);
process.exit(2);
