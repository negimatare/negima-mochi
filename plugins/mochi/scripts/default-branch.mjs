// The default branch of the mochi skills: where work starts and pull
// requests go. A project names it with one line in its root CLAUDE.md,
//
//   Integration branch: `develop`
//
// and else it is the branch of origin/HEAD.
//
//   node default-branch.mjs
//
// Prints the branch name. Exits 1 with the reason when none is known.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LINE = /^Integration branch: `([^`\s]+)`[ \t]*\r?$/m;

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

// integration: the default branch, or null. protected: each branch that
// nothing pushes to, the integration branch and origin/HEAD's branch.
export const defaultBranches = (cwd) => {
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  const claude = root && join(root, 'CLAUDE.md');
  const named = claude && existsSync(claude) ? (readFileSync(claude, 'utf8').match(LINE)?.[1] ?? null) : null;
  const originHead = git(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, '') || null;
  const integration = named ?? originHead;
  return { integration, protected: [...new Set([integration, originHead].filter(Boolean))] };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { integration } = defaultBranches(process.cwd());
  if (!integration) {
    console.error('No default branch: the root CLAUDE.md has no "Integration branch: `<name>`" line, and origin/HEAD is not set.');
    process.exit(1);
  }
  console.log(integration);
}
