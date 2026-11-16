// Draws docs/skill-map.svg and docs/skill-map.html: which command runs which
// skill, agent, and convention. The links come from the plugins' own files,
// so the map cannot claim a link the kit does not have; subtitles, conditions,
// and order come from docs/skill-map.notes.json.
//
//   node scripts/skill-map.mjs          write the map; exit 1 if the notes are out of step
//   node scripts/skill-map.mjs --check  write nothing; exit 1 if the map or the notes are stale
//   node scripts/skill-map.mjs --hook   PostToolUse: redraw after an edit under plugins/
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'write';
if (mode === '--hook') {
  let file = '';
  try {
    file = JSON.parse(readFileSync(0, 'utf8')).tool_input?.file_path ?? '';
  } catch {
    process.exit(0);
  }
  // root is a real path, so resolve the edited file the same way: a checkout
  // reached through a symlink would otherwise look like it is outside the repo.
  const real = (path) => {
    try {
      return realpathSync(path);
    } catch {
      return existsSync(dirname(path)) ? join(realpathSync(dirname(path)), basename(path)) : path;
    }
  };
  const rel = relative(root, real(file));
  if (!rel.startsWith('plugins/') && rel !== 'docs/skill-map.notes.json' && rel !== 'scripts/skill-map.mjs') process.exit(0);
  // Only exit 2 reaches Claude, so a failure is reported that way. A skill
  // folder whose SKILL.md is not written yet is a step in progress, not a problem.
  process.on('uncaughtException', (error) => {
    if (error.code === 'ENOENT' && /SKILL\.md$/.test(error.path ?? '')) process.exit(0);
    process.stderr.write(`skill map: ${error.message}\n`);
    process.exit(2);
  });
}

const read = (path) => readFileSync(join(root, path), 'utf8');
const flat = (text) => text.replace(/\s+/g, ' ');
const frontmatter = (text) => Object.fromEntries([...(text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '').matchAll(/^([\w-]+):\s*(.*)$/gm)].map((m) => [m[1], m[2]]));

// ---------- discover nodes
const nodes = new Map();
// A stack plugin's parts carry its name, since two stacks can each have an
// `architecture` skill or a `conventions-reviewer`.
const idOf = (plugin, name) => (plugin === 'mochi' ? name : `${plugin}:${name}`);
const add = (id, node) => {
  if (nodes.has(id)) throw new Error(`two parts of the kit are both called ${id}`);
  nodes.set(id, { id, ...node });
};
const plugins = readdirSync(join(root, 'plugins')).filter((p) => existsSync(join(root, 'plugins', p, '.claude-plugin/plugin.json')));
for (const plugin of plugins) {
  const dir = `plugins/${plugin}`;
  for (const name of existsSync(join(root, dir, 'skills')) ? readdirSync(join(root, dir, 'skills')) : []) {
    const text = read(`${dir}/skills/${name}/SKILL.md`);
    const fm = frontmatter(text);
    const kind = plugin !== 'mochi' ? 'stack' : fm['user-invocable'] === 'false' ? 'shared' : 'command';
    add(idOf(plugin, name), { kind, plugin, name, text, paths: /^paths:/m.test(text) });
  }
  if (existsSync(join(root, dir, 'agents')))
    for (const file of readdirSync(join(root, dir, 'agents')).filter((f) => f.endsWith('.md'))) {
      const text = read(`${dir}/agents/${file}`);
      const name = file.replace(/\.md$/, '');
      add(idOf(plugin, name), { kind: 'agent', plugin, name, text, agentName: frontmatter(text).name });
    }
  if (existsSync(join(root, dir, 'hooks/hooks.json')))
    for (const [, script] of read(`${dir}/hooks/hooks.json`).matchAll(/scripts\/([\w-]+)\.mjs/g))
      if (!nodes.has(idOf(plugin, script))) add(idOf(plugin, script), { kind: 'hook', plugin, name: script, text: read(`${dir}/scripts/${script}.mjs`) });
}

