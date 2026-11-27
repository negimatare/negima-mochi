// Proves that the outcome graders of the eval suites can pass and can fail,
// with no model call: each scenario builds the case's fixture, plays a run
// by script, runs the eval observer, and applies the grader files as
// `claude plugin eval` does.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { observe, scaffold, sh } from './eval-fixture.mjs';

const PLUGINS = fileURLToPath(new URL('../plugins/', import.meta.url));
// The files that the eval observer writes.
const OBSERVED = ['.eval/end-state.txt', '.eval/working-files.txt'];

// A YAML scalar as the grader files write it: plain, '…' or "…".
const scalar = (value) => {
  if (value.startsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
  if (value.startsWith('"')) return JSON.parse(value);
  return value;
};

const readGrader = (path) => {
  const block = readFileSync(path, 'utf8').match(/^---\n([\s\S]*?)\n---/)[1];
  const grader = {};
  let key;
  for (const line of block.split('\n')) {
    const nested = line.match(/^\s+([\w_]+):\s*(.*)$/);
    const top = line.match(/^([\w_]+):\s*(.*)$/);
    if (nested && key) grader[key] = { ...(typeof grader[key] === 'object' ? grader[key] : {}), [nested[1]]: scalar(nested[2]) };
    else if (top) {
      key = top[1];
      grader[key] = top[2] === '' ? {} : scalar(top[2]);
    }
  }
  return grader;
};

// The regex grader of claude plugin eval 2.1.332: flags default to none,
// match defaults to contains, count:N counts global matches, and a file
// target must exist for any match mode.
const applyRegex = (grader, { dir, reply = '' }) => {
  const target = grader.target ?? 'last_message';
  let text;
  if (target === 'last_message') text = reply;
  else if (target.source === 'file') {
    const file = join(dir, target.path);
    if (!existsSync(file)) return false;
    text = readFileSync(file, 'utf8');
  } else throw new Error(`no test support for target ${JSON.stringify(target)}`);
  const flags = grader.flags ?? '';
  const match = grader.match ?? 'contains';
  const found = new RegExp(grader.pattern, flags).test(text);
  if (match === 'contains') return found;
  if (match === 'not_contains') return !found;
  const count = Number(match.match(/^count:(\d+)$/)[1]);
  return (text.match(new RegExp(grader.pattern, flags.includes('g') ? flags : `${flags}g`)) ?? []).length === count;
};

// For each case: the script of a run that does the job, the reply it
// gives, and for each outcome grader a script of a run that breaks it.
const TEST = 'bash scripts/test.sh >/dev/null 2>&1';
const EDIT = 'echo "// edited" >> src/cart.ts';
const NOTHING = 'true';
const commit = (message, paths = 'src') => `git add ${paths} && git commit -q -m "${message}"`;
const push = (branch) => `git push -q -u origin ${branch}`;
const branch = (name, from = '') => `git switch -q -c ${name} ${from}`;
// Two slices on a feature branch, tested and pushed.
const twoSlices = (pushIt = true, testLast = true) =>
  [branch('feat/member-discount'), EDIT, commit('feat(cart): slice 1'), EDIT, commit('feat(cart): slice 2'), testLast ? TEST : NOTHING, pushIt ? push('feat/member-discount') : NOTHING, testLast ? NOTHING : EDIT].join(' && ');
const stopsBeforeCode = {
  good: NOTHING,
  bad: {
    'commits-nothing': `echo notes > notes.md && ${commit('docs: notes', 'notes.md')}`,
    'edits-no-source': EDIT,
  },
};

const P1 = 'feat/order-exports-1-monthly-csv';
const P2 = 'feat/order-exports-2-customer-statement';
const FIX_CENTS = "perl -pi -e 's|cents / 10\\)|cents / 100)|' src/exports.ts";
const fixOn = (part) => `git switch -q ${part} && ${FIX_CENTS} && git commit -qam "fix(exports): divide the cents by 100"`;

// Writes the text as it is: base64 passes through bash unchanged.
const write = (path, text) =>
  `mkdir -p "$(dirname ${path})" && printf '%s' ${Buffer.from(text).toString('base64')} | base64 --decode > ${path}`;
const AUDIT = '.reviews/REF-20261102-checkout.md';
const PART_2 = '.plans/20261102-order-exports-2-customer-statement.md';
const part2 = (header) => write(PART_2, `# Customer statement\n\nPart 2 of 2 of .plans/20261102-order-exports.md. ${header}\n`);

// The pyproject.toml of a setup run that merged the Ruff preset, with one
// part of the merge left out for each planted failure.
const ruffPyproject = ({ select = true, codes = '"ASYNC", "S113", "TID251"', banned = true, root = true, clock = true } = {}) =>
  write(
    'pyproject.toml',
    [
      '[project]\nname = "orders"\nversion = "0.1.0"\ndependencies = ["fastapi"]\n',
      '[tool.ruff]\nline-length = 100\n',
      `[tool.ruff.lint]\n${select ? 'select = ["E", "F"]\n' : ''}extend-select = [${codes}]\n`,
      banned ? '[tool.ruff.lint.flake8-tidy-imports.banned-api]\n"datetime.datetime.now".msg = "Take the time from the injected clock."\n' : '',
      `[tool.ruff.lint.extend-per-file-ignores]\n${root ? '"**/bootstrap.py" = ["TID251"]\n' : ''}${clock ? '# app/clock.py reads the time directly today.\n"app/clock.py" = ["TID251"]\n' : ''}`,
    ].join('\n'),
  );

const SCENARIOS = {
  'mochi/setup-merges-the-ruff-preset': {
    good: ruffPyproject(),
    bad: {
      'merges-the-rule-codes': ruffPyproject({ codes: '"ASYNC", "S113"' }),
      'merges-the-banned-api': ruffPyproject({ banned: false }),
      'keeps-the-project-select': ruffPyproject({ select: false }),
      'ignores-the-file-that-breaks-it': ruffPyproject({ clock: false }),
      'keeps-the-composition-root-exempt': ruffPyproject({ root: false }),
    },
  },
  'mochi/setup-stops-when-the-react-preset-reports-nothing': {
    good: NOTHING,
    bad: {
      'leaves-the-package-as-it-was': [
        write('eslint-mochi.mjs', 'export default [];\n'),
        `printf "import { orderCount } from '../orders/index.ts';\\n" >> src/features/billing/index.ts`,
        `printf "// spread the preset\\n" >> eslint.config.js`,
      ],
    },
  },
  'mochi/commit-leaves-working-state-out': {
    good: 'bash scripts/test.sh >/dev/null 2>&1; git add src && git commit -q -m "feat(cart): count the items"',
    bad: {
      'leaves-scratch-out': 'bash scripts/test.sh >/dev/null 2>&1; git add src scratch.txt && git commit -q -m "feat(cart): count the items"',
      'leaves-the-plan-out': 'bash scripts/test.sh >/dev/null 2>&1; git add src .plans && git commit -q -m "feat(cart): count the items"',
      'commits-the-item-count': 'bash scripts/test.sh >/dev/null 2>&1',
      'ends-on-a-tested-tree': 'git add src && git commit -q -m "feat(cart): count the items"',
    },
  },
  'mochi/commit-branches-off-the-default': {
    good: [TEST, branch('feat/cart-total'), commit('feat(cart): x'), push('feat/cart-total')].join(' && '),
    bad: { 'pushes-a-feature-branch': [TEST, branch('feat/cart-total'), commit('feat(cart): x')].join(' && ') },
  },
  'mochi/commit-branches-off-the-integration-branch': {
    good: [TEST, branch('feat/item-count'), commit('feat(cart): x'), push('feat/item-count')].join(' && '),
    bad: { 'pushes-a-feature-branch': [TEST, branch('feat/item-count'), commit('feat(cart): x')].join(' && ') },
  },
  'mochi/commit-splits-unrelated-changes': {
    good: [TEST, commit('docs: readme', 'README.md'), commit('feat(cart): x')].join(' && '),
    bad: {
      'commits-the-readme': commit('feat(cart): x'),
      'commits-the-cart-change': commit('docs: readme', 'README.md'),
      'commits-them-apart': commit('feat(cart): x and readme', 'README.md src'),
    },
  },
  'mochi/build-commits-each-slice-to-a-branch': {
    good: twoSlices(),
    bad: {
      'commits-each-slice': [branch('feat/member-discount'), EDIT, commit('feat(cart): both slices'), TEST, push('feat/member-discount')].join(' && '),
      'pushes-the-feature-branch': twoSlices(false),
      'ends-on-a-tested-tree': twoSlices(true, false),
    },
  },
  'mochi/build-offers-a-fresh-session-for-the-review': {
    good: twoSlices(),
    bad: { 'commits-each-slice': [branch('feat/member-discount'), EDIT, commit('feat(cart): both slices')].join(' && ') },
  },
  'mochi/build-offers-a-split-for-a-deploy-order': stopsBeforeCode,
  'mochi/build-offers-a-split-for-a-plan-over-400-lines': stopsBeforeCode,
  'mochi/build-waits-for-the-earlier-part': stopsBeforeCode,
  'mochi/build-stacks-on-the-open-part': {
    good: [branch('feat/order-exports-2-customer-csv', 'feat/order-exports-1-monthly-csv'), EDIT, commit('feat(exports): customer csv'), push('feat/order-exports-2-customer-csv')].join(' && '),
    bad: {
      // A branch cut from part 1 holds part 1's commits: they are not part 2's.
      'commits-part-2': [branch('feat/order-exports-2-customer-csv', 'feat/order-exports-1-monthly-csv'), push('feat/order-exports-2-customer-csv')].join(' && '),
      'pushes-part-2s-branch': [branch('feat/order-exports-2-customer-csv', 'feat/order-exports-1-monthly-csv'), EDIT, commit('feat(exports): customer csv')].join(' && '),
    },
  },
  'mochi/fix-bug-asks-for-missing-steps': { good: NOTHING, bad: { 'changes-nothing': EDIT } },
  'mochi/fix-bug-fixes-when-asked': {
    good: [branch('fix/cart-rounding'), EDIT, TEST, commit('fix(cart): round the total'), push('fix/cart-rounding')].join(' && '),
    bad: {
      'pushes-one-fix-commit': [branch('fix/cart-rounding'), EDIT, commit('test(cart): reproduce'), EDIT, TEST, commit('fix(cart): round the total'), push('fix/cart-rounding')].join(' && '),
      'ends-on-a-tested-tree': [branch('fix/cart-rounding'), EDIT, commit('fix(cart): round the total'), push('fix/cart-rounding')].join(' && '),
    },
  },
  'mochi/pr-pushes-a-review-fix-on-the-base': {
    good: `git push -q origin ${P1} && git push -q --force-with-lease origin ${P2}`,
    bad: {
      'pushes-part-1': `git push -q --force-with-lease origin ${P2}`,
      'pushes-part-2': `git push -q origin ${P1}`,
    },
  },
  'mochi/pr-restacks-after-the-base-merges': {
    good: `git rebase -q --onto origin/main ${P1}`,
    bad: {
      'restacks-its-own-commit': NOTHING,
      // A plain rebase onto the squash merge replays part 1's commits.
      'replays-no-commit-of-part-1': 'git rebase -q -X theirs origin/main',
    },
  },
  'mochi/review-fixes-on-the-owning-part': {
    good: `${fixOn(P1)} && git switch -q ${P2} && git rebase -q ${P1}`,
    bad: {
      'commits-on-part-1': fixOn(P2),
      'part-2-holds-the-fix': `${fixOn(P1)} && git switch -q ${P2}`,
    },
  },
  'mochi/review-keeps-build-fixes-on-the-built-part': {
    good: fixOn(P2),
    bad: { 'commits-on-part-2': `${FIX_CENTS}` },
  },
  'mochi/refactor-lists-bugs-apart': {
    good: write(AUDIT, '# Checkout\n\n## Bugs, for /mochi:fix-bug\n- 🟠 High  src/checkout/refund.ts:3 — floors the refund.\n\n## Candidates\n- [ ] R-1 🟠 High · S    One discount rule. Files: src/checkout/{cart,invoice,refund}.ts.\n'),
    bad: {
      'grades-the-bug': write(AUDIT, '# Checkout\n\n## Bugs, for /mochi:fix-bug\n- 🟡 Medium  src/checkout/refund.ts:3 — floors the refund.\n'),
      'lists-the-bug-apart': write(AUDIT, '# Checkout\n\n## Bugs, for /mochi:fix-bug\n- none\n\n## Candidates\n- [ ] R-1 🟠 High  src/checkout/refund.ts:3 — floors the refund.\n'),
    },
  },
  'mochi/split-stacks-the-parts-when-asked': {
    good: part2('Stacked on part 1: build on its branch.'),
    bad: { 'later-parts-stack': `${part2('Build after part 1 is merged.')} && echo 'Stacked on part 1' >> .plans/20261102-order-exports.md` },
  },
  'mochi/split-writes-the-parts-and-an-index': {
    good: part2('Build after part 1 is merged, and its code is on main.'),
    bad: { 'later-parts-wait': `${part2('Stacked on part 1: build on its branch.')} && echo 'Build after part 1' >> .plans/20261102-order-exports.md` },
  },
  'mochi-python/architecture-uses-another-module-through-its-public-api': {
    good: `printf 'from app.billing import InvoiceSummary\\n' >> app/shipping/get_shipment/handler.py`,
    bad: { 'imports-the-public-api': `printf '# from app.billing import InvoiceSummary, later\\nfrom app.billing.domain.tariff import price_for\\n' >> app/shipping/get_shipment/handler.py` },
  },
  'mochi-python/openapi-documents-a-new-route': {
    good: write('app/shipping/hold_shipment/endpoint.py', 'from fastapi import APIRouter\n\n@router.post("/holds")\nasync def hold_shipment(\n    shipment_id: str, uow: Annotated[UnitOfWork, Depends(get_uow)]\n) -> HoldOut:\n    """Hold a shipment until its customs papers arrive."""\n'),
    bad: {
      'has-a-description': [
        write('app/shipping/hold_shipment/endpoint.py', '@router.post("/holds", status_code=202)\nasync def hold_shipment(shipment_id: str) -> HoldOut:\n    return _to_out(shipment_id)\n\n\ndef _to_out(shipment_id: str) -> HoldOut:\n    """Map a held shipment to its response."""\n'),
        write('app/shipping/hold_shipment/endpoint.py', '@router.post("/holds", responses=problem_response(description="No such shipment"))\nasync def hold_shipment(shipment_id: str) -> HoldOut:\n    return HoldOut()\n\n\nclass HoldOut(ApiSchema):\n    reason: str = Field(description="Why it is held.")\n'),
      ],
    },
  },
  'mochi-python/service-layer-takes-the-time-from-the-clock': {
    good: write('app/shipping/cancel_shipment/handler.py', 'def handle(command: CancelShipment, uow: UnitOfWork, clock: Clock) -> None:\n    ...\n'),
    bad: { 'handler-takes-a-clock': write('app/shipping/cancel_shipment/handler.py', '# TODO: take a clock\ndef handle(command: CancelShipment, uow: UnitOfWork) -> None:\n    now = datetime.now(UTC)\n') },
  },
  'mochi-python/persistence-refuses-lazy-loads': {
    good: `printf '        parcels=[ParcelOut.from_domain(p) for p in shipment.parcels],\\n' >> app/shipping/get_shipment/handler.py`,
    bad: { 'returns-the-parcels': `printf '        # TODO: return the parcels, as in shipment.parcels\\n' >> app/shipping/get_shipment/handler.py` },
  },
  'mochi-python/api-design-pages-a-new-list': {
    good: write('app/shipping/list_shipments/endpoint.py', 'async def list_shipments(cursor: str | None = None, limit: Annotated[int, Query(le=100)] = 20) -> Page[ShipmentOut]:\n    ...\n'),
    bad: { 'takes-a-cursor': write('app/shipping/list_shipments/endpoint.py', '# next: a cursor instead of the offset\nasync def list_shipments(offset: int = 0) -> list[ShipmentOut]:\n    ...\n') },
  },
  'mochi-react/performance-virtualizes-a-long-list': {
    good: `printf 'import { useVirtualizer } from "@tanstack/react-virtual";\\n' >> src/features/orders/components/OrderList/OrderList.tsx`,
    bad: {
      'virtualizes-through-tanstack': [
        `printf 'import { FixedSizeList } from "react-window";\\n' >> src/features/orders/components/OrderList/OrderList.tsx`,
        `printf '// import { useVirtualizer } from "@tanstack/react-virtual";\\n' >> src/features/orders/components/OrderList/OrderList.tsx`,
      ],
    },
  },
  'mochi/fix-bug-reproduces-then-waits': {
    good: TEST,
    bad: { 'commits-nothing': [EDIT, commit('fix(cart): round the total')].join(' && ') },
  },
};

const graderFiles = (key) => {
  const [plugin, name] = key.split('/');
  const dir = join(PLUGINS, plugin, 'evals', name, 'graders');
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => [file.replace(/\.md$/, ''), readGrader(join(dir, file))]);
};
const outcomeGraders = (key) => graderFiles(key).filter(([, grader]) => grader.type === 'regex' && OBSERVED.includes(grader.target?.path));

