// Checks the kit's own rules from CLAUDE.md and CONTRIBUTING.md that have
// an exact answer, so a contributor gets a failing test instead of a review
// note. Each check takes the repository root and returns its problems, one
// line each, with the path to fix.
//
//   node scripts/kit-rules.mjs [repository root]
//     Prints each problem and exits 1, or exits 0 when there is none.
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGINS = ['mochi', 'mochi-react', 'mochi-python'];
// CLAUDE.md: pinned to Sonnet, these cost more in each eval case.
const INHERIT_REVIEWERS = ['correctness', 'test', 'data', 'quick'].map((name) => `plugins/mochi/agents/${name}-reviewer.md`);
// An agent's name, for example 05-032-mendicant-bias or 117649-despondent-pyre.
const AGENT_ID = String.raw`\d+(?:-\d+)?-[a-z]+-[a-z]+`;
// CONTRIBUTING's Tags section: the subject tags of each suite, then the
// tags that any case can have.
const SUBJECT_TAGS = {
  mochi: 'plan build split fix-bug commit pr setup dependencies review refactor tidy correctness tests hygiene data a11y',
  'mochi-react': 'architecture components forms i18n performance state testing conventions a11y',
  'mochi-python': 'architecture domain service-layer api-design openapi persistence testing conventions api-contract',
};
const SHARED_TAGS = ['core', 'smoke'];
// CONTRIBUTING gives the smoke tag to one case in these suites.
const ONE_SMOKE = ['mochi', 'mochi-python'];
const GIT_WORKED = '../../_shared/git-worked.md';
const VERSION_FIX = 'write 1.x.y, or v1.x.y for a tag';

const read = (root, path) => readFileSync(join(root, path), 'utf8');
const list = (root, dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).sort() : []);

