// Step 5 of the review skill: prove that a test cannot fail. It runs the
// tests, puts the mutant in place of the source file, runs them again, and
// puts the source back: also on a timeout, a test crash, or SIGINT, SIGTERM
// or SIGHUP. Only a SIGKILL of this script leaves the mutant in place; the
// copy it named on stderr then has the source.
//
//   node prove-test.mjs <source> <mutant> [--timeout <seconds>] -- <test command...>
//
// <mutant> is a copy of <source> with the change the finding names. The
// test command runs as given, with no shell, from the current folder: wrap
// shell syntax as `-- sh -c '<command>'`. Each run has a deadline of 45 s,
// so both runs end before a 2-minute tool timeout.
// Prints one JSON object:
//   before     pass, fail, timeout, or error (the command did not start):
//              the tests on the source as it is
//   after      the same on the mutant; null when before is not pass, as
//              the proof is skipped then
//   exitCode   the exit code of the run that output comes from, or null
//   restored   whether the source matches its copy afterwards, byte for byte
//   copy       the copy of the source, kept when restored is false
//   output     the last 40 lines of the run on the mutant (of the run
//              before, when it did not pass)
// Before the mutant goes in, the script names the copy on stderr. Wrong
// arguments exit 2 and change nothing.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const usage = (problem) => {
  console.error(`${problem}\nUsage: prove-test.mjs <source> <mutant> [--timeout <seconds>] -- <test command...>`);
  process.exit(2);
};
const args = process.argv.slice(2);
const dashes = args.indexOf('--');
if (dashes === -1 || dashes === args.length - 1) usage('No test command.');
const command = args.slice(dashes + 1);
const options = args.slice(0, dashes);
let timeoutSeconds = 45;
const timeoutAt = options.indexOf('--timeout');
if (timeoutAt !== -1) {
  timeoutSeconds = Number(options[timeoutAt + 1]);
  if (!(timeoutSeconds > 0)) usage('--timeout takes a number of seconds.');
  options.splice(timeoutAt, 2);
}
if (options.length !== 2) usage('Give the source file and the mutant.');
const [source, mutant] = options;
if (!existsSync(source)) usage(`No file ${source}.`);
if (!existsSync(mutant)) usage(`No file ${mutant}.`);
if (realpathSync(source) === realpathSync(mutant)) usage('The mutant is the source file.');
if (readFileSync(source).equals(readFileSync(mutant))) usage('The mutant matches the source: nothing to prove.');

// Runs the tests in their own process group, so a timeout or a signal
// stops the whole tree (npm and the runner under it).
let running = null;
const runTests = () =>
  new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    running = child;
    let text = '';
    for (const stream of [child.stdout, child.stderr]) {
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => (text += chunk));
    }
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      stop(child);
    }, timeoutSeconds * 1000);
    let startError = null;
    const finish = (exitCode) => {
      if (running !== child) return;
      clearTimeout(timer);
      running = null;
      const result = startError ? 'error' : timedOut ? 'timeout' : exitCode === 0 ? 'pass' : 'fail';
      if (startError) text += `\n${startError}`;
      resolve({ result, exitCode: timedOut ? null : exitCode, output: text.trimEnd().split('\n').slice(-40).join('\n') });
    };
    child.on('error', (error) => {
      startError = error.message;
      finish(null);
    });
    child.on('close', (code) => finish(code));
  });
const stop = (child) => {
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
};

const copyDir = mkdtempSync(join(tmpdir(), 'prove-test-'));
const copy = join(copyDir, basename(source));
let swapped = false;
const restore = () => {
  if (!swapped) return true;
  copyFileSync(copy, source);
  swapped = false;
  return readFileSync(source).equals(readFileSync(copy));
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    if (running) stop(running);
    let restored = false;
    try {
      restored = restore();
    } catch {}
    if (restored) rmSync(copyDir, { recursive: true, force: true });
    console.error(restored ? `Stopped by ${signal}; ${source} is restored.` : `Stopped by ${signal}; restore ${source} from ${copy}.`);
    process.exit(1);
  });
}

const before = await runTests();
if (before.result !== 'pass') {
  rmSync(copyDir, { recursive: true, force: true });
  console.log(JSON.stringify({ before: before.result, after: null, exitCode: before.exitCode, restored: true, copy: null, output: before.output }));
  process.exit(0);
}

copyFileSync(source, copy);
console.error(`The copy of ${source} is ${copy}.`);
let after;
let restored = false;
try {
  swapped = true;
  copyFileSync(mutant, source);
  after = await runTests();
} finally {
  restored = restore();
}
if (restored) rmSync(copyDir, { recursive: true, force: true });
console.log(
  JSON.stringify({ before: 'pass', after: after.result, exitCode: after.exitCode, restored, copy: restored ? null : copy, output: after.output }),
);