// ---------- detect links
const edges = new Map();
// A name in a file means that part of its own plugin, else the one in mochi.
const link = (from, name) => {
  const to = [idOf(nodes.get(from).plugin, name), name].find((id) => nodes.has(id));
  if (to && to !== from) edges.set(`${from} -> ${to}`, { from, to });
};
for (const node of nodes.values()) {
  const text = flat(node.text);
  for (const [, to] of text.matchAll(/\b(?:run|runs|follow|follows|following)\s+the\s+`([a-z0-9-]+)`\s+skill/gi)) link(node.id, to);
  for (const [, to] of text.matchAll(/\brun\s+`\/mochi:([a-z0-9-]+)`/gi)) link(node.id, to);
  for (const [, to] of text.matchAll(/skills\/([a-z0-9-]+)\/SKILL\.md/g)) link(node.id, to);
  for (const [, name] of text.matchAll(/`[a-z-]+:([0-9][0-9a-z-]*)`/g))
    for (const agent of nodes.values()) if (agent.agentName === name) link(node.id, agent.id);
  if (/reviewer agent from an installed stack plugin/i.test(text))
    for (const agent of nodes.values()) if (agent.kind === 'agent' && agent.plugin !== 'mochi') link(node.id, agent.id);
  if (/load every skill of each installed stack plugin/i.test(text))
    for (const skill of nodes.values()) if (skill.kind === 'stack') link(node.id, skill.id);
  if (node.kind === 'hook') {
    for (const [, to] of text.matchAll(/the mochi ([a-z0-9-]+) skill/gi)) link(node.id, to);
    if (/CLAUDE_PLUGIN_ROOT,\s*'skills'/.test(text))
      for (const skill of nodes.values()) if (skill.plugin === node.plugin && skill.paths) link(node.id, skill.id);
  }
}
// Links to every skill of a stack plugin are drawn as one link to its group.
const stackPlugins = [...new Set([...nodes.values()].filter((n) => n.kind === 'stack').map((n) => n.plugin))];
for (const plugin of stackPlugins) {
  const members = [...nodes.values()].filter((n) => n.kind === 'stack' && n.plugin === plugin).map((n) => n.id);
  for (const from of new Set([...edges.values()].map((e) => e.from))) {
    if (members.every((m) => edges.has(`${from} -> ${m}`))) {
      members.forEach((m) => edges.delete(`${from} -> ${m}`));
      edges.set(`${from} -> @${plugin}`, { from, to: `@${plugin}` });
    }
  }
}
// A hook that loads only the stack skills with paths: is drawn to the group too.
for (const e of [...edges.values()])
  if (nodes.get(e.from).kind === 'hook' && nodes.get(e.to)?.kind === 'stack') {
    edges.delete(`${e.from} -> ${e.to}`);
    edges.set(`${e.from} -> @${nodes.get(e.to).plugin}`, { from: e.from, to: `@${nodes.get(e.to).plugin}` });
  }
// Hooks that run nothing in the kit stay off the map.
for (const node of [...nodes.values()]) if (node.kind === 'hook' && ![...edges.values()].some((e) => e.from === node.id)) nodes.delete(node.id);

// ---------- check the notes against what the files say
const notesPath = 'docs/skill-map.notes.json';
let notes;
if (!existsSync(join(root, notesPath))) throw new Error(`${notesPath} is missing`);
try {
  notes = JSON.parse(read(notesPath));
} catch (error) {
  throw new Error(`${notesPath} is not valid JSON: ${error.message}`);
}
const problems = [];
for (const node of nodes.values()) if (node.kind !== 'stack' && !notes.nodes[node.id]?.sub) problems.push(`${notesPath}: add a "sub" for ${node.id} under "nodes"`);
for (const id of Object.keys(notes.nodes)) if (!nodes.has(id)) problems.push(`${notesPath}: remove "${id}" from "nodes"; the kit has no such part`);
for (const key of edges.keys()) if (!(key in notes.edges)) problems.push(`${notesPath}: describe the link "${key}" under "edges" ({} if it always runs)`);
for (const key of Object.keys(notes.edges)) if (!edges.has(key)) problems.push(`${notesPath}: remove the link "${key}"; no file says it anymore`);
// A stack's skill loader runs once per skill, since Claude Code cuts a hook's
// context past 10,000 characters: each skill needs a run on both events, and
// must fit.
for (const plugin of stackPlugins) {
  const hooksPath = `plugins/${plugin}/hooks/hooks.json`;
  if (!existsSync(join(root, hooksPath))) continue;
  const { hooks = {} } = JSON.parse(read(hooksPath));
  const loads = (event) => (hooks[event] ?? []).flatMap((group) => group.hooks).map((hook) => hook.command.match(/inject-matching-skills\.mjs (\S+)$/)?.[1]).filter(Boolean);
  const skills = [...nodes.values()].filter((n) => n.kind === 'stack' && n.plugin === plugin);
  for (const event of ['SessionStart', 'PostToolUse']) {
    for (const skill of skills) if (!loads(event).includes(skill.name)) problems.push(`${hooksPath}: run inject-matching-skills.mjs ${skill.name} on ${event}`);
    for (const name of loads(event)) if (!skills.some((s) => s.name === name)) problems.push(`${hooksPath}: ${event} loads ${name}, which is not a ${plugin} skill`);
  }
  for (const skill of skills) {
    const length = skill.text.replace(/^---\n[\s\S]*?\n---\n/, '').trim().length;
    if (length > 9800) problems.push(`plugins/${plugin}/skills/${skill.name}/SKILL.md: ${length} characters; the loader's context is cut at 10,000, so keep it under 9,800`);
  }
}
const columns = { command: [], shared: [], agent: [], hook: [] };
for (const [kind, order] of Object.entries(notes.order)) columns[kind] = order.filter((id) => nodes.has(id));
for (const node of nodes.values()) if (node.kind in columns && !columns[node.kind].includes(node.id)) problems.push(`${notesPath}: place ${node.id} in "order.${node.kind}"`);
const report = () => {
  process.stderr.write(`skill map:\n${problems.map((p) => `- ${p}`).join('\n')}\n`);
  process.exit(mode === '--hook' ? 2 : 1);
};
if (problems.length) report();

