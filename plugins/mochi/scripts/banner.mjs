// `systemMessage` reaches the person but not Claude's context, so the banner
// costs no tokens.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.MOCHI_BANNER === '0') process.exit(0);
let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
if (input?.source !== 'startup') process.exit(0);

// The mochi from the README banner, one letter per Braille dot; `.` is empty.
// Each character holds a block of 2 by 4 dots and takes the colour of the
// strongest letter in it: eyes and smile, then cheeks, then the outline.
const MOCHI = `............oooooooo............
.........ooo........ooo.........
.......oo..............oo.......
.....oo..................oo.....
....o......................o....
...o........................o...
...o........................o...
..o..........................o..
.o............................o.
.o............................o.
.o........ee........ee........o.
o.........ee........ee.........o
o..............................o
o.............e..e.............o
o.....pp.......ee.......pp.....o
o..............................o
o..............................o
o..............................o
.o............................o.
.o............................o.
..o..........................o..
...oo......................oo...
.....oooo..............oooo.....
.........oooooooooooooo.........`.split('\n');
const COLOURS = {
  e: '', // eyes and smile, in the terminal's own text colour
  p: '\x1b[38;2;240;150;135m', // cheeks
  o: '\x1b[38;2;179;150;115m', // outline
};
const RESET = '\x1b[0m';
const plain = 'NO_COLOR' in process.env;

// The bit for each dot, by row and then column, in Unicode's Braille order.
const DOT_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];
const ICON = Array.from({ length: MOCHI.length / 4 }, (_, row) =>
  Array.from({ length: MOCHI[0].length / 2 }, (_, col) => {
    let bits = 0;
    const letters = new Set();
    DOT_BITS.forEach((pair, dy) =>
      pair.forEach((bit, dx) => {
        const letter = MOCHI[row * 4 + dy][col * 2 + dx];
        if (letter !== '.') (bits |= bit), letters.add(letter);
      }),
    );
    if (!bits) return ' ';
    const glyph = String.fromCodePoint(0x2800 + bits);
    const colour = COLOURS[Object.keys(COLOURS).find((letter) => letters.has(letter))];
    return plain || !colour ? glyph : `${colour}${glyph}${RESET}`;
  }).join(''),
);
const ICON_WIDTH = MOCHI[0].length / 2; // colour codes take no columns

const monitors = [
  ['05-032 MENDICANT BIAS', 'A plan is cheap. I will break yours before the code pays for it.'],
  ['117649 DESPONDENT PYRE', 'Every error path is a promise. I check which ones you keep.'],
  ['049 ABJECT TESTAMENT', 'Every behaviour needs a test that can fail. No test should pay twice.'],
  ['2401 PENITENT TANGENT', 'Code that nothing calls still costs a reader. I will find it.'],
  ['031 EXUBERANT WITNESS', 'Every query has a plan. I read it before your database does.'],
  ['859 STATIC CARILLON', 'Whatever renders the page, every user must be able to reach it, hear it, and use it.'],
];
const reactMonitors = [
  ['343 GUILTY SPARK', 'Greetings, Reclaimer. I hold your components to the rules lint cannot check.'],
  ['000 TRAGIC SOLITUDE', 'Every control needs a name a screen reader can say.'],
];
const pythonMonitors = [
  ['686 EBULLIENT PRISM', 'One use case, one slice. One rule, one domain. I keep each where it belongs.'],
  ['295 HARKEN WATCH', 'Your clients never read your code, only your contract. I read it for them.'],
];

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
};

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || '.';
const usesReactFluent = () => {
  const pkg = readJson(join(projectDir, 'package.json'));
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies, ...pkg?.peerDependencies };
  return Boolean(deps.react && deps['@fluentui/react-components']);
};

