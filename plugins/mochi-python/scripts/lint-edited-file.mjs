// PostToolUse: run the project's own Ruff with --fix on the Python file Claude
// just wrote, so import order and fixable rules settle at once and the rest
// surface while the change is fresh.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { findTool, isFastApiProject, nearestProjectDir, virtualenvBins } from './stack.mjs';

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
if (result.error || result.status === 0) process.exit(0);
if (result.status !== 1) note('Ruff', file, result);

process.stderr.write(`Ruff still reports problems in ${file} after --fix:\n${result.stdout}${result.stderr}`);
process.exit(2);
