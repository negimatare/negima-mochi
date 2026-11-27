// Step 1 of the review skill: the change to review, its base, and whether
// its branch is behind the remote. It runs `git fetch` first.
//
//   node review-target.mjs [<pr number | pr URL | branch>] [--base <branch>]
//
// Prints one JSON object:
//   kind         pr, branch, or current (no target and no open pull request)
//   pr           {number, baseRefName, headRefName, author}, or null. A
//                branch, or the current branch, with an open pull request
//                is that pull request.
//   gh           false when gh is missing or failed; then pr is null
//   default      the default branch from origin/HEAD, or null when unset
//   base         the ref to diff against: origin/<baseRefName> for a pull
//                request, else the --base branch (origin/<base> when it
//                exists), else origin/<default>; null when none is known
//   head         the branch under review
//   checkedOut   whether head is the checked-out branch
//   own          false only for a pull request that another person wrote,
//                by `gh api user`; true when that call fails
//   fetched      whether `git fetch` worked
//   upstream     head's upstream, or origin/<headRefName> for a pull
//                request; null when there is none
//   behind       commits on upstream that head lacks; null when the fetch
//                failed or there is no upstream
//   ahead        commits on head since its merge base with base, or null
//   uncommitted  `git status --porcelain` lines when head is checked out,
//                else null
// Any other git failure exits 1 with git's message.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
let baseArg = null;
const baseAt = args.indexOf('--base');
if (baseAt !== -1) {
  baseArg = args[baseAt + 1];
  if (!baseArg) {
    console.error('Usage: review-target.mjs [<pr number | pr URL | branch>] [--base <branch>]');
    process.exit(2);
  }
  args.splice(baseAt, 2);
}
const targetArg = args[0] ?? null;

const run = (command, argv, timeout) =>
  execFileSync(command, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout }).replace(/\n$/, '');
const git = (...argv) => run('git', argv);
const attempt = (fn) => {
  try {
    return fn();
  } catch {
    return null;
  }
};
const exists = (ref) => attempt(() => git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`)) !== null;
const count = (range) => Number(git('rev-list', '--count', range));

const isPr = targetArg !== null && /^(\d+|https?:\/\/\S+\/pull\/\d+\/?)$/.test(targetArg);
const FIELDS = 'number,state,baseRefName,headRefName,author';

// { pr, gh }: gh's pull request for the target, when it is open (or the
// target is a pull request). No pull request is an answer; any other gh
// failure is not.
const lookUp = () => {
  try {
    const found = JSON.parse(run('gh', ['pr', 'view', ...(targetArg ? [targetArg] : []), '--json', FIELDS], 30_000));
    if (!isPr && found.state !== 'OPEN') return { pr: null, gh: true };
    const { number, baseRefName, headRefName, author } = found;
    return { pr: { number, baseRefName, headRefName, author: author?.login ?? null }, gh: true };
  } catch (error) {
    if (/no (open )?pull requests? found/i.test(String(error.stderr))) return { pr: null, gh: true };
    return { pr: null, gh: false };
  }
};

try {
  git('rev-parse', '--git-dir');
  const fetched = attempt(() => run('git', ['fetch', '--quiet'], 60_000)) !== null;
  const { pr, gh } = lookUp();
  const kind = pr || isPr ? 'pr' : targetArg ? 'branch' : 'current';
  const current = git('branch', '--show-current') || null;
  const head = pr ? pr.headRefName : isPr ? null : (targetArg ?? current);
  if (kind === 'branch' && !exists(`refs/heads/${head}`) && !exists(`refs/remotes/origin/${head}`)) {
    throw new Error(`no branch ${head}, here or on origin`);
  }

  const originHead = attempt(() => git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD'));
  const defaultBranch = originHead ? originHead.replace(/^origin\//, '') : null;
  const baseName = pr ? pr.baseRefName : (baseArg ?? defaultBranch);
  const base = !baseName ? null : exists(`refs/remotes/origin/${baseName}`) ? `origin/${baseName}` : exists(baseName) ? baseName : null;

  const local = head && exists(`refs/heads/${head}`) ? `refs/heads/${head}` : null;
  const headRef = local ?? (head && exists(`refs/remotes/origin/${head}`) ? `refs/remotes/origin/${head}` : null);
  let upstream = local ? attempt(() => git('rev-parse', '--abbrev-ref', `${head}@{u}`)) : null;
  if (!upstream && pr && local && exists(`refs/remotes/origin/${head}`)) upstream = `origin/${head}`;
  const behind = fetched && upstream ? count(`${local}..${upstream}`) : null;
  const ahead = base && headRef ? count(`${base}..${headRef}`) : null;

  const checkedOut = head !== null && head === current;
  const uncommitted = checkedOut ? git('status', '--porcelain').split('\n').filter(Boolean) : null;

  let own = true;
  if (pr && pr.author) {
    const me = attempt(() => run('gh', ['api', 'user', '--jq', '.login'], 30_000).trim());
    if (me) own = me === pr.author;
  }

  console.log(
    JSON.stringify({ kind, pr, gh, default: defaultBranch, base, head, checkedOut, own, fetched, upstream, behind, ahead, uncommitted }),
  );
} catch (error) {
  console.error(String(error.stderr || error.message).trim());
  process.exit(1);
}
