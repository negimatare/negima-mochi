// PreToolUse on Bash: turn any command that adds or upgrades a package into a
// permission prompt that points at the dependency policy. Installs that only
// follow the lockfile pass silently.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

// `add` verbs change versions only when they name a package; `upgrade` verbs
// change them even with no argument, which upgrades everything.
const managers = {
  npm: { add: ['install', 'i', 'add'], upgrade: ['update', 'up', 'upgrade'] },
  yarn: { add: ['add'], upgrade: ['up', 'upgrade', 'upgrade-interactive'] },
  pnpm: { add: ['add', 'install', 'i'], upgrade: ['update', 'up', 'upgrade'] },
  bun: { add: ['add', 'install', 'i'], upgrade: ['update'] },
  pip: { add: ['install'], upgrade: [] },
  pip3: { add: ['install'], upgrade: [] },
  poetry: { add: ['add'], upgrade: ['update'] },
  uv: { add: ['add', 'install'], upgrade: [] },
};
// Anything after these runs a project script or a one-off tool, not the manager.
const runners = new Set(['run', 'run-script', 'exec', 'dlx', 'x']);
const isUvUpgradeFlag = (arg) => ['-U', '-P', '--upgrade'].includes(arg) || arg.startsWith('--upgrade-package');

const changesVersions = (part) => {
  const [tool, ...args] = part.trim().split(/\s+/);
  const verbs = managers[tool];
  if (!verbs) return false;
  if (tool === 'uv' && args.some(isUvUpgradeFlag)) return true;
  const verbAt = args.findIndex(
    (arg) => runners.has(arg) || verbs.add.includes(arg) || verbs.upgrade.includes(arg),
  );
  if (verbAt === -1 || runners.has(args[verbAt])) return false;
  if (verbs.upgrade.includes(args[verbAt])) return true;
  return args.slice(verbAt + 1).some((arg) => !arg.startsWith('-'));
};

if (!command.split(/&&|\|\||;|\|/).some(changesVersions)) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason:
        'Adding or upgrading a dependency. Follow the mochi dependencies skill first: prefer what the project already uses, avoid versions published in the last few days, check install scripts, then review the lockfile diff.',
    },
  }),
);
