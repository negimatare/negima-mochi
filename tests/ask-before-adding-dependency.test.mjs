import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../plugins/mochi/scripts/ask-before-adding-dependency.mjs', import.meta.url));

const decide = (command) => {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.permissionDecision : 'silent';
};

test('a command that adds or upgrades a package asks', () => {
  for (const command of [
    'npm install zod',
    'npm i -D vitest',
    'pnpm add date-fns',
    'yarn add react-hook-form',
    'bun add hono',
    'pip install requests',
    'poetry add httpx',
    'uv add fastapi',
    'npm update',
    'yarn up',
    'poetry update',
    'uv pip install -U pydantic',
    'uv lock --upgrade-package ruff',
    'cd web && npm install zod',
    'npm test; pnpm add lodash',
  ]) {
    assert.equal(decide(command), 'ask', command);
  }
});

test('an install from the lockfile, a script or another tool is silent', () => {
  for (const command of [
    'npm install',
    'npm ci',
    'pnpm install --frozen-lockfile',
    'yarn',
    'uv sync',
    'npm run build',
    'npm test',
    'pnpm exec eslint .',
    'pnpm dlx create-vite',
    'npx tsc --noEmit',
    'git status',
  ]) {
    assert.equal(decide(command), 'silent', command);
  }
});
