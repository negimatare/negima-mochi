// The verification commands of a package, as setup-project writes them: the
// first fenced `bash` block under `## Verification` in the nearest CLAUDE.md.
// Only the nearest file counts. One without a block gives no commands, as it
// may override an ancestor that describes another stack. mochi-react and
// mochi-python keep the same copy of this file.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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
