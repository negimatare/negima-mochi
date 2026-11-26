// The lint presets of the stack plugins, run by the real linters on planted
// violations. The kit installs nothing, so each test skips when its linter is
// missing; the Lint presets CI job installs pinned versions and runs them.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { tempDir } from './eval-fixture.mjs';

const PLUGINS = fileURLToPath(new URL('../plugins/', import.meta.url));
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};
const ruff = process.env.RUFF || (spawnSync('ruff', ['--version']).status === 0 ? 'ruff' : undefined);
// The CI job sets this, so that a linter it failed to install fails the test.
const required = process.env.MOCHI_PRESET_LINTERS === '1';
const skip = (tool, name) => !tool && !required && `${name} is not installed`;

// The codes of the preset's rules that Ruff reports for each file, in a
// project whose pyproject.toml holds the preset and nothing else of Ruff's.
// Ruff's default rules may report more; only the preset's are kept.
const ruffCodes = (files) => {
  const dir = tempDir('preset-ruff-');
  const preset = readFileSync(join(PLUGINS, 'mochi-python/presets/ruff-lint.toml'), 'utf8');
  write(join(dir, 'pyproject.toml'), `[project]\nname = "shop"\nversion = "0"\n\n${preset}`);
  for (const [path, text] of Object.entries(files)) write(join(dir, path), text);
  const result = spawnSync(ruff, ['check', '--no-cache', '--output-format', 'json', '.'], { cwd: dir, encoding: 'utf8' });
  assert.notEqual(result.status, 2, result.stderr);
  const codes = Object.fromEntries(Object.keys(files).map((path) => [path, []]));
  for (const { filename, code } of JSON.parse(result.stdout))
    if (/^(ASYNC|S113|TID251)/.test(code)) codes[filename.slice(filename.indexOf('/app/') + 1)].push(code);
  return codes;
};

test('python preset: Ruff reports each planted violation, and not the composition root or clean code', { skip: skip(ruff, 'Ruff') }, () => {
  assert.deepEqual(
    ruffCodes({
      'app/clock.py': 'from datetime import datetime\n\n\ndef stamp() -> datetime:\n    return datetime.now()\n',
      'app/today.py': 'import datetime\n\n\ndef day() -> datetime.date:\n    return datetime.date.today()\n',
      'app/environ.py': 'import os\n\nKEY = os.environ["SHOP_KEY"]\n',
      'app/getenv.py': 'import os\n\nKEY = os.getenv("SHOP_KEY")\n',
      'app/sleep.py': 'import time\n\n\nasync def wait() -> None:\n    time.sleep(1)\n',
      'app/requests_call.py': 'import requests\n\n\ndef fetch() -> None:\n    requests.get("https://shop.example/orders")\n',
      'app/httpx_call.py': 'import httpx\n\n\ndef fetch() -> None:\n    httpx.get("https://shop.example/orders", timeout=None)\n',
      'app/bootstrap.py': 'from datetime import UTC, datetime\n\nclock = lambda: datetime.now(UTC)\n',
      'app/cart.py': 'def total(prices: list[int]) -> int:\n    return sum(prices)\n',
    }),
    {
      'app/clock.py': ['TID251'],
      'app/today.py': ['TID251'],
      'app/environ.py': ['TID251'],
      'app/getenv.py': ['TID251'],
      'app/sleep.py': ['ASYNC251'],
      'app/requests_call.py': ['S113'],
      'app/httpx_call.py': ['S113'],
      'app/bootstrap.py': [],
      'app/cart.py': [],
    },
  );
});
