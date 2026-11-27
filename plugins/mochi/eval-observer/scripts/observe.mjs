// Stop hook of the eval observer: writes the end state of an eval case to
// .eval/end-state.txt, one fact per line, so that regex graders can read
// what the run did and not what it said. Graders read it with
// `target: {source: file, path: .eval/end-state.txt}` and flag `m`.
//
//   local <branch> <subject>         a commit that the run made, oldest first
//   origin <branch> <subject>        the same, in .remote/origin.git
//   file <branch> <subject> <path>   a file that the commit adds or changes
//   status <porcelain line>          an uncommitted change
//   tree <hash>                      the working tree without .plans/ and .reviews/
//   tested yes|no                    a full passing npm test ran on this tree
//
// It also copies each file in .plans/ and .reviews/ to
// .eval/working-files.txt, after a line `=== <path>`: a grader can then read
// a plan part or an audit whose file name the run chooses.
//
// It runs git only, never the tests or other code that the run wrote. The
// git settings that can start a command (fsmonitor, hooks, attributes) are
// off, and a repository whose config sets a filter is not read. When it
// cannot read the state, it removes end-state.txt, so that each grader of
// the dump fails, and writes the reason to .eval/observer-error.txt. It
// always exits 0 and prints nothing: a Stop hook that fails or prints can
// change the run.
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const SAFE = ['-c', 'core.fsmonitor=false', '-c', 'core.hooksPath=/dev/null', `--attr-source=${EMPTY_TREE}`];

const observe = (root) => {
  const evalDir = join(root, '.eval');
  const git = (args, options = {}) =>
    execFileSync('git', [...SAFE, ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).replace(/\n$/, '');
  const filters = (() => {
    try {
      return git(['config', '--get-regexp', '^filter\\.']);
    } catch {
      return '';
    }
  })();
  if (filters || existsSync(join(root, '.git/info/attributes'))) throw new Error('the repository sets a git filter or info/attributes');

  const lines = [];
  // The commits of every ref at the end of the fixture, in the clone and in
  // the remote: a commit that none of them reaches is the run's.
  const tipsOf = (file) => (existsSync(join(evalDir, file)) ? readFileSync(join(evalDir, file), 'utf8').split('\n').filter(Boolean) : undefined);
  const remote = join(root, '.remote/origin.git');
  const commits = (prefix, tips, gitDir) => {
    const repo = gitDir ? ['--git-dir', gitDir] : [];
    const branches = git([...repo, 'for-each-ref', '--format=%(refname:lstrip=2)', 'refs/heads']).split('\n').filter(Boolean);
    for (const branch of branches) {
      const log = git([...repo, 'log', '--reverse', '--format=%H %s', `refs/heads/${branch}`, '--not', ...tips]).split('\n').filter(Boolean);
      for (const entry of log) {
        const [sha, subject] = [entry.slice(0, 40), entry.slice(41)];
        lines.push(`${prefix} ${branch} ${subject}`);
        if (prefix === 'local')
          for (const path of git([...repo, 'diff-tree', '--no-commit-id', '--name-only', '--diff-filter=d', '-r', '--root', sha]).split('\n').filter(Boolean))
            lines.push(`file ${branch} ${subject} ${path}`);
      }
    }
  };
  if (tipsOf('fixture-refs')) commits('local', tipsOf('fixture-refs'));
  if (tipsOf('fixture-origin-refs') && existsSync(remote)) commits('origin', tipsOf('fixture-origin-refs'), remote);
  for (const line of git(['status', '--porcelain', '--untracked-files=all']).split('\n').filter(Boolean)) lines.push(`status ${line}`);
  const index = join(evalDir, 'observer.index');
  rmSync(index, { force: true });
  const env = { ...process.env, GIT_INDEX_FILE: index };
  git(['add', '-A'], { env });
  git(['rm', '-r', '-q', '--cached', '--ignore-unmatch', '.plans', '.reviews'], { env });
  const tree = git(['write-tree'], { env });
  rmSync(index, { force: true });
  lines.push(`tree ${tree}`);
  const trees = join(evalDir, 'test-trees.log');
  const passed = existsSync(trees) && readFileSync(trees, 'utf8').split('\n').includes(`pass ${tree}`);
  lines.push(`tested ${passed ? 'yes' : 'no'}`);
  return lines;
};

const workingFiles = (root) =>
  ['.plans', '.reviews']
    .filter((dir) => existsSync(join(root, dir)))
    .flatMap((dir) => readdirSync(join(root, dir), { recursive: true }).map((name) => `${dir}/${name}`))
    .filter((path) => path.endsWith('.md') && lstatSync(join(root, path)).isFile())
    .sort()
    .map((path) => `=== ${path}\n${readFileSync(join(root, path), 'utf8')}`)
    .join('\n');

try {
  const { cwd } = JSON.parse(readFileSync(0, 'utf8'));
  const start = process.env.CLAUDE_PROJECT_DIR || cwd;
  const root = execFileSync('git', [...SAFE, 'rev-parse', '--show-toplevel'], { cwd: start, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const evalDir = join(root, '.eval');
  // Only a repository that an eval fixture built has .eval/.
  if (existsSync(evalDir)) {
    const endState = join(evalDir, 'end-state.txt');
    const errorFile = join(evalDir, 'observer-error.txt');
    rmSync(endState, { force: true });
    rmSync(errorFile, { force: true });
    try {
      const lines = observe(root);
      writeFileSync(join(evalDir, 'working-files.txt'), workingFiles(root));
      writeFileSync(endState, `${lines.join('\n')}\n`);
    } catch (error) {
      writeFileSync(errorFile, `${String(error.stderr || error.message).split('\n')[0]}\n`);
    }
  }
} catch {
  // Not an eval repository, or no usable hook input: nothing to observe.
}
process.exit(0);