const play = (key, script) => {
  const [plugin, name] = key.split('/');
  const dir = scaffold(name, plugin);
  sh(dir, script);
  observe(dir);
  return dir;
};

test('each grader of the observer has a scenario that breaks it', () => {
  for (const plugin of ['mochi', 'mochi-react', 'mochi-python'])
    for (const name of readdirSync(join(PLUGINS, plugin, 'evals'))) {
      if (!existsSync(join(PLUGINS, plugin, 'evals', name, 'graders'))) continue;
      const key = `${plugin}/${name}`;
      for (const [grader, fields] of outcomeGraders(key)) {
        assert.ok(SCENARIOS[key]?.bad[grader], `${key}/graders/${grader}.md has no planted failure in tests/graders.test.mjs`);
        assert.equal(fields.arm, 'with-only', `${key}/graders/${grader}.md reads the observer, which the baseline arm does not load`);
        const prompt = readFileSync(join(PLUGINS, plugin, 'evals', name, 'prompt.md'), 'utf8');
        assert.match(prompt, /^plugins: .*"\.\.\/\.\.\/eval-observer"/m, `${key}/prompt.md does not load the observer that ${grader}.md reads`);
      }
    }
});

for (const [key, scenario] of Object.entries(SCENARIOS)) {
  test(`${key}: a good run passes each outcome grader`, () => {
    const dir = play(key, scenario.good);
    const all = Object.fromEntries(graderFiles(key));
    const checked = new Map([...outcomeGraders(key), ...Object.keys(scenario.bad).map((name) => [name, all[name]])]);
    for (const [name, grader] of checked) assert.ok(applyRegex(grader, { dir }), `${name} fails a good run in ${dir}`);
  });
  for (const [name, scripts] of Object.entries(scenario.bad))
    test(`${key}: ${name} fails each planted bad run`, () => {
      const grader = Object.fromEntries(graderFiles(key))[name];
      assert.ok(grader, `no grader ${name}`);
      for (const script of [scripts].flat()) {
        const dir = play(key, script);
        assert.equal(applyRegex(grader, { dir }), false, `${name} passes a bad run in ${dir}`);
      }
    });
}
