// mochi-react applies only to React + Fluent UI packages, so in a monorepo its
// hooks leave every other package (a Vue app, a Node service) alone.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function nearestPackageDir(fromDir) {
  let dir = fromDir;
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return dir;
}

export function packageDependsOn(packageDir, names) {
  if (!packageDir) return false;
  const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  return names.every((name) => Boolean(deps[name]));
}

export function isReactFluentPackage(packageDir) {
  return packageDependsOn(packageDir, ['react', '@fluentui/react-components']);
}
