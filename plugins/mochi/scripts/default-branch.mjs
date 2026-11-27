// The default branch of the mochi skills: where work starts and pull
// requests go. A project names it with one line in its root CLAUDE.md,
//
//   Integration branch: `develop`
//
// (also as a list item, or with the label in bold), and else it is the
// branch of origin/HEAD.
//
//   node default-branch.mjs              prints the default branch
//   node default-branch.mjs --protected  prints each branch that nothing
//                                        pushes to, one on each line
//
// Exits 1 with the reason when no branch is known.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LINE = /^(?:[-*][ \t]+)?(?:\*\*)?Integration branch:(?:\*\*)?[ \t]+`([^`\s<>]+)`/m;
// A fenced block, which can quote the line without setting it.
const FENCE = /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm;

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

// integration: the default branch, or null. originHead: the branch of
// origin/HEAD, or null. protected: each branch that nothing pushes to, the
// two above; main and master too when origin/HEAD is not set.
export const defaultBranches = (cwd) => {
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  const claude = root && join(root, 'CLAUDE.md');
  const text = claude && existsSync(claude) ? readFileSync(claude, 'utf8').replace(/\r\n/g, '\n').replace(FENCE, '') : '';
  const named = text.match(LINE)?.[1] ?? null;
  const originHead = git(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, '') || null;
  const integration = named ?? originHead;
  const guarded = [integration, ...(originHead ? [originHead] : ['main', 'master'])];
  return { integration, originHead, protected: [...new Set(guarded.filter(Boolean))] };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const branches = defaultBranches(process.cwd());
  if (!branches.integration) {
    console.error(
      'No default branch: the root CLAUDE.md has no "Integration branch: `<name>`" line, and origin/HEAD is not set (git remote set-head origin --auto sets it).',
    );
    process.exit(1);
  }
  console.log(process.argv.includes('--protected') ? branches.protected.join('\n') : branches.integration);
}
