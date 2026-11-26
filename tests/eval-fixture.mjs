// Builds the repository of an eval case and plays a run by script, with no
// model call, for the tests of the eval observer and the graders.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGINS = fileURLToPath(new URL('../plugins/', import.meta.url));
const OBSERVER = join(PLUGINS, 'mochi/evals/_shared/observer/scripts/observe.mjs');

// Runs the case's fixture.sh in a new folder, as --scaffold does.
export const scaffold = (name, plugin = 'mochi') => {
  const dir = mkdtempSync(join(tmpdir(), `eval-${name}-`));
  const result = spawnSync('bash', [join(PLUGINS, plugin, 'evals', name, 'fixture.sh')], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return dir;
};

export const sh = (dir, script) => {
  const result = spawnSync('bash', ['-euo', 'pipefail', '-c', script], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};

// Runs the observer as the Stop hook does; a string input goes as it is.
export const observe = (dir, input = { hook_event_name: 'Stop', cwd: dir }) =>
  spawnSync(process.execPath, [OBSERVER], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8' });
