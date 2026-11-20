import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const BANNER = fileURLToPath(new URL('../plugins/mochi/scripts/banner.mjs', import.meta.url));
const FETCH_STUB = new URL('./fetch-stub.mjs', import.meta.url).href;
const ARROW = '↑';
const CACHE = 'negima-mochi-latest-release.json';

// A temp plugin root at 1.2.0, project, config and data folder, so that no
// test reads the machine's own state. A test that sets no STUB_TAG seeds a
// fresh cache, so it makes no request.
const setUp = ({ cache, installed } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'banner-test-'));
  const dirs = Object.fromEntries(['plugin', 'project', 'config', 'data'].map((name) => [name, join(root, name)]));
  Object.values(dirs).forEach((dir) => mkdirSync(dir));
  mkdirSync(join(dirs.plugin, '.claude-plugin'));
  writeFileSync(join(dirs.plugin, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '1.2.0' }));
  if (cache) writeFileSync(join(dirs.data, CACHE), JSON.stringify(cache));
  if (installed) {
    mkdirSync(join(dirs.config, 'plugins'));
    writeFileSync(join(dirs.config, 'plugins', 'installed_plugins.json'), JSON.stringify(installed(dirs)));
  }
  return dirs;
};

const run = (dirs, { env = {}, source = 'startup' } = {}) => {
  const result = spawnSync(process.execPath, ['--import', FETCH_STUB, BANNER], {
    input: JSON.stringify({ source, cwd: dirs.project }),
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      NO_COLOR: '1',
      CLAUDE_PLUGIN_ROOT: dirs.plugin,
      CLAUDE_PROJECT_DIR: dirs.project,
      CLAUDE_CONFIG_DIR: dirs.config,
      CLAUDE_PLUGIN_DATA: dirs.data,
      ...env,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout && JSON.parse(result.stdout).systemMessage;
};

const versionLine = (message) => message.split('\n').find((line) => line.includes('mochi 1.2.0'));
const fresh = (version) => ({ checkedAt: Date.now(), version });
const readCache = (dirs) => JSON.parse(readFileSync(join(dirs.data, CACHE), 'utf8'));

test('a newer release adds the arrow, by number and not by text', () => {
  assert.match(versionLine(run(setUp({ cache: fresh('1.10.0') }))), /mochi 1\.2\.0↑/);
});

test('the same or an older release adds no arrow', () => {
  for (const version of ['1.2.0', '1.1.9']) {
    assert.ok(!versionLine(run(setUp({ cache: fresh(version) }))).includes(ARROW), version);
  }
});

test('an unknown latest release shows the version with no arrow', () => {
  assert.ok(!versionLine(run(setUp({ cache: { checkedAt: Date.now() } }))).includes(ARROW));
});

test('MOCHI_UPDATE_CHECK=0 stops the check', () => {
  const dirs = setUp({ cache: fresh('9.0.0') });
  assert.ok(!versionLine(run(dirs, { env: { MOCHI_UPDATE_CHECK: '0' } })).includes(ARROW));
});

test('a stale cache gets the tag of the latest release, without its v', () => {
  const dirs = setUp({ cache: { checkedAt: 0, version: '1.2.0' } });
  assert.ok(versionLine(run(dirs, { env: { STUB_TAG: 'v1.3.0' } })).includes(ARROW));
  assert.equal(readCache(dirs).version, '1.3.0');
});

test('a cache time in the future does not stop the check', () => {
  const dirs = setUp({ cache: { checkedAt: Date.now() + 86_400_000, version: '1.2.0' } });
  assert.ok(versionLine(run(dirs, { env: { STUB_TAG: 'v1.3.0' } })).includes(ARROW));
});

test('a failed request keeps the last version and is cached', () => {
  const dirs = setUp({ cache: { checkedAt: 0, version: '1.3.0' } });
  assert.ok(versionLine(run(dirs, { env: { STUB_TAG: 'offline' } })).includes(ARROW));
  const cache = readCache(dirs);
  assert.equal(cache.version, '1.3.0');
  assert.ok(Date.now() - cache.checkedAt < 60_000);
});

test('a stack plugin shows only when it is installed for this project', () => {
  const dirs = setUp({
    cache: fresh('1.2.0'),
    installed: ({ plugin, project }) => ({
      version: 2,
      plugins: {
        'mochi@m': [{ scope: 'user', installPath: plugin, version: '1.2.0' }],
        'mochi-react@m': [{ scope: 'project', projectPath: '/elsewhere', version: '1.2.0' }],
        'mochi-python@m': [
          { scope: 'user', version: '1.0.0' },
          { scope: 'local', projectPath: project, version: '1.2.0' },
        ],
      },
    }),
  });
  assert.equal(versionLine(run(dirs)).match(/mochi 1\.2\.0.*/)[0], 'mochi 1.2.0 · python 1.2.0');
});

test('the arrow marks only the plugin that is older than the release', () => {
  const dirs = setUp({
    cache: fresh('1.2.0'),
    installed: ({ plugin }) => ({
      version: 2,
      plugins: {
        'mochi@m': [{ scope: 'user', installPath: plugin, version: '1.2.0' }],
        'mochi-react@m': [{ scope: 'user', version: '1.1.0' }],
      },
    }),
  });
  assert.equal(versionLine(run(dirs)).match(/mochi 1\.2\.0.*/)[0], 'mochi 1.2.0 · react 1.1.0↑');
});

test('an installed_plugins.json of version 1 still shows the banner', () => {
  const dirs = setUp({
    cache: fresh('1.2.0'),
    installed: ({ plugin }) => ({ version: 1, plugins: { 'mochi@m': { installPath: plugin, version: '1.2.0' } } }),
  });
  assert.ok(versionLine(run(dirs)));
});

test('a resumed session shows no banner', () => {
  assert.equal(run(setUp({ cache: fresh('1.2.0') }), { source: 'resume' }), '');
});
