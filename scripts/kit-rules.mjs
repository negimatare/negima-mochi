// Checks the kit's own rules from CLAUDE.md and CONTRIBUTING.md that have
// an exact answer, so a contributor gets a failing test instead of a review
// note. Each check takes the repository root and returns its problems, one
// line each, with the path to fix.
//
//   node scripts/kit-rules.mjs [repository root]
//     Prints each problem and exits 1, or exits 0 when there is none.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGINS = ['mochi', 'mochi-react', 'mochi-python'];
// CLAUDE.md: pinned to Sonnet, these cost more in each eval case.
const INHERIT_REVIEWERS = ['correctness', 'test', 'data', 'quick'].map((name) => `plugins/mochi/agents/${name}-reviewer.md`);
// An agent's name, for example 05-032-mendicant-bias or 117649-despondent-pyre.
const AGENT_ID = String.raw`\d+(?:-\d+)?-[a-z]+-[a-z]+`;

const read = (root, path) => readFileSync(join(root, path), 'utf8');
const list = (root, dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).sort() : []);

// The top-level `key: value` lines between the first two `---` lines.
export const frontmatterOf = (text) => {
  const block = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
  if (block === undefined) return undefined;
  return Object.fromEntries([...block.matchAll(/^([\w-]+):[ \t]*(.*)$/gm)].map(([, key, value]) => [key, value.trim()]));
};

const skillFiles = (root) =>
  PLUGINS.flatMap((plugin) =>
    list(root, `plugins/${plugin}/skills`)
      .map((name) => `plugins/${plugin}/skills/${name}/SKILL.md`)
      .filter((path) => existsSync(join(root, path))),
  );
const agentFiles = (root) =>
  PLUGINS.flatMap((plugin) =>
    list(root, `plugins/${plugin}/agents`)
      .filter((name) => name.endsWith('.md'))
      .map((name) => `plugins/${plugin}/agents/${name}`),
  );
const graderFiles = (root) =>
  PLUGINS.flatMap((plugin) =>
    list(root, `plugins/${plugin}/evals`).flatMap((name) =>
      list(root, `plugins/${plugin}/evals/${name}/graders`)
        .filter((file) => file.endsWith('.md'))
        .map((file) => `plugins/${plugin}/evals/${name}/graders/${file}`),
    ),
  );
// Every Markdown file of a plugin, eval cases included.
const markdownFiles = (root, dir) =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === 'results' ? [] : markdownFiles(root, path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });

const agentNames = (root) =>
  new Map(PLUGINS.map((plugin) => [plugin, new Set(agentFiles(root).filter((path) => path.startsWith(`plugins/${plugin}/`)).map((path) => frontmatterOf(read(root, path))?.name))]));

export const checks = {
  modelPins(root) {
    return INHERIT_REVIEWERS.flatMap((path) => {
      if (!existsSync(join(root, path))) return [`${path}: missing; CLAUDE.md keeps this reviewer on inherit.`];
      const model = frontmatterOf(read(root, path))?.model;
      return model === 'inherit' ? [] : [`${path}: model is ${model ?? 'not set'}; CLAUDE.md keeps this reviewer on inherit.`];
    });
  },

  manifests(root) {
    const parse = (path) => {
      try {
        return [JSON.parse(read(root, path)), []];
      } catch (error) {
        return [undefined, [`${path}: not valid JSON (${error.message}).`]];
      }
    };
    const [marketplace, problems] = parse('.claude-plugin/marketplace.json');
    if (!marketplace) return problems;
    const versions = new Map();
    for (const entry of marketplace.plugins ?? []) {
      const path = `${entry.source.replace(/^\.\//, '')}/.claude-plugin/plugin.json`;
      const [manifest, errors] = parse(path);
      problems.push(...errors);
      if (!manifest) continue;
      if (manifest.name !== entry.name) problems.push(`${path}: name ${manifest.name}, but the marketplace calls it ${entry.name}.`);
      versions.set(path, manifest.version);
    }
    const counts = [...versions.values()].reduce((map, version) => map.set(version, (map.get(version) ?? 0) + 1), new Map());
    const usual = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    for (const [path, version] of versions)
      if (version !== usual) problems.push(`${path}: version ${version}, but the other plugins have ${usual}. A release sets one version.`);
    return problems;
  },

  frontmatter(root) {
    const problems = [];
    for (const path of [...skillFiles(root), ...agentFiles(root)]) {
      const fields = frontmatterOf(read(root, path));
      if (!fields) {
        problems.push(`${path}: no frontmatter.`);
        continue;
      }
      for (const key of ['name', 'description']) if (!fields[key]) problems.push(`${path}: no ${key} in the frontmatter.`);
      const folder = path.match(/skills\/([^/]+)\/SKILL\.md$/)?.[1];
      if (folder && fields.name && fields.name !== folder) problems.push(`${path}: name is ${fields.name}, not its folder ${folder}.`);
    }
    return problems.sort();
  },

  agentRefs(root) {
    const names = agentNames(root);
    const all = new Set([...names.values()].flatMap((set) => [...set]));
    const problems = [];
    for (const plugin of PLUGINS)
      for (const path of markdownFiles(root, `plugins/${plugin}`))
        for (const [ref, owner, id] of read(root, path).matchAll(new RegExp(String.raw`\b(mochi(?:-react|-python)?):(${AGENT_ID})\b`, 'g')))
          if (!names.get(owner)?.has(id)) problems.push(`${path}: ${ref} is no agent of ${owner}.`);
    // A grader that checks which agent ran names it without the plugin.
    for (const path of graderFiles(root)) {
      const text = read(root, path);
      if (!/^tool: Agent$/m.test(text)) continue;
      const match = text.match(/^input_match: (.*)$/m)?.[1] ?? '';
      for (const [id] of match.matchAll(new RegExp(AGENT_ID, 'g')))
        if (!all.has(id) && !text.includes(`mochi:${id}`)) problems.push(`${path}: ${id} is no agent's name.`);
    }
    return problems.sort();
  },
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? '.';
  const problems = Object.values(checks).flatMap((check) => check(root));
  for (const problem of problems) console.error(problem);
  process.exit(problems.length ? 1 : 0);
}