// ---------- layout
const COLOURS = [['#2a78d6', '#3987e5'], ['#eb6834', '#d95926'], ['#1baf7a', '#199e70'], ['#eda100', '#c98500'], ['#e87ba4', '#d55181'], ['#008300', '#008300'], ['#6250d6', '#9085e9'], ['#e34948', '#e66767']];
if (columns.command.length > COLOURS.length) problems.push(`more than ${COLOURS.length} commands: the palette has no colour left`);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const box = new Map();
const [X0, W0, X1, W1, X2, W2, TOP] = [70, 210, 430, 230, 840, 210, 96];
let y = TOP;
for (const id of columns.command) box.set(id, [X0, y, W0, 52]), (y += 70);
const groups = [{ label: 'Commands you type', tone: 'blue', ids: columns.command }];
let y1 = TOP;
for (const [kind, label, tone] of [['shared', 'Shared skills, never typed', 'green'], ['agent', 'Agents', 'orange'], ['hook', 'Hooks, during any command', 'grey']]) {
  for (const id of columns[kind]) box.set(id, [X1, y1, W1, 44]), (y1 += 54);
  groups.push({ label, tone, ids: columns[kind] });
  y1 += 54;
}
let y2 = TOP;
const stackBox = new Map();
for (const plugin of stackPlugins) {
  const ids = [...nodes.values()].filter((n) => n.kind === 'stack' && n.plugin === plugin).map((n) => n.id).sort();
  for (const id of ids) box.set(id, [X2, y2, W2, 36]), (y2 += 46);
  groups.push({ label: `${plugin} conventions`, tone: 'red', ids, plugin });
  y2 += 54;
}
const groupRect = (ids) => {
  const rects = ids.map((id) => box.get(id));
  const top = Math.min(...rects.map((r) => r[1])), bottom = Math.max(...rects.map((r) => r[1] + r[3]));
  return [rects[0][0] - 14, top - 40, rects[0][2] + 28, bottom - top + 54];
};
for (const g of groups) if (g.plugin) stackBox.set(`@${g.plugin}`, groupRect(g.ids));
const colourOf = (id) => (columns.command.includes(id) ? id : 'shared');
const paths = [];
let lane = 52;
for (const [key, { from, to }] of edges) {
  const [sx, sy, sw, sh] = box.get(from);
  const fy = sy + sh / 2, fr = sx + sw;
  const note = notes.edges[key] ?? {};
  let d;
  if (to.startsWith('@')) {
    const [gx, gy, , gh] = stackBox.get(to);
    if (sx === X0) {
      d = `M${fr} ${fy} C${fr + 60} ${fy}, ${fr + 40} ${lane}, ${fr + 110} ${lane} L${X1 + W1 + 40} ${lane} C${X1 + W1 + 120} ${lane}, ${gx - 60} ${gy + 30}, ${gx - 4} ${gy + 30}`;
      lane -= 12;
    } else d = `M${fr} ${fy} C${fr + 80} ${fy}, ${gx - 80} ${gy + gh / 2}, ${gx - 4} ${gy + gh / 2}`;
  } else {
    const [tx, ty0, , th] = box.get(to);
    const ty = ty0 + th / 2;
    // A longer arc bows wider, so two arcs beside one column do not overlap.
    const bow = 50 + Math.abs(ty - fy) / 8;
    const tr = tx + box.get(to)[2];
    if (tx === sx && sx === X0) d = `M${sx} ${fy} C${sx - 55} ${fy}, ${sx - 55} ${ty}, ${sx - 4} ${ty}`;
    else if (tx < sx) d = `M${sx} ${fy} C${sx - 90} ${fy}, ${tr + 90} ${ty}, ${tr + 4} ${ty}`;
    else if (tx === sx) d = `M${fr} ${fy} C${fr + bow} ${fy}, ${fr + bow} ${ty}, ${fr + 4} ${ty}`;
    else d = `M${fr} ${fy} C${fr + 90} ${fy}, ${tx - 90} ${ty}, ${tx - 4} ${ty}`;
  }
  const target = to.startsWith('@') ? `every ${to.slice(1)} convention` : title(to);
  paths.push({ d, colour: colourOf(from), conditional: Boolean(note.when), text: `${title(from)} → ${target}${note.when ? ` (when ${note.when})` : note.note ? ` (${note.note})` : ''}` });
}
function title(id) {
  const node = nodes.get(id);
  if (node.kind === 'command') return `/mochi:${id}`;
  return notes.nodes[id]?.title ?? (node.kind === 'agent' ? node.name.replace(/-/g, ' ') : node.name);
}
const height = Math.max(...[...box.values()].map(([, by, , bh]) => by + bh)) + 40;

