// The hook scripts of mochi-react and mochi-python, run as Claude Code runs
// them, on temp packages with fake tools.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENV, sh, tempDir } from './eval-fixture.mjs';

const PLUGINS = fileURLToPath(new URL('../plugins/', import.meta.url));
// The hooks keep their state in the temp folder: one of its own for each run
// of this file, so that runs in parallel do not share a fingerprint.
const TMP = tempDir('stack-tmp-');
let sessions = 0;
const session = () => `s${process.pid}-${(sessions += 1)}`;

const write = (path, text, mode) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  if (mode) chmodSync(path, mode);
};
// The hooks' own settings, and UV_NO_SYNC, come from each test, not from the
// shell that runs the tests.
const hookEnv = (env = {}) => ({
  ...Object.fromEntries(Object.entries(ENV).filter(([name]) => !/^(MOCHI_VERIFY_|UV_NO_SYNC$)/.test(name))),
  TMPDIR: TMP,
  ...env,
});
const hook = (plugin, script, input, env = {}) => {
  const result = spawnSync(process.execPath, [join(PLUGINS, plugin, 'scripts', script)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: hookEnv(env),
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};
const stop = (plugin, cwd, session, env) => hook(plugin, 'verify-on-stop.mjs', { hook_event_name: 'Stop', session_id: session, cwd }, env);
const commitAll = (dir) => sh(dir, 'git add -A && git -c user.name=shop -c user.email=shop@example.invalid commit -q -m base');

// A repository with a React + Fluent package in packages/web, beside a
// package that is not React. Its test script logs each run to runs.log.
const reactRepo = (test = 'echo ran >> runs.log', typecheck) => {
  const dir = tempDir('stack-react-');
  sh(dir, 'git init -q -b main');
  write(join(dir, 'package.json'), JSON.stringify({ name: 'root', private: true }));
  write(join(dir, 'packages/api/package.json'), JSON.stringify({ name: 'api', scripts: { test: 'echo api >> runs.log' } }));
  write(
    join(dir, 'packages/web/package.json'),
    JSON.stringify({ name: 'web', dependencies: { react: '19', '@fluentui/react-components': '9' }, scripts: { ...(typecheck && { typecheck }), test } }),
  );
  write(join(dir, 'packages/web/src/a.ts'), 'export const a = 1;\n');
  write(join(dir, 'packages/web/src/c.ts'), 'export const c = 1;\n');
  commitAll(dir);
  return dir;
};
const runs = (dir, pkg = 'packages/web') => (existsSync(join(dir, pkg, 'runs.log')) ? readFileSync(join(dir, pkg, 'runs.log'), 'utf8').trim().split('\n').length : 0);

test('react: a turn that only deletes a file, or moves it out of its package, runs the checks of that package', () => {
  const dir = reactRepo();
  sh(dir, 'rm packages/web/src/c.ts');
  assert.equal(stop('mochi-react', dir, session()).status, 0);
  assert.equal(runs(dir), 1, 'a deletion');
  sh(dir, 'git checkout -q -- . && git mv packages/web/src/a.ts packages/api/a.ts');
  const result = stop('mochi-react', dir, session());
  assert.equal(result.status, 0, result.stderr);
  assert.equal(runs(dir), 2, 'the package that lost the file');
  assert.equal(runs(dir, 'packages/api'), 0, 'the other package is not React');
});

test('react: a package.json that is not valid JSON is reported, not a crash', () => {
  const dir = reactRepo();
  sh(dir, 'echo "{ broken" > packages/web/package.json');
  const result = stop('mochi-react', dir, session());
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /`package\.json` in .*packages\/web is not valid JSON/);
});

test('react: a change to package.json runs the checks', () => {
  const dir = reactRepo();
  sh(dir, 'cd packages/web && node -e "const p=require(\'./package.json\'); p.version=\'2\'; require(\'fs\').writeFileSync(\'package.json\', JSON.stringify(p))"');
  stop('mochi-react', dir, session());
  assert.equal(runs(dir), 1);
});

test('react: a check that does not finish is reported once, the next is not run, and the next Stop passes', () => {
  const dir = reactRepo('echo ran >> runs.log', 'sleep 8 & sleep 8');
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  const id = session();
  const started = Date.now();
  const first = stop('mochi-react', dir, id, { MOCHI_VERIFY_DEADLINE_SECONDS: '2' });
  assert.ok(Date.now() - started < 20000, 'a child process that holds the output does not keep the hook waiting');
  assert.equal(first.status, 2);
  assert.match(first.stderr, /`typecheck` did not finish in 2 s/);
  assert.match(first.stderr, /`test` not run: no time left before the deadline/);
  assert.equal(runs(dir), 0);
  assert.equal(stop('mochi-react', dir, id, { MOCHI_VERIFY_DEADLINE_SECONDS: '2' }).status, 0);
});

test('react: a failing check blocks once for the same files', () => {
  const dir = reactRepo('echo broken && exit 1');
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  const id = session();
  const first = stop('mochi-react', dir, id);
  assert.equal(first.status, 2);
  assert.match(first.stderr, /`test` failed/);
  assert.match(first.stderr, /broken/);
  assert.equal(stop('mochi-react', dir, id).status, 0);
});

// A FastAPI project with a mypy config and fake mypy and pytest in .venv,
// which log their arguments to tools.log.
const pythonRepo = ({ mypy = 'exit 0', pytest = 'exit 0' } = {}) => {
  const dir = tempDir('stack-python-');
  sh(dir, 'git init -q -b main');
  write(join(dir, 'pyproject.toml'), '[project]\nname = "shipping"\ndependencies = ["fastapi"]\n\n[tool.mypy]\nstrict = true\n');
  for (const [tool, body] of [
    ['mypy', mypy],
    ['pytest', pytest],
  ])
    write(join(dir, '.venv/bin', tool), `#!/bin/bash\necho "${tool} $*" >> tools.log\n${body}\n`, 0o755);
  write(join(dir, '.gitignore'), '.venv/\ntools.log\n');
  write(join(dir, 'app/a.py'), 'A = 1\n');
  write(join(dir, 'app/b.py'), 'B = 1\n');
  commitAll(dir);
  return dir;
};
const tools = (dir) => (existsSync(join(dir, 'tools.log')) ? readFileSync(join(dir, 'tools.log'), 'utf8').trim().split('\n').map((line) => line.trim()) : []);

test('python: mypy gets only the existing files, and the deleted one still starts the checks', () => {
  const dir = pythonRepo();
  sh(dir, 'rm app/a.py && echo "B = 2" > app/b.py');
  const result = stop('mochi-python', dir, session());
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(tools(dir), ['mypy app/b.py', 'pytest -q -x']);
});

test('python: a turn that only deletes, renames away, or changes config, skips mypy and runs the rest', () => {
  for (const change of ['rm app/a.py', 'git mv app/a.py app/a.py.bak', 'printf "\\n[tool.pytest.ini_options]\\n" >> pyproject.toml']) {
    const dir = pythonRepo();
    sh(dir, change);
    const result = stop('mochi-python', dir, session());
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(tools(dir), ['pytest -q -x'], change);
  }
});

test('python: mypy with files in mypy.ini runs on a change to that file', () => {
  const dir = pythonRepo();
  sh(dir, 'printf "[mypy-tests.*]\\nignore_errors = True\\n[mypy]\\nfiles = app\\n" > mypy.ini');
  stop('mochi-python', dir, session());
  assert.deepEqual(tools(dir), ['mypy', 'pytest -q -x']);
});

test('python: a failing check reaches Claude with its output', () => {
  const dir = pythonRepo({ mypy: 'echo "app/b.py:1: error: Name shop is not defined"; exit 1' });
  sh(dir, 'echo "B = shop" > app/b.py');
  const result = stop('mochi-python', dir, session());
  assert.equal(result.status, 2);
  assert.match(result.stderr, /`mypy app\/b\.py` failed/);
  assert.match(result.stderr, /app\/b\.py:1: error: Name shop is not defined/);
});

test('python: a check that does not finish is reported once, and the next is not run', () => {
  const dir = pythonRepo({ mypy: 'sleep 8 & sleep 8' });
  sh(dir, 'echo "B = 2" > app/b.py');
  const id = session();
  const first = stop('mochi-python', dir, id, { MOCHI_VERIFY_DEADLINE_SECONDS: '2' });
  assert.equal(first.status, 2);
  assert.match(first.stderr, /`mypy app\/b\.py` did not finish in 2 s/);
  assert.match(first.stderr, /`pytest -q -x` not run: no time left before the deadline/);
  assert.equal(stop('mochi-python', dir, id, { MOCHI_VERIFY_DEADLINE_SECONDS: '2' }).status, 0);
});

// The two plugins install apart, so each keeps its own copy of the module
// that reads the CLAUDE.md verification block. The copies are the same bytes,
// so the module cases run against one of them.
const moduleOf = (plugin) => join(PLUGINS, plugin, 'scripts', 'claude-md.mjs');
const { verificationCommands } = await import(moduleOf('mochi-react'));

test('both stack plugins keep the same CLAUDE.md module', () => {
  assert.equal(readFileSync(moduleOf('mochi-python'), 'utf8'), readFileSync(moduleOf('mochi-react'), 'utf8'));
});

test('CLAUDE.md: the commands of the Verification block only, without comments and with continued lines', () => {
  const dir = tempDir('claude-md-');
  write(
    join(dir, 'CLAUDE.md'),
    [
      '# Shop',
      '',
      'Tests: `npm test`. One file: `npm test -- src/cart.test.ts`.',
      '',
      '## Setup',
      '',
      '```bash',
      'npm install',
      '```',
      '',
      '## Verification',
      '',
      'Run from this folder before calling a change done:',
      '',
      '```text',
      'not a command',
      '```',
      '',
      '```bash',
      'npm run typecheck   # tsc -b, the solution config',
      '',
      '# lint enforces the layers',
      'npm run lint',
      'npm test -- \\',
      '  --run',
      '```',
      '',
      '```bash',
      'echo not this block',
      '```',
      '',
      '## Before a push to an open PR',
      '',
      '```bash',
      'npm run e2e',
      '```',
    ].join('\n'),
  );
  assert.deepEqual(verificationCommands(join(dir, 'src'), dir), {
    dir,
    commands: ['npm run typecheck   # tsc -b, the solution config', 'npm run lint', 'npm test -- \\\n  --run'],
  });
});

test('CLAUDE.md: CRLF line ends are not part of a command, and a last line that ends in \\ is kept', () => {
  const dir = tempDir('claude-md-');
  write(join(dir, 'CLAUDE.md'), '## Verification\r\n\r\n```bash\r\nnpm test -- \\\r\n  --run\r\nmake check \\\r\n```\r\n');
  assert.deepEqual(verificationCommands(dir, dir), { dir, commands: ['npm test -- \\\n  --run', 'make check \\'] });
});

test('CLAUDE.md: the nearest file counts, and one without a block gives none', () => {
  const dir = tempDir('claude-md-');
  write(join(dir, 'CLAUDE.md'), '## Verification\n\n```bash\nmake check\n```\n');
  write(join(dir, 'packages/web/CLAUDE.md'), '# Web\n\n## Scope override\n\nThe root commands do not apply here.\n');
  write(join(dir, 'packages/web/src/a.ts'), 'export const a = 1;\n');
  assert.equal(verificationCommands(join(dir, 'packages/web/src'), dir), undefined, 'a closer file without a block');
  assert.deepEqual(verificationCommands(join(dir, 'packages/api'), dir), { dir, commands: ['make check'] }, 'the root file');
  assert.equal(verificationCommands(join(dir, 'packages/api'), join(dir, 'packages')), undefined, 'not above the root it is given');
});

// A CLAUDE.md with these commands in its Verification block.
const block = (...commands) => `# Package\n\n## Verification\n\n\`\`\`bash\n${commands.join('\n')}\n\`\`\`\n`;
const lines = (path) => (existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n') : []);
const isRunning = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
// Waits for a condition, for at most `ms`, and gives its last value.
const waitFor = async (condition, ms) => {
  for (const end = Date.now() + ms; !condition() && Date.now() < end; ) await new Promise((done) => setTimeout(done, 50));
  return condition();
};
// A line whose child writes its pid, then runs far past any deadline here.
const LONG_LINE = "sh -c 'echo $$ > child.pid; sleep 30' && true";
const childPid = (dir) => Number(readFileSync(join(dir, 'child.pid'), 'utf8'));

test('react: the CLAUDE.md block runs from its folder in place of the scripts, and a failing line blocks with its output', () => {
  const dir = reactRepo();
  write(join(dir, 'packages/web/CLAUDE.md'), block('pwd >> block.log', 'echo "lint: 2 problems" && exit 3', 'pwd >> block.log'));
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  const result = stop('mochi-react', dir, session());
  assert.equal(result.status, 2);
  assert.match(result.stderr, /`echo "lint: 2 problems" && exit 3` failed in .*packages\/web:\nlint: 2 problems/);
  assert.deepEqual(lines(join(dir, 'packages/web/block.log')).map((line) => line.endsWith('packages/web')), [true, true], 'each line, from the folder of the CLAUDE.md');
  assert.equal(runs(dir), 0, 'not the test script');
});

test('react: a CLAUDE.md that cannot be read is reported with its path', () => {
  const dir = reactRepo();
  mkdirSync(join(dir, 'packages/web/CLAUDE.md'));
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  const result = stop('mochi-react', dir, session());
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Could not read `CLAUDE\.md` in .*packages\/web: /);
  assert.doesNotMatch(result.stderr, /package\.json/);
});

test('react: a closer CLAUDE.md without a block, or the off switch, keeps the scripts', () => {
  const dir = reactRepo();
  write(join(dir, 'CLAUDE.md'), block('echo root >> root.log'));
  write(join(dir, 'packages/web/CLAUDE.md'), '# Web\n\n## Scope override\n\nThe root commands do not apply here.\n');
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  stop('mochi-react', dir, session());
  assert.equal(runs(dir), 1);
  assert.equal(existsSync(join(dir, 'root.log')), false);
  sh(dir, 'rm packages/web/CLAUDE.md && echo "export const e = 1;" > packages/web/src/e.ts');
  stop('mochi-react', dir, session(), { MOCHI_VERIFY_FROM_CLAUDE_MD: '0' });
  assert.equal(runs(dir), 2, 'the off switch');
  assert.equal(existsSync(join(dir, 'root.log')), false);
});

test('react: packages that share a CLAUDE.md run its block one time, even without scripts', () => {
  const dir = reactRepo();
  write(join(dir, 'packages/admin/package.json'), JSON.stringify({ name: 'admin', dependencies: { react: '19', '@fluentui/react-components': '9' } }));
  write(join(dir, 'CLAUDE.md'), block('echo ran >> shared.log'));
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts && mkdir -p packages/admin/src && echo "export const a = 1;" > packages/admin/src/a.ts');
  const result = stop('mochi-react', dir, session());
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(lines(join(dir, 'shared.log')), ['ran']);
  sh(dir, 'rm shared.log && echo "export const b = 1;" > packages/admin/src/b.ts');
  stop('mochi-react', dir, session());
  assert.deepEqual(lines(join(dir, 'shared.log')), ['ran'], 'a package with a block and no scripts');
});

test('react: at the deadline a compound line stops with its children, and the next line is not run', async () => {
  const dir = reactRepo();
  write(join(dir, 'packages/web/CLAUDE.md'), block(LONG_LINE, 'echo next'));
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  const result = stop('mochi-react', dir, session(), { MOCHI_VERIFY_DEADLINE_SECONDS: '2' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /did not finish in 2 s/);
  assert.match(result.stderr, /`echo next` not run: no time left before the deadline/);
  assert.equal(await waitFor(() => !isRunning(childPid(join(dir, 'packages/web'))), 5000), true, 'the child of the line is stopped too');
});

test('react: a hook that is stopped stops the running line with its children', async () => {
  const dir = reactRepo();
  const web = join(dir, 'packages/web');
  write(join(web, 'CLAUDE.md'), block(LONG_LINE));
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  const child = spawn(process.execPath, [join(PLUGINS, 'mochi-react', 'scripts', 'verify-on-stop.mjs')], { env: hookEnv(), stdio: ['pipe', 'ignore', 'ignore'] });
  child.stdin.end(JSON.stringify({ hook_event_name: 'Stop', session_id: session(), cwd: dir }));
  assert.equal(await waitFor(() => existsSync(join(web, 'child.pid')), 10000), true, 'the line started');
  const exited = new Promise((done) => child.on('exit', done));
  child.kill('SIGTERM');
  await exited;
  assert.equal(await waitFor(() => !isRunning(childPid(web)), 5000), true, 'the child of the line is stopped too');
});

test('python: the CLAUDE.md block runs in place of the tools, one time for projects that share it, without a uv sync, and the off switch keeps the tools', () => {
  const dir = pythonRepo();
  write(join(dir, 'CLAUDE.md'), block('echo "UV_NO_SYNC=$UV_NO_SYNC" >> block.log', 'echo "2 failed" && exit 1'));
  write(join(dir, 'services/billing/pyproject.toml'), '[project]\nname = "billing"\ndependencies = ["fastapi"]\n');
  write(join(dir, 'services/billing/app/c.py'), 'C = 1\n');
  sh(dir, 'echo "B = 2" > app/b.py');
  const result = stop('mochi-python', dir, session());
  assert.equal(result.status, 2);
  assert.match(result.stderr, /`echo "2 failed" && exit 1` failed in .*:\n2 failed/);
  assert.deepEqual(lines(join(dir, 'block.log')), ['UV_NO_SYNC=1'], 'one run for the two projects');
  assert.deepEqual(tools(dir), [], 'not mypy or pytest');
  sh(dir, 'rm -r services && echo "B = 3" > app/b.py');
  stop('mochi-python', dir, session(), { MOCHI_VERIFY_FROM_CLAUDE_MD: '0' });
  assert.deepEqual(tools(dir), ['mypy app/b.py', 'pytest -q -x']);
});

test('python: a CLAUDE.md without a block keeps the tools', () => {
  const dir = pythonRepo();
  write(join(dir, 'CLAUDE.md'), '# Shipping\n\nA FastAPI service.\n');
  sh(dir, 'echo "B = 2" > app/b.py');
  stop('mochi-python', dir, session());
  assert.deepEqual(tools(dir), ['mypy app/b.py', 'pytest -q -x']);
});

for (const [plugin, skill, preset, repo, cwd] of [
  ['mochi-python', 'service-layer', 'ruff-lint.toml', pythonRepo, ''],
  ['mochi-react', 'architecture', 'eslint-mochi.mjs', reactRepo, 'packages/web'],
])
  test(`${plugin}: a skill that names its preset reaches Claude with the path resolved`, () => {
    const root = join(PLUGINS, plugin);
    const result = spawnSync(process.execPath, [join(root, 'scripts', 'inject-matching-skills.mjs'), skill], {
      input: JSON.stringify({ hook_event_name: 'SessionStart', session_id: session(), cwd: join(repo(), cwd) }),
      encoding: 'utf8',
      env: hookEnv({ CLAUDE_PLUGIN_ROOT: root }),
    });
    const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
    assert.ok(context.includes(`${root}/presets/${preset}`), 'the preset path');
    assert.ok(!context.includes('${CLAUDE_PLUGIN_ROOT}'));
  });

const edited = (plugin, file) => hook(plugin, 'lint-edited-file.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: file } });

test('react lint: problems block, a crash tells Claude without blocking, and no linter is silent', () => {
  const dir = reactRepo();
  const file = join(dir, 'packages/web/src/a.ts');
  const eslint = (body) => write(join(dir, 'packages/web/node_modules/.bin/eslint'), `#!/bin/bash\n${body}\n`, 0o755);
  write(join(dir, 'packages/web/eslint.config.mts'), 'export default [];\n');
  assert.deepEqual(edited('mochi-react', file), { status: 0, stdout: '', stderr: '' }, 'no eslint');
  eslint('echo "a.ts:1 no-unused-vars"; exit 1');
  let result = edited('mochi-react', file);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /still reports problems/);
  eslint('echo "Oops! Something went wrong! :(" >&2; echo "ESLint: 10.14.0" >&2; echo "SyntaxError: eslint.config.mts: Unexpected token" >&2; exit 2');
  result = edited('mochi-react', file);
  assert.equal(result.status, 0);
  const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
  assert.match(context, /^ESLint could not run on .*a\.ts: /);
  assert.match(context, /SyntaxError: eslint\.config\.mts: Unexpected token/, 'the cause, not only the first line');
  write(join(dir, 'packages/web/node_modules/.bin/eslint'), 'not a program', 0o644);
  assert.deepEqual(edited('mochi-react', file), { status: 0, stdout: '', stderr: '' }, 'a linter that cannot start');
});

test('python lint: a Ruff crash tells Claude without blocking', () => {
  const dir = pythonRepo();
  write(join(dir, '.venv/bin/ruff'), '#!/bin/bash\necho "ruff failed: invalid pyproject.toml" >&2\nexit 2\n', 0o755);
  const result = edited('mochi-python', join(dir, 'app/a.py'));
  assert.equal(result.status, 0);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /Ruff could not run on .*a\.py: ruff failed: invalid pyproject\.toml/);
  write(join(dir, '.venv/bin/ruff'), '#!/bin/bash\necho "a.py:1 F401"\nexit 1\n', 0o755);
  assert.equal(edited('mochi-python', join(dir, 'app/a.py')).status, 2);
  write(join(dir, '.venv/bin/ruff'), 'not a program', 0o644);
  assert.deepEqual(edited('mochi-python', join(dir, 'app/a.py')), { status: 0, stdout: '', stderr: '' }, 'a Ruff that cannot start');
});