// The top-level `key: value` lines between the first two `---` lines.
const frontmatterOf = (text) => {
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

const caseDirs = (root, plugin) =>
  list(root, `plugins/${plugin}/evals`).filter(
    (name) => !name.startsWith('_') && name !== 'results' && lstatSync(join(root, `plugins/${plugin}/evals/${name}`)).isDirectory(),
  );

// The Markdown that readers copy from: the root files, docs/, extras/ and
// the plugins, without the eval cases and the changelog.
const docFiles = (root) => [
  ...list(root, '.').filter((name) => name.endsWith('.md') && name !== 'CHANGELOG.md'),
  ...['docs', 'extras', ...PLUGINS.map((plugin) => `plugins/${plugin}`)]
    .filter((dir) => existsSync(join(root, dir)))
    .flatMap((dir) => markdownFiles(root, dir))
    .filter((path) => !path.includes('/evals/')),
];

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

  evalLayout(root) {
    const problems = [];
    for (const plugin of PLUGINS) {
      const allowed = new Set([...SUBJECT_TAGS[plugin].split(' '), ...SHARED_TAGS]);
      const subjects = new Set(SUBJECT_TAGS[plugin].split(' '));
      let smoke = 0;
      for (const name of caseDirs(root, plugin)) {
        const dir = `plugins/${plugin}/evals/${name}`;
        for (const file of ['prompt.md', 'fixture.sh', 'case.yaml'])
          if (!existsSync(join(root, dir, file))) problems.push(`${dir}: no ${file}.`);
        if (existsSync(join(root, dir, 'case.yaml'))) {
          const caseName = read(root, `${dir}/case.yaml`).match(/^name: *(.*)$/m)?.[1]?.trim();
          if (caseName !== name) problems.push(`${dir}/case.yaml: name is ${caseName ?? 'not set'}, not its folder.`);
        }
        const link = `${dir}/graders/git-worked.md`;
        const isLink = existsSync(join(root, link)) && lstatSync(join(root, link)).isSymbolicLink();
        if (!isLink || readlinkSync(join(root, link)) !== GIT_WORKED) problems.push(`${link}: not a link to ${GIT_WORKED}.`);
        if (!existsSync(join(root, dir, 'prompt.md'))) continue;
        const tags = (read(root, `${dir}/prompt.md`).match(/^tags: *\[(.*)\]$/m)?.[1] ?? '').split(',').map((tag) => tag.trim()).filter(Boolean);
        for (const tag of tags) if (!allowed.has(tag)) problems.push(`${dir}/prompt.md: tag ${tag} is not in CONTRIBUTING's list for ${plugin}.`);
        if (!tags.some((tag) => subjects.has(tag))) problems.push(`${dir}/prompt.md: no subject tag from CONTRIBUTING's list for ${plugin}.`);
        if (tags.includes('smoke')) smoke += 1;
      }
      if (ONE_SMOKE.includes(plugin) && smoke !== 1)
        problems.push(`plugins/${plugin}/evals: ${smoke} cases have the smoke tag; CONTRIBUTING gives it to one.`);
    }
    return problems.sort();
  },

  // CLAUDE.md: a version in a docs example is 1.x.y, and its tag v1.x.y. An
  // example is a code block or a code span; a version in plain text says
  // where a figure came from, and stays.
  docVersions(root) {
    const problems = [];
    for (const path of docFiles(root)) {
      // The marker that opened the code block, until a line closes it.
      let fence;
      read(root, path)
        .split('\n')
        .forEach((line, index) => {
          const marker = line.match(/^\s*(```+|~~~+)/)?.[1];
          if (marker && (!fence || marker.startsWith(fence))) {
            fence = fence ? undefined : marker;
            return;
          }
          const code = fence ? [line] : [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
          for (const text of code)
            for (const [version] of text.matchAll(/\bv?\d+\.\d+\.\d+\b/g))
              problems.push(`${path}:${index + 1}: ${version} in an example; ${VERSION_FIX}.`);
        });
    }
    return problems;
  },

  // CLAUDE.md: a short intro, `### Update` only when users must do a step,
  // one `### <name> plugin` for each changed plugin, then `### For
  // contributors`. Each item starts with a bold lead.
  changelog(root) {
    if (!existsSync(join(root, 'CHANGELOG.md'))) return ['CHANGELOG.md: missing.'];
    const problems = [];
    const rank = (title) => (title === 'Update' ? 0 : PLUGINS.some((plugin) => title === `${plugin} plugin`) ? 1 : title === 'For contributors' ? 2 : -1);
    let release;
    let seen;
    let highest;
    for (const line of read(root, 'CHANGELOG.md').split('\n')) {
      const heading = line.match(/^## (.*)$/);
      if (heading) {
        release = heading[1].match(/^(\d+\.\d+\.\d+) — (?:\d{4}-\d{2}-\d{2}|unreleased)$/)?.[1] ?? heading[1];
        if (release === heading[1]) problems.push(`CHANGELOG.md: "${line}" is not "## X.Y.Z — YYYY-MM-DD" or "— unreleased".`);
        seen = new Set();
        highest = -1;
        continue;
      }
      if (release === undefined) continue;
      const section = line.match(/^### (.*)$/)?.[1];
      if (section !== undefined) {
        const order = rank(section);
        if (order < 0) problems.push(`CHANGELOG.md: in ${release}, "${line}" is not Update, a "<plugin> plugin" or For contributors.`);
        else if (seen.has(section)) problems.push(`CHANGELOG.md: in ${release}, "${line}" appears twice.`);
        else if (order < highest)
          problems.push(
            highest === 2
              ? `CHANGELOG.md: in ${release}, "${line}" comes after For contributors, which is last.`
              : `CHANGELOG.md: in ${release}, "${line}" comes after a plugin section; Update is first.`,
          );
        seen.add(section);
        highest = Math.max(highest, order);
        continue;
      }
      if (/^(- |\d+\. )/.test(line) && !/^(- |\d+\. )\*\*/.test(line))
        problems.push(`CHANGELOG.md: in ${release}, the item "${line}" has no bold lead.`);
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
