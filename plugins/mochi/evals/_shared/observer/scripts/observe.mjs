// Stop hook of the eval observer: writes the end state of an eval case to
// .eval/end-state.txt, one fact per line, so that regex graders can read
// what the run did and not what it said. Graders read it with
// `target: {source: file, path: .eval/end-state.txt}` and flag `m`.
//
//   local <branch> <subject>         a commit that the run made, oldest first
//   origin <branch> <subject>        the same, in .remote/origin.git
//   file <branch> <subject> <path>   a file that the commit changes
//   status <porcelain line>          an uncommitted change
//   tree <hash>                      the working tree without .plans/ and .reviews/
//   tested yes|no                    a passing npm test ran on this tree
//   error <message>                  a git command failed
//
// It also copies each file in .plans/ and .reviews/ to
// .eval/working-files.txt, after a line `=== <path>`: a grader can then read
// a plan part or an audit whose file name the run chooses.
//
// It runs only git, never code that the run wrote. It always exits 0 and
// prints nothing: a Stop hook that fails or prints can change the run.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const lines = [];
try {
  const { cwd } = JSON.parse(readFileSync(0, 'utf8'));
  const git = (args, options = {}) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).replace(/\n$/, '');
  const root = git(['rev-parse', '--show-toplevel']);
  const evalDir = join(root, '.eval');
  // Only a repository that an eval fixture built has .eval/.
  if (existsSync(evalDir)) {
    try {
      // The commits of every ref at the end of the fixture, in the clone and
      // in the remote: a commit that none of them reaches is the run's.
      const tipsOf = (file) =>
        existsSync(join(evalDir, file)) ? readFileSync(join(evalDir, file), 'utf8').split('\n').filter(Boolean) : undefined;
      const remote = join(root, '.remote/origin.git');
      const commits = (prefix, tips, gitDir) => {
        const repo = gitDir ? ['--git-dir', gitDir] : [];
        const branches = git([...repo, 'for-each-ref', '--format=%(refname:short)', 'refs/heads']).split('\n').filter(Boolean);
        for (const branch of branches) {
          const log = git([...repo, 'log', '--reverse', '--format=%H %s', `refs/heads/${branch}`, '--not', ...tips]).split('\n').filter(Boolean);
          for (const entry of log) {
            const [sha, subject] = [entry.slice(0, 40), entry.slice(41)];
            lines.push(`${prefix} ${branch} ${subject}`);
            if (prefix === 'local')
              for (const path of git([...repo, 'diff-tree', '--no-commit-id', '--name-only', '-r', '--root', sha]).split('\n').filter(Boolean))
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
    } catch (error) {
      lines.push(`error ${String(error.stderr || error.message).split('\n')[0]}`);
    }
    writeFileSync(join(evalDir, 'end-state.txt'), `${lines.join('\n')}\n`);
    const working = ['.plans', '.reviews']
      .filter((dir) => existsSync(join(root, dir)))
      .flatMap((dir) => readdirSync(join(root, dir), { recursive: true }).map((name) => `${dir}/${name}`))
      .filter((path) => path.endsWith('.md'))
      .sort()
      .map((path) => `=== ${path}\n${readFileSync(join(root, path), 'utf8')}`);
    writeFileSync(join(evalDir, 'working-files.txt'), working.join('\n'));
  }
} catch {
  // Not an eval repository, or no usable hook input: nothing to observe.
}
process.exit(0);
