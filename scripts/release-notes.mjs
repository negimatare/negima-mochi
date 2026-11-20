// Prints the GitHub release notes of a version: its CHANGELOG.md section
// without the heading, with each wrapped paragraph and list item joined
// into one line, as GitHub shows each newline as a break. It stops, and says
// why, when the version, the manifests or the section are not ready.
//
//   node scripts/release-notes.mjs 1.3.0 > notes.md
import { readFileSync } from 'node:fs';

const PLUGINS = ['mochi', 'mochi-react', 'mochi-python'];

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const version = process.argv[2] ?? '';
if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`Give a version such as 1.3.0, not "${version}".`);

for (const plugin of PLUGINS) {
  const manifest = `plugins/${plugin}/.claude-plugin/plugin.json`;
  const found = JSON.parse(readFileSync(manifest, 'utf8')).version;
  if (found !== version) fail(`${manifest} has version ${found}, not ${version}.`);
}

const lines = readFileSync('CHANGELOG.md', 'utf8').split('\n');
const start = lines.findIndex((line) => line.startsWith(`## ${version} `));
if (start === -1) fail(`CHANGELOG.md has no section for ${version}.`);
if (!/^## \S+ — \d{4}-\d{2}-\d{2}$/.test(lines[start])) {
  fail(`The CHANGELOG.md heading "${lines[start]}" has no date. Write it as "## ${version} — YYYY-MM-DD".`);
}
const next = lines.findIndex((line, i) => i > start && line.startsWith('## '));
const section = lines.slice(start + 1, next === -1 ? undefined : next);
const placeholder = section.join('\n').match(/@@[A-Z_]+@@/);
if (placeholder) fail(`The ${version} section of CHANGELOG.md still has the placeholder ${placeholder[0]}.`);

// A line continues the one before it, unless it starts a block: a heading, a
// list item, a table row, a quote or a code fence. Code stays as it is.
const startsBlock = (line) => /^\s*(#|[-*+] |\d+\. |\||>|```)/.test(line);
// A heading, a table row and a code fence end on their own line.
const takesContinuation = (line) => Boolean(line?.trim()) && !/^\s*(#|\||```)/.test(line);
const notes = [];
let inCode = false;
for (const line of section) {
  const last = notes.length - 1;
  if (line.trimStart().startsWith('```')) inCode = !inCode;
  else if (!inCode && line.trim() && !startsBlock(line) && takesContinuation(notes[last])) {
    notes[last] += ` ${line.trim()}`;
    continue;
  }
  notes.push(inCode || line.trimStart().startsWith('```') ? line : line.trimEnd());
}
process.stdout.write(`${notes.join('\n').trim()}\n`);
