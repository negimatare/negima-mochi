// Renders .plans/<date>-<slug>.html from the plan's "## Data flow" steps and the
// layout in .plans/<date>-<slug>.view.json (see references/plan-view.md). The model
// decides what the diagram says and which grid cell each card sits in; this
// script owns every coordinate, so each plan's diagram looks the same.
// Usage: node plan-view.mjs .plans/<date>-<slug>.md
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const STYLE = readFileSync(new URL('../assets/plan-view.css', import.meta.url), 'utf8').trimEnd();

const fail = (message) => {
  process.stderr.write(`plan-view: ${message}\n`);
  process.exit(1);
};

const planPath = process.argv[2];
if (!planPath?.endsWith('.md') || !existsSync(planPath)) fail('usage: node plan-view.mjs .plans/<date>-<slug>.md');
const specPath = planPath.replace(/\.md$/, '.view.json');
const outPath = planPath.replace(/\.md$/, '.html');
if (!existsSync(specPath)) fail(`${specPath} is missing`);
const plan = readFileSync(planPath, 'utf8');
let spec;
try {
  spec = JSON.parse(readFileSync(specPath, 'utf8'));
} catch (error) {
  fail(`${specPath} is not valid JSON: ${error.message}`);
}

const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inline = (text) => esc(text).replace(/`([^`]+)`/g, '<code>$1</code>');

const title = plan.match(/^# (.+)$/m)?.[1] ?? planPath;
const flowSection = plan.match(/^## Data flow\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? '';
const steps = flowSection.split('\n').reduce((list, line) => {
  if (/^\d+\.\s/.test(line)) list.push(line.replace(/^\d+\.\s+/, ''));
  else if (list.length && /^\s+\S/.test(line)) list[list.length - 1] += ` ${line.trim()}`;
  return list;
}, []);

// The card size and padding are the design's own. A column gap fits a
// two-word arrow label between two groups' borders; a row gap fits the next
// group's label above its first card.
const NODE_W = 272;
const GAP_X = 150;
const GAP_Y = 64;
const PAD = 20;
const LABEL_H = 26;
const MARGIN = 16;
const wrapText = (text, maxChars) =>
  String(text).split(' ').reduce((lines, word) => {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
    return lines;
  }, []);
const TONES = ['blue', 'green', 'orange', 'red', 'grey'];

const renderFlow = (flow) => {
  const groups = new Map((flow.groups ?? []).map((g) => [g.id, g]));
  const nodes = flow.nodes ?? [];
  const byId = new Map();
  const cells = new Map();
  for (const node of nodes) {
    if (!node.id || byId.has(node.id)) fail(`every node needs a unique id (${node.id})`);
    if (!Number.isInteger(node.col) || !Number.isInteger(node.row) || node.col < 0 || node.row < 0)
      fail(`node ${node.id} needs whole-number col and row from 0`);
    const cell = `${node.col},${node.row}`;
    if (cells.has(cell)) fail(`nodes ${cells.get(cell)} and ${node.id} share cell ${cell}`);
    cells.set(cell, node.id);
    if (node.group && !groups.has(node.group)) fail(`node ${node.id} names unknown group ${node.group}`);
    // Wrap widths are the characters that fit in a card at each font's
    // average glyph width: 14px bold titles, 12px lines, 11px monospace.
    const titleLines = wrapText(node.title ?? node.id, 30);
    const textLines = (node.lines ?? []).flatMap((line) => wrapText(line, 40));
    const codeLines = node.code ? wrapText(node.code, 38) : [];
    byId.set(node.id, { ...node, titleLines, textLines, codeLines, h: 27 + 17 * titleLines.length + 20 * (textLines.length + codeLines.length) });
  }
  for (const group of groups.values()) if (group.tone && !TONES.includes(group.tone)) fail(`group ${group.id} tone must be one of ${TONES.join(', ')}`);

  const rowCount = Math.max(...nodes.map((n) => n.row)) + 1;
  const rowH = Array.from({ length: rowCount }, (_, r) => Math.max(0, ...[...byId.values()].filter((n) => n.row === r).map((n) => n.h)));
  const rowTop = rowH.reduce((tops, h, r) => [...tops, r === 0 ? MARGIN + LABEL_H + PAD : tops[r - 1] + rowH[r - 1] + GAP_Y], []);
  for (const node of byId.values()) {
    node.x = MARGIN + PAD + node.col * (NODE_W + GAP_X);
    node.y = rowTop[node.row];
  }

  const boxes = [...groups.values()].map((group) => {
    const members = [...byId.values()].filter((n) => n.group === group.id);
    if (!members.length) fail(`group ${group.id} has no nodes`);
    const x = Math.min(...members.map((n) => n.x)) - PAD;
    const y = Math.min(...members.map((n) => n.y)) - PAD - LABEL_H;
    const w = Math.max(...members.map((n) => n.x + NODE_W)) + PAD - x;
    const h = Math.max(...members.map((n) => n.y + n.h)) + PAD - y;
    return { group, x, y, w, h, members };
  });
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  boxes.forEach((a, i) =>
    boxes.slice(i + 1).forEach((b) => {
      if (overlaps(a, b)) fail(`groups ${a.group.id} and ${b.group.id} overlap; give each group its own columns or rows`);
    }),
  );
  for (const box of boxes)
    for (const node of byId.values())
      if (node.group !== box.group.id && overlaps(box, { x: node.x, y: node.y, w: NODE_W, h: node.h }))
        fail(`node ${node.id} sits inside group ${box.group.id}'s box; move it out or into the group`);

  const edges = flow.edges ?? [];
  const pairs = new Set(edges.map((e) => `${e.from}>${e.to}`));
  const paths = edges.map((edge) => {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) fail(`edge ${edge.from}→${edge.to} names an unknown node`);
    // A request and its response between the same cards are drawn as two
    // parallel arrows, 28px apart, so each keeps its own label.
    const twin = pairs.has(`${edge.to}>${edge.from}`);
    const shift = twin ? (edge.from < edge.to ? -14 : 14) : 0;
    let points;
    if (a.row === b.row) {
      const y = a.y + Math.min(a.h, b.h) / 2 + shift;
      points = a.col < b.col ? [[a.x + NODE_W, y], [b.x - 4, y]] : [[a.x, y], [b.x + NODE_W + 4, y]];
    } else if (a.col === b.col) {
      const x = a.x + NODE_W / 2 + shift;
      points = a.row < b.row ? [[x, a.y + a.h], [x, b.y - 4]] : [[x, a.y], [x, b.y + b.h + 4]];
    } else {
      const right = a.col < b.col;
      const midX = right ? b.x - GAP_X / 2 : b.x + NODE_W + GAP_X / 2;
      const ya = a.y + a.h / 2 + shift;
      const yb = b.y + b.h / 2 + shift;
      points = [[right ? a.x + NODE_W : a.x, ya], [midX, ya], [midX, yb], [right ? b.x - 4 : b.x + NODE_W + 4, yb]];
    }
    for (const node of byId.values()) {
      if (node === a || node === b) continue;
      const hit = points.slice(1).some(([x2, y2], i) => {
        const [x1, y1] = points[i];
        return Math.max(x1, x2) > node.x && Math.min(x1, x2) < node.x + NODE_W && Math.max(y1, y2) > node.y && Math.min(y1, y2) < node.y + node.h;
      });
      if (hit) fail(`edge ${edge.from}→${edge.to} crosses node ${node.id}; move one of them so the arrow has a clear path`);
    }
    const segments = points.slice(1).map((p, i) => [points[i], p]);
    const [[x1, y1], [x2, y2]] = segments.reduce((best, s) =>
      Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) > Math.hypot(best[1][0] - best[0][0], best[1][1] - best[0][1]) ? s : best,
    );
    // A bent arrow runs through the gap between groups, too narrow for a label
    // beside it, so its label sits on the line with a halo instead.
    const bent = points.length > 2;
    const label = !edge.label
      ? ''
      : bent
        ? `<text class="al al-halo" text-anchor="middle" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 4}">${esc(edge.label)}</text>`
        : y1 === y2
          ? `<text class="al" text-anchor="middle" x="${(x1 + x2) / 2}" y="${shift > 0 ? y1 + 18 : y1 - 8}">${esc(edge.label)}</text>`
          : `<text class="al" x="${x1 + 8}" y="${(y1 + y2) / 2 + 4}">${esc(edge.label)}</text>`;
    const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
    return { svg: `<path class="ln${edge.outside ? ' ln-dash' : ''}" d="${d}" marker-end="url(#ah)"/>${label}`, xs: points.map((p) => p[0]), ys: points.map((p) => p[1]) };
  });

  const nodeSvg = [...byId.values()].map((n) => {
    let y = n.y + 9;
    const text = [
      ...n.titleLines.map((line) => `<text class="t1" x="${n.x + 14}" y="${(y += 17)}">${esc(line)}</text>`),
      ...n.codeLines.map((line, i) => `<text class="t2 mono" x="${n.x + 14}" y="${(y += i === 0 ? 21 : 20)}">${esc(line)}</text>`),
      ...n.textLines.map((line, i) => `<text class="t2" x="${n.x + 14}" y="${(y += i === 0 && !n.codeLines.length ? 21 : 20)}">${esc(line)}</text>`),
    ];
    return `<rect class="node${n.outside ? ' node-ext' : ''}" x="${n.x}" y="${n.y}" width="${NODE_W}" height="${n.h}" rx="9"/>${text.join('')}`;
  });
  const groupSvg = boxes.map(
    ({ group, x, y, w, h }) =>
      `<rect class="grp grp-${group.tone ?? 'grey'}" x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/><text class="tg tg-${group.tone ?? 'grey'}" x="${x + 20}" y="${y + 26}">${esc(String(group.label ?? group.id).toUpperCase())}</text>`,
  );
  const width = Math.max(...boxes.map((b) => b.x + b.w), ...[...byId.values()].map((n) => n.x + NODE_W), ...paths.flatMap((p) => p.xs)) + MARGIN;
  const height = Math.max(...boxes.map((b) => b.y + b.h), ...[...byId.values()].map((n) => n.y + n.h), ...paths.flatMap((p) => p.ys)) + MARGIN;
  const desc = edges.map((e) => `${byId.get(e.from).title ?? e.from} to ${byId.get(e.to).title ?? e.to}${e.label ? `: ${e.label}` : ''}.`).join(' ');
  const hasOutside = nodes.some((n) => n.outside) || edges.some((e) => e.outside);
  const note = flow.note ?? (hasOutside ? 'Solid boxes and arrows are in this plan. Dashed grey ones are not.' : '');
  return `<section class="block" id="architecture">
  <div class="eyebrow">Architecture</div>
  <h2>Data flow</h2>
  ${note ? `<p class="note">${inline(note)}</p>` : ''}
  <div class="diagram" role="img" aria-labelledby="dg-title dg-desc">
  <svg viewBox="0 0 ${width} ${height}" style="max-width: ${width}px; min-width: ${Math.min(680, width)}px" xmlns="http://www.w3.org/2000/svg">
    <title id="dg-title">Data flow</title>
    <desc id="dg-desc">${esc(desc)}</desc>
    <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0 0L10 5L0 10z"/></marker></defs>
    ${[...groupSvg, ...nodeSvg, ...paths.map((p) => p.svg)].join('\n    ')}
  </svg>
  </div>
  ${steps.length ? `<ol class="flow-steps">${steps.map((s) => `<li>${inline(s)}</li>`).join('')}</ol>` : ''}
</section>`;
};

