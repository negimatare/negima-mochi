// Step 1 of the pr skill: whether a stacked branch must be restacked on its
// base, and which commits a restack push would delete. Run it after
// `git fetch`, on the branch of the pull request.
//
//   node stack-check.mjs <base>
//
// Prints one JSON object:
//   merged       true or false from `gh pr view <base>`; null without gh
//                or a gh login, when only the user can say
//   headRefOid   the last commit of the base's pull request, or null
//   restack      the reasons to restack, in this order:
//                base-merged  the base's pull request is merged
//                base-gone    origin/<base> does not exist (often a merge)
//                base-moved   origin/<base> has commits this branch lacks
//                base-ahead   the local base has commits origin/<base> lacks
//                diverged     this branch and its upstream each have commits
//   lost         when diverged: the upstream commits that this branch has
//                no copy of, as "<hash> <subject>". Another person pushed
//                them, and a restack push would delete them.
// A missing local base is not ahead, and a branch with no upstream has not
// diverged. Any other git failure exits 1 with git's message.
import { execFileSync } from 'node:child_process';

const base = process.argv[2];
if (!base) {
  console.error('Usage: stack-check.mjs <base>');
  process.exit(2);
}

const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (...args) => run('git', args);
const exists = (ref) => {
  try {
    git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
    return true;
  } catch {
    return false;
  }
};
const count = (range) => Number(git('rev-list', '--count', range));

// gh missing, not logged in, or failing for another reason: unknown.
const fromGh = () => {
  try {
    run('gh', ['auth', 'status']);
  } catch {
    return { merged: null, headRefOid: null };
  }
  try {
    const pr = JSON.parse(run('gh', ['pr', 'view', base, '--json', 'state,headRefOid']));
    return { merged: pr.state === 'MERGED', headRefOid: pr.headRefOid ?? null };
  } catch (error) {
    // A base with no pull request is not merged.
    if (/no pull requests? found/i.test(String(error.stderr))) return { merged: false, headRefOid: null };
    return { merged: null, headRefOid: null };
  }
};

try {
  git('rev-parse', '--git-dir');
  const { merged, headRefOid } = fromGh();
  const restack = [];
  if (merged) restack.push('base-merged');
  const remoteBase = `refs/remotes/origin/${base}`;
  if (!exists(remoteBase)) restack.push('base-gone');
  else {
    if (count(`HEAD..${remoteBase}`) > 0) restack.push('base-moved');
    if (exists(`refs/heads/${base}`) && count(`${remoteBase}..refs/heads/${base}`) > 0) restack.push('base-ahead');
  }
  let lost = [];
  if (exists('@{u}')) {
    const [ahead, behind] = git('rev-list', '--left-right', '--count', 'HEAD...@{u}').split(/\s+/).map(Number);
    if (ahead > 0 && behind > 0) {
      restack.push('diverged');
      lost = git('log', '--cherry-pick', '--right-only', '--no-merges', '--format=%h %s', 'HEAD...@{u}').split('\n').filter(Boolean);
    }
  }
  console.log(JSON.stringify({ merged, headRefOid, restack, lost }));
} catch (error) {
  console.error(String(error.stderr || error.message).trim());
  process.exit(1);
}
