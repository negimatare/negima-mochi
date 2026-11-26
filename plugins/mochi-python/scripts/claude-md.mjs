// The verification commands of a package, and how the Stop hooks run them.
// setup-project writes them as the first fenced `bash` block under
// `## Verification` in the package's CLAUDE.md.
// Only the nearest file counts. One without a block gives no commands, as it
// may override an ancestor that describes another stack. mochi-react and
// mochi-python keep the same copy of this file.
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Runs each command of the block in `dir` and returns one failure text for
// each command that fails, does not finish, or gets no time, as the hooks'
// own checks report them. Each command is `sh -c` in its own process group,
// stopped as a group at the deadline: `sh` does not pass SIGTERM on to the
// children of a compound line. `uv run` must not sync or install first, as
// the hooks never install, so `UV_NO_SYNC` is set.
export async function runVerificationCommands({ dir, commands }, deadline) {
  const failures = [];
  for (const command of commands) {
    const left = deadline - Date.now();
    if (left < 1000) {
      failures.push(`\`${command}\` not run: no time left before the deadline (${dir}).`);
      continue;
    }
    const logDir = mkdtempSync(join(tmpdir(), 'negima-verify-'));
    const log = join(logDir, 'output.txt');
    const fd = openSync(log, 'wx');
    const child = spawn('/bin/sh', ['-c', command], {
      cwd: dir,
      detached: true,
      env: { ...process.env, UV_NO_SYNC: '1' },
      stdio: ['ignore', fd, fd],
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {}
    }, left);
    const result = await new Promise((done) => {
      child.on('error', (error) => done({ error }));
      child.on('exit', (status) => done({ status }));
    });
    clearTimeout(timer);
    closeSync(fd);
    const output = readFileSync(log, 'utf8').split('\n').slice(-60).join('\n');
    rmSync(logDir, { recursive: true, force: true });
    if (timedOut) failures.push(`\`${command}\` did not finish in ${Math.round(left / 1000)} s in ${dir}:\n${output}`);
    else if (result.error) failures.push(`Could not run \`${command}\` in ${dir}: ${result.error.message}`);
    else if (result.status !== 0) failures.push(`\`${command}\` failed in ${dir}:\n${output}`);
  }
  return failures;
}

// Each command of the block, from the folder of its CLAUDE.md, or undefined.
// The search goes from `fromDir` up to `root`, both included.
export function verificationCommands(fromDir, root) {
  for (let dir = fromDir; dir.startsWith(root); dir = dirname(dir)) {
    const file = join(dir, 'CLAUDE.md');
    if (existsSync(file)) {
      const commands = commandsOf(readFileSync(file, 'utf8'));
      return commands.length ? { dir, commands } : undefined;
    }
    if (dirname(dir) === dir) break;
  }
  return undefined;
}

// The lines of the first `bash` block in the Verification section. A `#` line
// inside a fence is a shell comment, not a heading that ends the section.
function blockOf(text) {
  let inSection = false;
  let fence;
  for (const line of text.split('\n')) {
    if (fence !== undefined) {
      if (/^```\s*$/.test(line)) {
        if (inSection && fence.isBash) return fence.lines;
        fence = undefined;
      } else fence.lines.push(line);
    } else if (/^```/.test(line)) fence = { isBash: /^```bash\s*$/.test(line), lines: [] };
    else if (/^#{1,2} /.test(line)) {
      if (inSection) return undefined;
      inSection = /^## Verification\s*$/.test(line);
    }
  }
  return undefined;
}

// A line that ends in `\` goes on with the next line, as in the shell, so it
// stays one command. An empty line and a comment line run nothing.
function commandsOf(text) {
  const block = blockOf(text);
  if (!block) return [];
  const commands = [];
  let pending = '';
  for (const line of block) {
    const command = pending ? `${pending}\n${line}` : line;
    if (/\\$/.test(line)) {
      pending = command;
      continue;
    }
    pending = '';
    if (command.trim() && !command.trim().startsWith('#')) commands.push(command);
  }
  return commands;
}
