// The hook scripts of mochi-react and mochi-python, run as Claude Code runs
// them, on temp packages with fake tools.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENV, sh, tempDir } from './eval-fixture.mjs';

const PLUGINS = fileURLToPath(new URL('../plugins/', import.meta.url));
let sessions = 0;

const write = (path, text, mode) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  if (mode) chmodSync(path, mode);
};
const hook = (plugin, script, input, env = {}) => {
  const result = spawnSync(process.execPath, [join(PLUGINS, plugin, 'scripts', script)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...ENV, ...env },
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

test('react: a turn that only deletes or renames a file runs the checks of its package', () => {
  const dir = reactRepo();
  sh(dir, 'rm packages/web/src/c.ts');
  assert.equal(stop('mochi-react', dir, `s${++sessions}`).status, 0);
  assert.equal(runs(dir), 1, 'a deletion');
  sh(dir, 'git checkout -q -- . && git mv packages/web/src/a.ts packages/web/src/b.ts');
  const result = stop('mochi-react', dir, `s${++sessions}`);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(runs(dir), 2, 'a rename');
  assert.equal(runs(dir, 'packages/api'), 0, 'the other package is left alone');
});

test('react: a change to package.json runs the checks', () => {
  const dir = reactRepo();
  sh(dir, 'cd packages/web && node -e "const p=require(\'./package.json\'); p.version=\'2\'; require(\'fs\').writeFileSync(\'package.json\', JSON.stringify(p))"');
  stop('mochi-react', dir, `s${++sessions}`);
  assert.equal(runs(dir), 1);
});

test('react: a check that does not finish is reported once, the next is not run, and the next Stop passes', () => {
  const dir = reactRepo('echo ran >> runs.log', 'sleep 30 & sleep 30');
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  const session = `s${++sessions}`;
  const started = Date.now();
  const first = stop('mochi-react', dir, session, { MOCHI_VERIFY_DEADLINE_SECONDS: '2' });
  assert.ok(Date.now() - started < 20000, 'a child process that holds the output does not keep the hook waiting');
  assert.equal(first.status, 2);
  assert.match(first.stderr, /`typecheck` did not finish in 2 s/);
  assert.match(first.stderr, /`test` not run: no time left before the deadline/);
  assert.equal(runs(dir), 0);
  assert.equal(stop('mochi-react', dir, session, { MOCHI_VERIFY_DEADLINE_SECONDS: '2' }).status, 0);
});

test('react: a failing check blocks once for the same files', () => {
  const dir = reactRepo('echo broken && exit 1');
  sh(dir, 'echo "export const d = 1;" > packages/web/src/d.ts');
  const session = `s${++sessions}`;
  const first = stop('mochi-react', dir, session);
  assert.equal(first.status, 2);
  assert.match(first.stderr, /`test` failed/);
  assert.match(first.stderr, /broken/);
  assert.equal(stop('mochi-react', dir, session).status, 0);
});

// A FastAPI project with a mypy config and fake mypy and pytest in .venv,
// which log their arguments to tools.log.
const pythonRepo = ({ pytest = 'exit 0' } = {}) => {
  const dir = tempDir('stack-python-');
  sh(dir, 'git init -q -b main');
  write(join(dir, 'pyproject.toml'), '[project]\nname = "shipping"\ndependencies = ["fastapi"]\n\n[tool.mypy]\nstrict = true\n');
  for (const [tool, body] of [
    ['mypy', 'exit 0'],
    ['pytest', pytest],
  ])
    write(join(dir, '.venv/bin', tool), `#!/bin/bash\necho "${tool} $*" >> tools.log\n${body}\n`, 0o755);
  write(join(dir, '.gitignore'), '.venv/\ntools.log\n');
  write(join(dir, 'app/a.py'), 'A = 1\n');
  write(join(dir, 'app/b.py'), 'B = 1\n');
  commitAll(dir);
  return dir;
};
const tools = (dir) => (existsSync(join(dir, 'tools.log')) ? readFileSync(join(dir, 'tools.log'), 'utf8').trim().split('\n') : []);

test('python: mypy gets only the existing files, and the deleted one still starts the checks', () => {
  const dir = pythonRepo();
  sh(dir, 'rm app/a.py && echo "B = 2" > app/b.py');
  const result = stop('mochi-python', dir, `s${++sessions}`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(tools(dir), ['mypy app/b.py', 'pytest -q -x']);
});

test('python: a turn that only deletes a file, or changes only config, skips mypy and runs the rest', () => {
  for (const change of ['rm app/a.py', 'printf "\\n[tool.pytest.ini_options]\\n" >> pyproject.toml']) {
    const dir = pythonRepo();
    sh(dir, change);
    const result = stop('mochi-python', dir, `s${++sessions}`);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(tools(dir), ['pytest -q -x'], change);
  }
});

test('python: a check that does not finish is reported once', () => {
  const dir = pythonRepo({ pytest: 'sleep 30 & sleep 30' });
  sh(dir, 'echo "B = 2" > app/b.py');
  const session = `s${++sessions}`;
  const first = stop('mochi-python', dir, session, { MOCHI_VERIFY_DEADLINE_SECONDS: '2' });
  assert.equal(first.status, 2);
  assert.match(first.stderr, /`pytest -q -x` did not finish in 2 s/);
  assert.equal(stop('mochi-python', dir, session, { MOCHI_VERIFY_DEADLINE_SECONDS: '2' }).status, 0);
});

const edited = (plugin, file) => hook(plugin, 'lint-edited-file.mjs', { hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: file } });

test('react lint: problems block, a crash tells Claude without blocking, and no linter is silent', () => {
  const dir = reactRepo();
  const file = join(dir, 'packages/web/src/a.ts');
  const eslint = (body) => write(join(dir, 'packages/web/node_modules/.bin/eslint'), `#!/bin/bash\n${body}\n`, 0o755);
  assert.deepEqual(edited('mochi-react', file), { status: 0, stdout: '', stderr: '' }, 'no config');
  write(join(dir, 'packages/web/eslint.config.mts'), 'export default [];\n');
  assert.deepEqual(edited('mochi-react', file), { status: 0, stdout: '', stderr: '' }, 'no eslint');
  eslint('echo "a.ts:1 no-unused-vars"; exit 1');
  let result = edited('mochi-react', file);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /still reports problems/);
  eslint('echo "Oops! Something went wrong: bad config" >&2; exit 2');
  result = edited('mochi-react', file);
  assert.equal(result.status, 0);
  const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
  assert.match(context, /ESLint could not run on .*a\.ts: Oops! Something went wrong: bad config/);
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
});
