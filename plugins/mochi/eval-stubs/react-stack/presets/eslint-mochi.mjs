// mochi-react lint preset: the rules of the architecture, state-and-di and
// components-and-styling skills that ESLint enforces. setup-project copies
// this file unchanged beside the package's eslint.config.* and spreads it
// there; the project's own entries after it set the levels and overrides.
// It needs eslint-plugin-boundaries 7, eslint-import-resolver-typescript,
// eslint-plugin-react-hooks 7, eslint-plugin-react and @griffel/eslint-plugin.
import griffel from '@griffel/eslint-plugin';
import boundaries from 'eslint-plugin-boundaries';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

const SOURCE = ['src/**/*.{ts,tsx}'];
const TESTS = ['src/**/*.test.{ts,tsx}'];

// The layers of the architecture skill, and the edges each may import along.
const LAYERS = {
  app: ['app', 'pages', 'feature', 'common', 'contexts', 'lib', 'test'],
  pages: ['pages', 'feature', 'common', 'contexts', 'lib', 'test'],
  contexts: ['contexts', 'lib', 'test'],
  common: ['common', 'lib', 'test'],
  lib: ['lib', 'test'],
};

export default [
  {
    files: SOURCE,
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/legacy-templates': false,
      'boundaries/elements': [
        { type: 'app', mode: 'file', pattern: 'src/*.{ts,tsx}' },
        { type: 'pages', pattern: 'src/pages' },
        { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
        { type: 'common', pattern: 'src/common' },
        { type: 'contexts', pattern: 'src/contexts' },
        { type: 'lib', pattern: 'src/lib' },
        { type: 'test', pattern: 'src/test' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            ...Object.entries(LAYERS).map(([layer, types]) => ({
              from: { element: { type: layer } },
              allow: { to: { element: { types } } },
            })),
            // A feature imports only its own slice of the features layer.
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { types: ['common', 'contexts', 'lib', 'test'] } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: 'feature', captured: { name: '{{ from.element.captured.name }}' } } } },
            },
            { from: { element: { type: 'test' } }, allow: { to: { element: { types: ['app', 'pages', 'feature', 'common', 'contexts', 'lib', 'test'] } } } },
          ],
        },
      ],
    },
  },
  { ...reactHooks.configs.flat.recommended, files: SOURCE },
  {
    files: SOURCE,
    plugins: { react },
    rules: {
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'react/jsx-max-depth': ['warn', { max: 6 }],
    },
  },
  { files: TESTS, rules: { 'max-lines': 'off' } },
  {
    files: ['src/**/*.styles.ts'],
    plugins: { '@griffel': griffel },
    rules: { '@griffel/no-deprecated-shorthands': 'error' },
  },
];