const nodeSvg = (id) => {
  const node = nodes.get(id);
  const [x, by, w, h] = box.get(id);
  const isCommand = node.kind === 'command';
  const sub = node.kind === 'stack' ? '' : (notes.nodes[id]?.sub ?? '') + (node.kind === 'agent' && node.plugin !== 'mochi' ? ` · ${node.plugin}` : '');
  const tx = x + (isCommand ? 30 : 14);
  const [t1, t2] = sub ? [by + h / 2 - 3, by + h / 2 + 13] : [by + h / 2 + 5, 0];
  const attrs = isCommand ? ` data-cmd="${id}" tabindex="0" role="button" aria-label="Highlight what /mochi:${id} uses"` : '';
  return `<g class="n n-${node.kind}"${attrs}><rect class="node" x="${x}" y="${by}" width="${w}" height="${h}" rx="9"/>${isCommand ? `<circle class="dot" cx="${x + 16}" cy="${by + h / 2}" r="6" style="fill:var(--c-${id})"/>` : ''}<text class="t1" x="${tx}" y="${t1}">${esc(title(id))}</text>${sub ? `<text class="t2" x="${tx}" y="${t2}">${esc(sub)}</text>` : ''}</g>`;
};
const colourKeys = [...columns.command, 'shared'];
const svgBody = [
  `<defs>${colourKeys.map((k) => `<marker id="ah-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="ah-${k}" d="M0 0L10 5L0 10z"/></marker>`).join('')}</defs>`,
  ...groups.filter((g) => g.ids.length).map((g) => {
    const [gx, gy, gw, gh] = g.plugin ? stackBox.get(`@${g.plugin}`) : groupRect(g.ids);
    return `<rect class="grp grp-${g.tone}" x="${gx}" y="${gy}" width="${gw}" height="${gh}" rx="14"/><text class="tg tg-${g.tone}" x="${gx + 16}" y="${gy + 24}">${esc(g.label.toUpperCase())}</text>`;
  }),
  ...paths.map((p) => `<path class="edge e-${p.colour}${p.conditional ? ' cond' : ''}" data-cmd="${p.colour}" d="${p.d}" marker-end="url(#ah-${p.colour})"><title>${esc(p.text)}</title></path>`),
  ...[...box.keys()].map(nodeSvg),
].join('\n');
const colourVars = (i) => columns.command.map((id, n) => `--c-${id}: ${COLOURS[n][i]};`).join(' ');
const MAP_CSS = `
.edge { fill: none; stroke-width: 1.8; transition: opacity .15s; }
.edge.cond { stroke-dasharray: 5 4; }
.e-shared { stroke: var(--text-3); } .ah-shared { fill: var(--text-3); }
${columns.command.map((id) => `.e-${id} { stroke: var(--c-${id}); } .ah-${id} { fill: var(--c-${id}); }`).join('\n')}
.dot { stroke: var(--surface); stroke-width: 2; }`;
const planCss = read('plugins/mochi/skills/plan/assets/plan-view.css');
const tokens = planCss.slice(0, planCss.indexOf('body {'));
const diagramCss = planCss.split('\n').filter((line) => line.startsWith('.diagram .')).map((line) => line.replace('.diagram ', '')).join('\n');
const desc = esc(paths.map((p) => `${p.text}.`).join(' '));
const viewBox = `0 0 1110 ${height}`;

