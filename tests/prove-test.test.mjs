import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
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

test('a mutant that hangs times out, and the file is restored', () => {
  const { dir, original, mutant } = setUp((text) => `while (true) {}\n${text}`);
  const { json } = prove(dir, [SOURCE, mutant, '--timeout', '3', ...TEST]);
  assert.equal(json.after, 'timeout');
  assert.equal(json.restored, true);
  unchanged(dir, original);
});

test('a proof stopped by a signal restores the file', async () => {
  const { dir, original, mutant } = setUp((text) => `while (true) {}\n${text}`);
  const child = spawn(process.execPath, [SCRIPT, SOURCE, mutant, '--timeout', '60', ...TEST], { cwd: dir, env: ENV });
  let stderr = '';
  let killed = false;
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
    // The mutant is in place once the script names its copy.
    if (!killed && /copy of /.test(stderr)) {
      killed = true;
      setTimeout(() => child.kill('SIGTERM'), 500);
    }
  });
  const code = await new Promise((resolve) => child.on('exit', (c, signal) => resolve(c ?? signal)));
  assert.ok(killed, stderr);
  assert.notEqual(code, 0);
  unchanged(dir, original);
});

test('wrong arguments exit 2 and change nothing', () => {
  const { dir, original, mutant } = setUp((text) => text.replace(CHECK, ''));
  assert.equal(prove(dir, [SOURCE, mutant]).status, 2, 'no test command');
  assert.equal(prove(dir, [SOURCE, SOURCE, ...TEST]).status, 2, 'the mutant is the source');
  assert.equal(prove(dir, ['src/missing.mjs', mutant, ...TEST]).status, 2, 'no such source');
  assert.equal(prove(dir, [SOURCE, join(dir, 'nope.mjs'), ...TEST]).status, 2, 'no such mutant');
  writeFileSync(mutant, original);
  assert.equal(prove(dir, [SOURCE, mutant, ...TEST]).status, 2, 'the mutant changes nothing');
  unchanged(dir, original);
});
