// mochi-python applies only to FastAPI packages, so in a monorepo its hooks
// leave every other package (a CLI, a library, a frontend) alone.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function nearestProjectDir(fromDir) {
  let dir = fromDir;
  while (!existsSync(join(dir, 'pyproject.toml'))) {
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return dir;
}

// PEP 503: names compare case-insensitively, and runs of -, _ and . are equal.
const normalize = (name) => name.toLowerCase().replace(/[-_.]+/g, '-');

// Enough TOML to read dependency names: the body of each [table], and the
// strings of each array a key opens, skipping comments, the brackets of extras
// such as "fastapi[standard]", and inline tables such as {include-group = "dev"}.
export function tomlTables(text) {
  const tables = new Map([['', '']]);
  let current = '';
  for (const line of text.split('\n')) {
    const header = line.match(/^\s*\[\[?\s*([^\]]+?)\s*\]\]?\s*(?:#.*)?$/);
    if (header) {
      current = header[1].replace(/["']/g, '');
      if (!tables.has(current)) tables.set(current, '');
    } else tables.set(current, `${tables.get(current)}${line}\n`);
  }
  return tables;
}

function tomlArrays(body) {
  const arrays = new Map();
  for (const opener of body.matchAll(/^[ \t]*["']?([\w.-]+)["']?[ \t]*=[ \t]*\[/gm)) {
    const strings = [];
    let depth = 1;
    let braces = 0;
    let quote = null;
    let value = '';
    for (let i = opener.index + opener[0].length; i < body.length && depth > 0; i++) {
      const c = body[i];
      if (quote) {
        if (c !== quote) value += c;
        else if (braces === 0) strings.push(value), (quote = null), (value = '');
        else (quote = null), (value = '');
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '{') braces++;
      else if (c === '}') braces--;
      else if (c === '#') i = body.indexOf('\n', i) === -1 ? body.length : body.indexOf('\n', i);
      else if (c === '[') depth++;
      else if (c === ']') depth--;
    }
    arrays.set(opener[1], strings);
  }
  return arrays;
}

export function projectDependencies(projectDir) {
  const names = new Set();
  const add = (requirement) => {
    const name = requirement.match(/^\s*([A-Za-z0-9][\w.-]*)/)?.[1];
    if (name) names.add(normalize(name));
  };
  const manifest = join(projectDir, 'pyproject.toml');
  if (existsSync(manifest)) {
    for (const [table, body] of tomlTables(readFileSync(manifest, 'utf8'))) {
      if (table === 'project') tomlArrays(body).get('dependencies')?.forEach(add);
      else if (table === 'project.optional-dependencies' || table === 'dependency-groups')
        for (const list of tomlArrays(body).values()) list.forEach(add);
      else if (/^tool\.poetry(\.group\.[^.]+)?\.(dev-)?dependencies$/.test(table))
        for (const key of body.matchAll(/^[ \t]*["']?([A-Za-z0-9][\w.-]*)["']?[ \t]*=/gm)) add(key[1]);
    }
  }
  for (const file of readdirSync(projectDir).filter((name) => /^requirements.*\.(txt|in)$/.test(name)))
    readFileSync(join(projectDir, file), 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(#|-)/.test(line))
      .forEach(add);
  return names;
}

export function projectDependsOn(projectDir, names) {
  if (!projectDir) return false;
  const dependencies = projectDependencies(projectDir);
  return names.every((name) => dependencies.has(normalize(name)));
}

export function isFastApiProject(projectDir) {
  return projectDependsOn(projectDir, ['fastapi']);
}

// The hooks run only what the project installed: its virtualenv's copy of a
// tool, never `uv run` or `uvx`, which can sync or download before running.
export function virtualenvBins(projectDir) {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: projectDir, encoding: 'utf8' }).stdout?.trim();
  const bins = [];
  for (let dir = projectDir; ; dir = dirname(dir)) {
    bins.push(join(dir, '.venv', 'bin'));
    if (!top || dir === top || dirname(dir) === dir || !dir.startsWith(top)) break;
  }
  // Poetry and Pipenv keep the virtualenv outside the project; asking for its
  // path never creates one.
  for (const [lockfile, command, args] of [
    ['poetry.lock', 'poetry', ['env', 'info', '--path']],
    ['Pipfile.lock', 'pipenv', ['--venv']],
  ]) {
    if (!existsSync(join(projectDir, lockfile))) continue;
    const path = spawnSync(command, args, { cwd: projectDir, encoding: 'utf8' }).stdout?.trim();
    if (path) bins.push(join(path, 'bin'));
  }
  if (process.env.VIRTUAL_ENV) bins.push(join(process.env.VIRTUAL_ENV, 'bin'));
  return bins;
}

export function findTool(bins, name) {
  return bins.map((bin) => join(bin, name)).find((path) => existsSync(path));
}