// A dependency string such as "fastapi[standard]>=0.115", or a Poetry key.
const usesFastApi = () => {
  const manifest = join(projectDir, 'pyproject.toml');
  if (!existsSync(manifest)) return false;
  return /(["'])fastapi(?:\[[^\]]*\])?\s*(?:[<>=!~;,]|\1)|^\s*fastapi\s*=/im.test(readFileSync(manifest, 'utf8'));
};

// A stack plugin shows only when Claude Code installed it for this project,
// at user scope or at the project or local scope of this folder.
const STACK_PLUGINS = ['mochi-react', 'mochi-python'];
const pluginRoot = resolve(process.env.CLAUDE_PLUGIN_ROOT || fileURLToPath(new URL('..', import.meta.url)));
const installedVersions = () => {
  const own = [['mochi', readJson(join(pluginRoot, '.claude-plugin', 'plugin.json'))?.version]];
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  const plugins = readJson(join(configDir, 'plugins', 'installed_plugins.json'))?.plugins ?? {};
  // Version 1 of the file has one object for each key, not a list.
  const installs = (key) => (Array.isArray(plugins[key]) ? plugins[key] : []);
  const mochiKey = Object.keys(plugins).find(
    (key) => key.startsWith('mochi@') && installs(key).some((entry) => resolve(entry.installPath ?? '') === pluginRoot),
  );
  if (!mochiKey) return own.filter(([, version]) => version);
  const marketplace = mochiKey.slice('mochi@'.length);
  const scopeOrder = ['local', 'project', 'user'];
  const forThisProject = (name) =>
    installs(`${name}@${marketplace}`)
      .filter((entry) => !entry.projectPath || resolve(entry.projectPath) === resolve(projectDir))
      .sort((a, b) => scopeOrder.indexOf(a.scope) - scopeOrder.indexOf(b.scope))[0]?.version;
  return [...own, ...STACK_PLUGINS.map((name) => [name, forThisProject(name)])].filter(([, version]) => version);
};

// A failed request is cached too, so an offline machine does not wait at
// each start.
const RELEASES_URL = 'https://api.github.com/repos/negimatare/negima-mochi/releases/latest';
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;
const latestRelease = async () => {
  if (process.env.MOCHI_UPDATE_CHECK === '0') return undefined;
  const cacheFile = join(process.env.CLAUDE_PLUGIN_DATA || tmpdir(), 'negima-mochi-latest-release.json');
  const cached = readJson(cacheFile);
  const age = Date.now() - cached?.checkedAt;
  if (age >= 0 && age < CHECK_INTERVAL_MS) return cached.version;
  let version = cached?.version;
  try {
    const response = await fetch(RELEASES_URL, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'negima-mochi' },
      signal: AbortSignal.timeout(1500),
    });
    if (response.ok) version = String((await response.json()).tag_name ?? '').replace(/^v/, '') || version;
  } catch {}
  try {
    mkdirSync(dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify({ checkedAt: Date.now(), version }));
  } catch {}
  return version;
};

const isOlder = (installed, latest) => {
  const [a, b] = [installed, latest].map((version) => version.split('.').map((part) => parseInt(part, 10) || 0));
  const index = [0, 1, 2].find((i) => a[i] !== b[i]);
  return index !== undefined && a[index] < b[index];
};

// A to Z become Mathematical Sans-Serif Bold Italic (U+1D63C onwards).
const boldItalic = (text) =>
  [...text].map((c) => (c >= 'A' && c <= 'Z' ? String.fromCodePoint(0x1d63c + c.charCodeAt(0) - 65) : c)).join('');

const TEXT_WIDTH = 46;
const width = (line) => [...line].length;
const wrap = (text, max) =>
  text.split(' ').reduce((lines, word) => {
    const last = lines[lines.length - 1];
    if (last && width(`${last} ${word}`) <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
    return lines;
  }, []);

const pool = [...monitors, ...(usesReactFluent() ? reactMonitors : []), ...(usesFastApi() ? pythonMonitors : [])];
const [name, line] = pool[Math.floor(Math.random() * pool.length)];

// Each cell's reset also drops the grey Claude Code gives hook messages, so
// the text sets its own colours, readable on dark and light themes alike.
const paint = (code, text) => (plain ? text : `\x1b[${code}m${text}${RESET}`);
const versions = installedVersions();
const latest = await latestRelease();
// One line keeps the text as high as the art.
const versionLine = versions
  .map(([plugin, version]) => {
    const text = paint('2', `${plugin.replace(/^mochi-/, '')} ${version}`);
    return latest && isOlder(version, latest) ? text + paint('38;2;214;140;40', '↑') : text;
  })
  .join(paint('2', ' · '));
const right = [
  boldItalic('N E G I M A   M O C H I'),
  ...(versionLine ? [versionLine] : []),
  '',
  paint('38;2;98;180;74', name),
  ...wrap(`"${line}"`, TEXT_WIDTH).map((text) => paint('2', text)),
];
const height = Math.max(ICON.length, right.length);
const iconTop = Math.floor((height - ICON.length) / 2);
const rightTop = Math.floor((height - right.length) / 2);
const rows = Array.from({ length: height }, (_, i) => {
  const icon = ICON[i - iconTop] ?? ' '.repeat(ICON_WIDTH);
  return `${icon}   ${right[i - rightTop] ?? ''}`.trimEnd();
});

// An empty line above and below sets the art apart from the hook's label.
// The exit ends a connect that the fetch timeout left open, which would hold
// the session start for up to 10 s.
process.stdout.write(JSON.stringify({ systemMessage: `\n\n${rows.join('\n')}\n\n` }), () => process.exit(0));