// Each screen renders in its own shadow root, so the product's real class
// names and token definitions neither leak into the page nor pick up its styles.
const renderScreens = (mocks) => {
  const css = mocks.css ?? '';
  const screens = mocks.screens ?? [];
  if (/<script|<\/style/i.test(css)) fail('mocks.css must be plain CSS');
  const figure = (kind, view) => {
    if (/<script/i.test(view.html ?? '')) fail('mock html must be static: no <script>');
    return `<figure class="mock"><figcaption><span class="lbl ${kind}">${kind}</span><span class="cap">${inline(view.caption ?? '')}</span></figcaption>
      <div class="scroll-x"><div class="screen"><template shadowrootmode="open"><style>:host{all:initial;display:block}${css}</style>${view.html ?? ''}</template></div></div></figure>`;
  };
  return `<section class="block" id="screens">
  <div class="eyebrow">Screens</div>
  <h2>Before and after</h2>
  ${screens
    .map((s) => {
      if (!s.after) fail(`screen ${s.title} needs an "after" view`);
      return `<div class="screen-set"><h3>${inline(s.title ?? '')}</h3><div class="mock-grid${s.before ? '' : ' one'}">${s.before ? figure('before', s.before) : ''}${figure(s.before ? 'after' : 'new', s.after)}</div>${s.components ? `<p class="comp-cap">${inline(s.components)}</p>` : ''}</div>`;
    })
    .join('\n  ')}
</section>`;
};

const hasFlow = (spec.flow?.nodes ?? []).length >= 2;
const hasScreens = (spec.mocks?.screens ?? []).length > 0;
if (!hasFlow && !hasScreens) fail('nothing to show: the spec needs at least two flow nodes or one screen');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
${STYLE}
</style>
</head>
<body>
<main>
<header class="hero">
  <div class="eyebrow">Plan</div>
  <h1>${esc(title)}</h1>
  <p class="note">Rendered from <code>${esc(planPath)}</code>, which stays the source of truth.</p>
</header>
${hasFlow ? renderFlow(spec.flow) : ''}
${hasScreens ? renderScreens(spec.mocks) : ''}
</main>
</body>
</html>
`;
writeFileSync(outPath, html);
process.stdout.write(`${outPath}\n`);
