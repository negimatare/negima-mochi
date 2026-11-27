// A skill's `paths:` only makes it available; Claude may still not load it.
// This hook adds the full text of the skill its argument names. hooks.json
// runs it once per skill, since Claude Code cuts a hook's context past 10,000
// characters to a short preview. A session that opens in a FastAPI project
// gets the skill up front, since Claude also reads files through Bash, where
// no path is visible to a hook. A session opened elsewhere, such as a monorepo
// root, gets it when Claude reads or writes a file its `paths:` match. Each
// skill is added once per session, and again after compaction.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { isFastApiProject, nearestProjectDir, projectDependsOn } from './stack.mjs';

const name = process.argv[2];
const input = JSON.parse(readFileSync(0, 'utf8'));
const marker = join(tmpdir(), `negima-python-skill-${input.session_id}-${name}`);

const atStart = input.hook_event_name === 'SessionStart';
if (atStart) rmSync(marker, { force: true });
else if (existsSync(marker)) process.exit(0);

const file = input.tool_input?.file_path;
const fromDir = atStart ? input.cwd : file && dirname(file);
const projectDir = fromDir && nearestProjectDir(fromDir);
if (!isFastApiProject(projectDir)) process.exit(0);
const where = atStart ? 'this project' : relative(process.env.CLAUDE_PROJECT_DIR || input.cwd, file);

const globToRegExp = (glob) =>
  new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\//g, '\u0000')
      .replace(/\*\*/g, '\u0001')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/\u0000/g, '(?:.*/)?')
      .replace(/\u0001/g, '.*')}$`,
  );

const skillFile = join(process.env.CLAUDE_PLUGIN_ROOT, 'skills', name, 'SKILL.md');
const [, frontmatter = '', body = ''] = readFileSync(skillFile, 'utf8').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
const pathsBlock = frontmatter.match(/^paths:\n((?:[ \t]+-.*(?:\n|$))+)/m)?.[1] ?? '';
const patterns = [...pathsBlock.matchAll(/-\s*"?([^"\n]+?)"?\s*$/gm)].map((m) => m[1]);
// A library's conventions load only in packages that use the library. The
// value must be one double-quoted, space-separated list; anything else
// skips the skill rather than loading it everywhere.
const metadataBlock = frontmatter.match(/^metadata:\n((?:[ \t]+.*(?:\n|$))+)/m)?.[1] ?? '';
const requiresValue = metadataBlock.match(/^[ \t]+mochi-requires:(.*)$/m)?.[1];
if (requiresValue !== undefined) {
  const packages = requiresValue.trim().match(/^"([\w@/.\- ]+)"$/)?.[1].trim().split(/\s+/);
  if (!packages?.[0] || !projectDependsOn(projectDir, packages)) process.exit(0);
}
if (!atStart && !patterns.some((pattern) => globToRegExp(pattern).test(where))) process.exit(0);

writeFileSync(marker, '');
// The Skill tool resolves `${CLAUDE_PLUGIN_ROOT}` in a skill; this hook does
// too. A replacer function keeps a `$` in the path as it is.
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: `The mochi-python \`${name}\` skill applies to ${where}. Follow it, even where nearby code does otherwise:\n\n${body.trim().replaceAll('${CLAUDE_PLUGIN_ROOT}', () => process.env.CLAUDE_PLUGIN_ROOT)}`,
    },
  }),
);
