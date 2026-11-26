// Step 6 of the pr skill: `gh stack push` can report success and push
// nothing. This names each branch whose tip on origin is not its local tip.
//
//   node pushed.mjs <branch>...
//
// Prints one line for each branch that did not move, and exits 1 when there
// is one. It compares refs/heads/<branch> only, so a tag of the same name
// does not count. A git failure exits 2 with git's message.
import { execFileSync } from 'node:child_process';

const branches = process.argv.slice(2);
if (!branches.length) {
  console.error('Usage: pushed.mjs <branch>...');
  process.exit(2);
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

let stale = 0;
try {
  for (const branch of branches) {
    const local = git('rev-parse', '--verify', `refs/heads/${branch}^{commit}`);
    const remote = git('ls-remote', 'origin', `refs/heads/${branch}`).split(/\s+/)[0] ?? '';
    if (remote === local) continue;
    stale += 1;
    console.log(`${branch}: ${remote ? `origin has ${remote.slice(0, 7)}` : 'origin has no such branch'}, the local branch has ${local.slice(0, 7)}.`);
  }
} catch (error) {
  console.error(String(error.stderr || error.message).trim());
  process.exit(2);
}
process.exit(stale ? 1 : 0);