const svgFile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="1110" height="${height}" role="img" aria-labelledby="t d">
<title id="t">Negima Mochi: which command uses what</title>
<desc id="d">${desc}</desc>
<style>
${tokens.replace(/:root/g, 'svg')}
svg { ${colourVars(0)} font-family: var(--font); }
@media (prefers-color-scheme: dark) { svg { ${colourVars(1)} } }
${diagramCss}
${MAP_CSS}
.bg { fill: var(--surface); }
</style>
<rect class="bg" width="100%" height="100%" rx="12"/>
${svgBody}
</svg>
`;

const rows = columns.command.map((id) => {
  const uses = [...edges.values()].filter((e) => e.from === id).map((e) => {
    const note = notes.edges[`${e.from} -> ${e.to}`] ?? {};
    const target = e.to.startsWith('@') ? `every ${e.to.slice(1)} convention` : title(e.to);
    return `${esc(target)}${note.when ? ` <span class="cond-note">(when ${esc(note.when)})</span>` : note.note ? ` <span class="cond-note">(${esc(note.note)})</span>` : ''}`;
  });
  return `<tr><th scope="row"><code>/mochi:${id}</code></th><td>${uses.join('<br>')}</td></tr>`;
});
const htmlFile = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Negima Mochi: which command uses what</title>
<style>
${planCss}
:root { ${colourVars(0)} }
@media (prefers-color-scheme: dark) { :root { ${colourVars(1)} } }
${MAP_CSS}
.n-command { cursor: pointer; } .n-command:focus { outline: none; } .n-command:focus .node { stroke: var(--accent); stroke-width: 2.4; }
svg.focused .edge { opacity: .1; } svg.focused .edge.on { opacity: 1; stroke-width: 2.6; } svg.focused .n-command:not(.on) { opacity: .45; }
.diagram svg { max-width: 1110px; }
.legend { display: flex; flex-wrap: wrap; gap: 20px; margin: 6px 0 0; color: var(--text-2); font-size: .85rem; }
.legend svg { margin-right: 6px; vertical-align: middle; }
table.map { width: 100%; margin-top: 8px; border-collapse: collapse; font-size: .9rem; }
table.map th, table.map td { padding: 8px 10px; border-top: 1px solid var(--border-soft); text-align: left; vertical-align: top; }
table.map th { width: 1%; white-space: nowrap; }
.cond-note { color: var(--text-2); }
</style>
</head>
<body>
<main>
<header class="hero">
  <div class="eyebrow">Negima Mochi</div>
  <h1>Which command uses what</h1>
  <p class="note">Drawn from the plugins' own files by <code>scripts/skill-map.mjs</code>. Hover or focus a command to see only what it uses.</p>
</header>
<section class="block" id="map">
  <div class="eyebrow">Map</div>
  <h2>Commands, the skills and agents they run, and the conventions</h2>
  <p class="legend"><span><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="var(--text-2)" stroke-width="2"/></svg>always</span><span><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="var(--text-2)" stroke-width="2" stroke-dasharray="5 4"/></svg>only when a condition holds (hover a line for it)</span><span>Grey lines start from a shared skill, an agent, or a hook.</span></p>
  <div class="diagram" role="img" aria-labelledby="m-title m-desc">
  <svg id="map-svg" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
    <title id="m-title">Which command uses what</title>
    <desc id="m-desc">${desc}</desc>
${svgBody}
  </svg>
  </div>
</section>
<section class="block" id="table">
  <div class="eyebrow">Table</div>
  <h2>What each command runs directly</h2>
  <table class="map"><tbody>${rows.join('')}</tbody></table>
</section>
</main>
<script>
const svg = document.getElementById("map-svg");
const focus = (cmd) => {
  svg.classList.toggle("focused", Boolean(cmd));
  svg.querySelectorAll(".edge").forEach((e) => e.classList.toggle("on", e.dataset.cmd === cmd));
  svg.querySelectorAll(".n-command").forEach((n) => n.classList.toggle("on", n.dataset.cmd === cmd));
};
svg.querySelectorAll(".n-command").forEach((n) => {
  n.addEventListener("mouseenter", () => focus(n.dataset.cmd));
  n.addEventListener("mouseleave", () => focus(null));
  n.addEventListener("focus", () => focus(n.dataset.cmd));
  n.addEventListener("blur", () => focus(null));
});
</script>
</body>
</html>
`;

// ---------- write or check
const outputs = { 'docs/skill-map.svg': svgFile, 'docs/skill-map.html': htmlFile };
if (mode === '--check') {
  for (const [path, text] of Object.entries(outputs))
    if (!existsSync(join(root, path)) || read(path) !== text) problems.push(`${path} is out of date: run node scripts/skill-map.mjs`);
} else for (const [path, text] of Object.entries(outputs)) writeFileSync(join(root, path), text);

if (problems.length) report();
