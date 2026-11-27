import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ENV, scaffold, tempDir } from './eval-fixture.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/mochi/skills/review/scripts/prove-test.mjs', import.meta.url));
const SOURCE = 'src/range.mjs';
const TEST = ['--', process.execPath, '--test', 'src/range.test.mjs'];
const CHECK = '    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;\n';

// The proof case's fixture, and a mutant of its source file in $TMPDIR.
const setUp = (edit) => {
  const dir = scaffold('review-proves-a-test-that-cannot-fail');
  const original = readFileSync(join(dir, SOURCE), 'utf8');
  assert.ok(original.includes(CHECK));
  const mutant = join(tempDir('prove-test-mutant-'), 'range.mjs');
  writeFileSync(mutant, edit(original));
  return { dir, original, mutant };
};
const prove = (dir, args) => {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: 'utf8', env: ENV });
  return { ...result, json: result.status === 0 ? JSON.parse(result.stdout) : undefined };
};
const unchanged = (dir, original) => assert.equal(readFileSync(join(dir, SOURCE), 'utf8'), original, 'the source file is restored');

test('a test that still passes with the guard removed confirms the finding', () => {
  const { dir, original, mutant } = setUp((text) => text.replace(CHECK, ''));
  const { json } = prove(dir, [SOURCE, mutant, ...TEST]);
  assert.equal(json.before, 'pass');
  assert.equal(json.after, 'pass');
  assert.equal(json.restored, true);
  unchanged(dir, original);
});

test('a test that fails on the mutant gives the failure and its output', () => {
  const { dir, original, mutant } = setUp((text) => text.replace('return null;\n    return', 'return null;\n    throw new Error("planted");\n    return'));
  const { json } = prove(dir, [SOURCE, mutant, ...TEST]);
  assert.equal(json.before, 'pass');
  assert.equal(json.after, 'fail');
  assert.notEqual(json.exitCode, 0);
  assert.match(json.output, /planted/);
  unchanged(dir, original);
});

test('tests that fail before the change skip the proof and leave the file alone', () => {
  const { dir, original, mutant } = setUp((text) => text.replace(CHECK, ''));
  writeFileSync(join(dir, 'src/range.test.mjs'), 'import { test } from "node:test";\ntest("broken", () => { throw new Error("red"); });\n');
  const { json } = prove(dir, [SOURCE, mutant, ...TEST]);
  assert.equal(json.before, 'fail');
  assert.equal(json.after, null);
  unchanged(dir, original);
});

// A mutant that writes the pid of the test process, then hangs.
const hang = (pidFile) => (text) => `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(pidFile)}, String(process.pid));\nwhile (true) {}\n${text}`;
// The test process is gone: the script stopped the whole tree, not only
// the runner it started.
const gone = async (pidFile) => {
  const pid = Number(readFileSync(pidFile, 'utf8'));
  for (let tries = 0; tries < 50; tries++) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === 'ESRCH') return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process.kill(pid, 'SIGKILL');
  assert.fail(`test process ${pid} still runs`);
};

test('a mutant that hangs times out, the tests stop, and the file is restored', async () => {
  const pidFile = join(tempDir('prove-test-pid-'), 'pid');
  const { dir, original, mutant } = setUp(hang(pidFile));
  const { json } = prove(dir, [SOURCE, mutant, '--timeout', '3', ...TEST]);
  assert.equal(json.after, 'timeout');
  assert.equal(json.restored, true);
  unchanged(dir, original);
  await gone(pidFile);
});

test('a proof stopped by a signal stops the tests and restores the file', async () => {
  const pidFile = join(tempDir('prove-test-pid-'), 'pid');
  const { dir, original, mutant } = setUp(hang(pidFile));
  const child = spawn(process.execPath, [SCRIPT, SOURCE, mutant, '--timeout', '60', ...TEST], { cwd: dir, env: ENV });
  let stderr = '';
  let killed = false;
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
    // The script names its copy just before the mutant goes in; the test
    // process writes its pid once it runs the mutant.
    if (!killed && /copy of /.test(stderr)) {
      killed = true;
      const wait = setInterval(() => {
        if (!existsSync(pidFile)) return;
        clearInterval(wait);
        child.kill('SIGTERM');
      }, 100);
    }
  });
  const code = await new Promise((resolve) => child.on('exit', (c, signal) => resolve(c ?? signal)));
  assert.ok(killed, stderr);
  assert.notEqual(code, 0);
  unchanged(dir, original);
  await gone(pidFile);
});

test('a command that does not start gives error, and the proof is skipped', () => {
  const { dir, original, mutant } = setUp((text) => text.replace(CHECK, ''));
  const { json } = prove(dir, [SOURCE, mutant, '--', 'no-such-test-runner']);
  assert.equal(json.before, 'error');
  assert.equal(json.after, null);
  assert.match(json.output, /ENOENT/);
  unchanged(dir, original);
});

test('wrong arguments exit 2 and change nothing', () => {
  const { dir, original, mutant } = setUp((text) => text.replace(CHECK, ''));
  assert.equal(prove(dir, [SOURCE, mutant]).status, 2, 'no test command');
  const same = prove(dir, [SOURCE, SOURCE, ...TEST]);
  assert.equal(same.status, 2);
  assert.match(same.stderr, /is the source file/);
  assert.equal(prove(dir, ['src/missing.mjs', mutant, ...TEST]).status, 2, 'no such source');
  assert.equal(prove(dir, [SOURCE, join(dir, 'nope.mjs'), ...TEST]).status, 2, 'no such mutant');
  writeFileSync(mutant, original);
  assert.equal(prove(dir, [SOURCE, mutant, ...TEST]).status, 2, 'the mutant changes nothing');
  unchanged(dir, original);
});
