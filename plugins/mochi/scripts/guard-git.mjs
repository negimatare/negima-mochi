// PreToolUse on Bash: turn a git command that breaks a rule of the mochi
// commit and pr skills into a permission prompt that names the rule. The
// rules: no push to the default branch, no force push without the lease, no
// staging or committing of everything, no skipping of the git hooks. The
// command is read as a shell reads it, so the words of a commit message, a
// quoted string or a heredoc are not commands.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Splits a command line into commands, each a list of words. Quotes, $(...),
// backticks and heredoc bodies stay inside their word; newline, ;, &, &&, |,
// ||, ( and ) end a command.
export const commandsOf = (text) => {
  const commands = [];
  let words = [];
  let word = '';
  let inWord = false;
  const heredocs = [];
  const endWord = () => {
    if (inWord) words.push(word);
    word = '';
    inWord = false;
  };
  const endCommand = () => {
    endWord();
    if (words.length) commands.push(words);
    words = [];
  };
  // Skips a heredoc body that starts at index i; returns the index after it.
  const skipBodies = (i) => {
    while (heredocs.length) {
      const { delimiter, tabs } = heredocs.shift();
      for (;;) {
        const end = text.indexOf('\n', i);
        const line = text.slice(i, end === -1 ? text.length : end);
        i = end === -1 ? text.length : end + 1;
        if ((tabs ? line.replace(/^\t+/, '') : line) === delimiter || end === -1) break;
      }
    }
    return i;
  };
  // Reads the heredoc operator at index i (after <<); returns the index after
  // its delimiter word.
  const readHeredoc = (i) => {
    const tabs = text[i] === '-';
    if (tabs) i += 1;
    while (text[i] === ' ' || text[i] === '\t') i += 1;
    const match = text.slice(i).match(/^(?:'([^']*)'|"([^"]*)"|\\?([^\s;&|<>()]+))/);
    if (!match) return i;
    heredocs.push({ delimiter: match[1] ?? match[2] ?? match[3], tabs });
    return i + match[0].length;
  };
  // Skips a $( ... ) or a backtick span that starts at index i; returns the
  // index after it. Quotes and heredocs inside it are skipped too.
  const skipSubstitution = (i, close) => {
    let depth = 1;
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (c === '\\') i += 2;
      else if (c === "'" && close === ')') i = text.indexOf("'", i + 1) + 1 || text.length;
      else if (c === '"' && close === ')') i = skipDouble(i + 1);
      else if (close === ')' && text.startsWith('$(', i)) {
        depth += 1;
        i += 2;
      } else if (close === ')' && text.startsWith('<<', i) && text[i + 2] !== '<') i = readHeredoc(i + 2);
      else if (c === '\n' && heredocs.length) i = skipBodies(i + 1);
      else if (c === close) {
        depth -= 1;
        i += 1;
      } else i += 1;
    }
    return i;
  };
  // Skips a double-quoted string from just after its opening quote.
  const skipDouble = (i) => {
    while (i < text.length && text[i] !== '"') {
      if (text[i] === '\\') i += 2;
      else if (text.startsWith('$(', i)) i = skipSubstitution(i + 2, ')');
      else if (text[i] === '`') i = skipSubstitution(i + 1, '`');
      else i += 1;
    }
    return i + 1;
  };

  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '\n') {
      endCommand();
      i = skipBodies(i + 1);
    } else if (c === ' ' || c === '\t') {
      endWord();
      i += 1;
    } else if (';&|()'.includes(c)) {
      endCommand();
      i += text[i + 1] === c && (c === '&' || c === '|') ? 2 : 1;
    } else if (text.startsWith('<<', i) && text[i + 2] !== '<') {
      endWord();
      i = readHeredoc(i + 2);
    } else if (c === "'") {
      const end = text.indexOf("'", i + 1);
      word += text.slice(i + 1, end === -1 ? text.length : end);
      inWord = true;
      i = end === -1 ? text.length : end + 1;
    } else if (c === '"') {
      const end = skipDouble(i + 1);
      word += text.slice(i + 1, end - 1);
      inWord = true;
      i = end;
    } else if (text.startsWith('$(', i)) {
      const end = skipSubstitution(i + 2, ')');
      word += text.slice(i, end);
      inWord = true;
      i = end;
    } else if (c === '`') {
      const end = skipSubstitution(i + 1, '`');
      word += text.slice(i, end);
      inWord = true;
      i = end;
    } else if (c === '\\') {
      word += text[i + 1] ?? '';
      inWord = true;
      i += 2;
    } else {
      word += c;
      inWord = true;
      i += 1;
    }
  }
  endCommand();
  return commands;
};

// git's options before the subcommand that take a value as the next word.
const GLOBAL_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);
// Short options of commit that take a value: the rest of the cluster or the next word.
const COMMIT_VALUE = 'mFCct';
const COMMIT_LONG_VALUE = new Set(['--message', '--file', '--reuse-message', '--reedit-message', '--template', '--author', '--date', '--cleanup', '--fixup', '--squash', '--trailer', '--pathspec-from-file']);
const PUSH_LONG_VALUE = new Set(['--repo', '--push-option', '--receive-pack', '--exec']);

