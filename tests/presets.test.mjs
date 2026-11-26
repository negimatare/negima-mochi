// The lint presets of the stack plugins, run by the real linters on planted
// violations. The kit installs nothing, so each test skips when its linter is
// missing; the Lint presets CI job installs pinned versions and runs them.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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
const skip = (tool, reason) => !tool && !required && reason;

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

test('python preset: Ruff reports each planted violation, and not the composition root or clean code', { skip: skip(ruff, 'Ruff is not installed') }, () => {
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

// The CI job installs ESLint, typescript-eslint and the preset's plugins in
// this folder; the test package is made inside it, so imports resolve there.
const eslintTools = process.env.MOCHI_ESLINT_TOOLS;
const PRESET_RULES = /^(boundaries\/|react-hooks\/|react\/jsx-max-depth$|max-lines$|@griffel\/)/;

// Each preset rule that ESLint reports for each file, as `<rule>:<severity>`
// (1 is warn, 2 is error), in a package whose config spreads the preset.
const eslintRules = (files) => {
  const dir = mkdtempSync(join(eslintTools, 'package-'));
  write(join(dir, 'eslint-mochi.mjs'), readFileSync(join(PLUGINS, 'mochi-react/presets/eslint-mochi.mjs'), 'utf8'));
  write(
    join(dir, 'eslint.config.mjs'),
    "import tseslint from 'typescript-eslint';\nimport mochi from './eslint-mochi.mjs';\n\nexport default [{ files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } }, ...mochi];\n",
  );
  write(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { jsx: 'react-jsx', allowImportingTsExtensions: true, noEmit: true }, include: ['src'] }));
  for (const [path, text] of Object.entries(files)) write(join(dir, path), text);
  const result = spawnSync(join(eslintTools, 'node_modules/.bin/eslint'), ['--format', 'json', 'src'], { cwd: dir, encoding: 'utf8' });
  assert.ok(result.status === 0 || result.status === 1, `${result.stdout}${result.stderr}`);
  const rules = Object.fromEntries(Object.keys(files).map((path) => [path, []]));
  for (const { filePath, messages } of JSON.parse(result.stdout))
    for (const { ruleId, severity } of messages) if (PRESET_RULES.test(ruleId ?? '')) rules[filePath.slice(dir.length + 1)].push(`${ruleId}:${severity}`);
  return rules;
};

const lines = (count) => Array.from({ length: count }, (_, k) => `export const v${k} = ${k};`).join('\n');
const nested = (depth) => `${'<div>'.repeat(depth)}x${'</div>'.repeat(depth)}`;

test('react preset: ESLint reports each planted violation, and not the edges the layers allow', { skip: skip(eslintTools, 'the ESLint tools are not installed') }, () => {
  assert.deepEqual(
    eslintRules({
      'src/main.tsx': "import { App } from './App.tsx';\n\nexport const root = App;\n",
      'src/App.tsx': "import { Orders } from './pages/Orders.tsx';\n\nexport const App = () => <Orders />;\n",
      'src/pages/Orders.tsx': "import { useOrders } from '../features/orders/index.ts';\n\nexport const Orders = () => <p>{useOrders()}</p>;\n",
      'src/features/orders/index.ts': "export { useOrders } from './hooks/useOrders.ts';\n",
      'src/features/orders/hooks/useOrders.ts': "import { bill } from '../../billing/index.ts';\n\nexport const useOrders = () => bill;\n",
      'src/features/billing/index.ts': 'export const bill = 1;\n',
      'src/lib/http.ts': "import { useOrders } from '../features/orders/index.ts';\n\nexport const http = useOrders;\n",
      'src/common/Badge.tsx':
        "import { useEffect, useState } from 'react';\n\nexport function Badge({ first, last }: { first: string; last: string }) {\n  const [label, setLabel] = useState('');\n  useEffect(() => setLabel(`${first} ${last}`), [first, last]);\n  return <span>{label}</span>;\n}\n",
      'src/common/Deep.tsx': `export const Deep = () => ${nested(8)};\n`,
      'src/common/Long.ts': `${lines(205)}\n`,
      'src/common/Long.test.ts': `${lines(205)}\n`,
      'src/common/Card.styles.ts': "import { makeStyles, shorthands } from '@griffel/react';\n\nexport const useStyles = makeStyles({ root: { ...shorthands.padding('4px') } });\n",
    }),
    {
      'src/main.tsx': [],
      'src/App.tsx': [],
      'src/pages/Orders.tsx': [],
      'src/features/orders/index.ts': [],
      'src/features/orders/hooks/useOrders.ts': ['boundaries/dependencies:2'],
      'src/features/billing/index.ts': [],
      'src/lib/http.ts': ['boundaries/dependencies:2'],
      'src/common/Badge.tsx': ['react-hooks/set-state-in-effect:2'],
      'src/common/Deep.tsx': ['react/jsx-max-depth:1'],
      'src/common/Long.ts': ['max-lines:1'],
      'src/common/Long.test.ts': [],
      'src/common/Card.styles.ts': ['@griffel/no-deprecated-shorthands:2'],
    },
  );
});

test('the eval stubs ship the presets of the stack plugins unchanged', () => {
  const evals = join(PLUGINS, 'mochi/evals');
  for (const [stub, preset] of [
    ['../eval-stubs/ruff-stack/presets/ruff-lint.toml', 'mochi-python/presets/ruff-lint.toml'],
    ['../eval-stubs/react-stack/presets/eslint-mochi.mjs', 'mochi-react/presets/eslint-mochi.mjs'],
  ])
    assert.equal(readFileSync(join(evals, stub), 'utf8'), readFileSync(join(PLUGINS, preset), 'utf8'), stub);
});
