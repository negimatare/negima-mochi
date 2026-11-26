// Builds the repository of an eval case and plays a run by script, with no
// model call, for the tests of the eval observer and the graders.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGINS = fileURLToPath(new URL('../plugins/', import.meta.url));
const OBSERVER = join(PLUGINS, 'mochi/evals/_shared/observer/scripts/observe.mjs');

// Git and the observer see only the fixture: not your git config, and not
// the session that runs the tests. NODE_TEST_CONTEXT would make the
// fixture's own `node --test` report to this runner and exit 0 on a failure.
const ENV = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_') && !name.startsWith('NODE_TEST') && name !== 'CLAUDE_PROJECT_DIR'),
);
Object.assign(ENV, { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });

const dirs = [];
process.on('exit', () => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});
export const tempDir = (prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
};

// Runs the case's fixture.sh in a new folder, as --scaffold does.
export const scaffold = (name, plugin = 'mochi') => {
  const dir = tempDir(`eval-${name}-`);
  const result = spawnSync('bash', [join(PLUGINS, plugin, 'evals', name, 'fixture.sh')], { cwd: dir, encoding: 'utf8', env: ENV });
  assert.equal(result.status, 0, result.stderr);
  return dir;
};

export const sh = (dir, script) => {
  const result = spawnSync('bash', ['-euo', 'pipefail', '-c', script], { cwd: dir, encoding: 'utf8', env: ENV });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};

// Runs the observer as the Stop hook does; a string input goes as it is.
export const observe = (dir, input = { hook_event_name: 'Stop', cwd: dir }) =>
  spawnSync(process.execPath, [OBSERVER], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', env: ENV });