const git = (cwd, args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const defaultsIn = (cwd) => {
  const head = git(cwd, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, '');
  return head ? [head] : ['main', 'master'];
};

const pushProblems = (args, cwd) => {
  const problems = [];
  let lease = false;
  let force = false;
  let tags = false;
  const positional = [];
  for (let k = 0; k < args.length; k += 1) {
    const arg = args[k];
    if (arg === '--') {
      positional.push(...args.slice(k + 1));
      break;
    }
    if (arg === '-n' || arg === '--dry-run') return [];
    if (arg === '--no-verify') problems.push('verify');
    else if (arg.startsWith('--force-with-lease')) lease = true;
    else if (arg === '--force' || arg === '--force-if-includes') force ||= arg === '--force';
    else if (arg === '--tags') tags = true;
    else if (arg === '--all' || arg === '--mirror') problems.push('default');
    else if (PUSH_LONG_VALUE.has(arg) || arg === '-o') k += 1;
    else if (/^-[a-zA-Z]+$/.test(arg)) force ||= arg.includes('f');
    else if (!arg.startsWith('-')) positional.push(arg);
  }
  const [, ...specs] = positional;
  if (specs.some((spec) => spec.startsWith('+'))) force = true;
  if (force && !lease) problems.push('force');
  const defaults = defaultsIn(cwd);
  const current = git(cwd, ['branch', '--show-current']);
  const destinations = specs.length
    ? specs.map((spec) => {
        const [src, dst] = spec.replace(/^\+/, '').split(':');
        const target = dst ?? src;
        return (target === 'HEAD' ? current : target).replace(/^refs\/heads\//, '');
      })
    : tags
      ? []
      : [current];
  if (destinations.some((branch) => defaults.includes(branch))) problems.push('default');
  return problems;
};

const addProblems = (args) => {
  if (args.some((arg) => arg === '-n' || arg === '--dry-run')) return [];
  const all = args.some(
    (arg) => ['-A', '--all', '-u', '--update', '.', ':/'].includes(arg) || (/^-[a-zA-Z]+$/.test(arg) && /[Au]/.test(arg)),
  );
  return all ? ['all'] : [];
};

const commitProblems = (args) => {
  const problems = [];
  for (let k = 0; k < args.length; k += 1) {
    const arg = args[k];
    if (arg === '--') break;
    if (arg === '--all') problems.push('all');
    else if (arg === '--no-verify') problems.push('verify');
    else if (COMMIT_LONG_VALUE.has(arg)) k += 1;
    else if (/^-[a-zA-Z]/.test(arg) && !arg.startsWith('--')) {
      for (let at = 1; at < arg.length; at += 1) {
        const flag = arg[at];
        if (COMMIT_VALUE.includes(flag)) {
          if (at === arg.length - 1) k += 1;
          break;
        }
        if (flag === 'a') problems.push('all');
        if (flag === 'n') problems.push('verify');
      }
    }
  }
  return problems;
};

// The problems of one command, given the folder it runs in.
const problemsOf = (words, cwd) => {
  let at = words.findIndex((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word));
  if (words[at] === 'command' || words[at] === 'exec') at += 1;
  if (at < 0 || !/(^|\/)git$/.test(words[at] ?? '')) return [];
  let dir = cwd;
  let k = at + 1;
  while (k < words.length && words[k].startsWith('-')) {
    if (words[k] === '-C') dir = isAbsolute(words[k + 1]) ? words[k + 1] : join(dir, words[k + 1]);
    k += GLOBAL_WITH_VALUE.has(words[k]) ? 2 : 1;
  }
  const [subcommand, ...args] = words.slice(k);
  if (subcommand === 'push') return pushProblems(args, dir);
  if (subcommand === 'add') return addProblems(args);
  if (subcommand === 'commit') return commitProblems(args);
  return [];
};

const REASONS = {
  default:
    'This pushes the default branch. The mochi skills never push it: push a feature branch and open a pull request.',
  force:
    'This is a force push without --force-with-lease, which can delete commits that another person pushed. Use --force-with-lease, as the mochi pr skill does.',
  all: 'This stages or commits every change, which can take in working state (.plans/, .reviews/, scratch files). The mochi commit skill stages by explicit path.',
  verify: 'This skips the git hooks. The mochi commit skill fixes the cause of a failing hook instead.',
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    const command = input.tool_input?.command;
    if (typeof command === 'string') {
      let cwd = input.cwd ?? process.cwd();
      const found = new Set();
      for (const words of commandsOf(command)) {
        if (words[0] === 'cd' && words[1]) cwd = isAbsolute(words[1]) ? words[1] : join(cwd, words[1]);
        for (const problem of problemsOf(words, cwd)) found.add(problem);
      }
      if (found.size)
        process.stdout.write(
          JSON.stringify({
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'ask',
              permissionDecisionReason: [...found].map((problem) => REASONS[problem]).join(' '),
            },
          }),
        );
    }
  } catch {
    // No usable hook input: let the command through.
  }
  process.exit(0);
}
