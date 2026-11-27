import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isOn } from '../plugins/mochi/scripts/autonomous.mjs';
import { ENV } from './eval-fixture.mjs';

const SCRIPT = fileURLToPath(new URL('../plugins/mochi/scripts/autonomous.mjs', import.meta.url));
const run = (value) =>
  spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env: { ...ENV, ...(value === undefined ? {} : { CLAUDE_PLUGIN_OPTION_AUTONOMOUS: value }) } });

test('the option turns the line on, and only a yes does', () => {
  for (const value of ['true', 'TRUE', '1', 'on', 'yes', ' true\n']) assert.ok(isOn(value), value);
  for (const value of [undefined, '', 'false', '0', 'off', 'no', 'truthy']) assert.ok(!isOn(value), String(value));
  assert.match(run('true').stdout, /autonomous mode is on/);
  assert.equal(run('false').stdout, '');
  assert.equal(run(undefined).stdout, '');
});

test('the plugin declares the option and runs the script at the session start', () => {
  const manifest = JSON.parse(readFileSync(new URL('../plugins/mochi/.claude-plugin/plugin.json', import.meta.url), 'utf8'));
  assert.equal(manifest.userConfig.autonomous.default, false);
  const hooks = JSON.parse(readFileSync(new URL('../plugins/mochi/hooks/hooks.json', import.meta.url), 'utf8'));
  const commands = hooks.hooks.SessionStart.flatMap((entry) => entry.hooks.map((hook) => hook.command));
  assert.ok(commands.some((command) => command.includes('scripts/autonomous.mjs')));
});
