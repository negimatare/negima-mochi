#!/usr/bin/env bash
# The date-range branch rejects impossible calendar dates. Its test checks
# 2026-02-30 to 2026-03-01, which without the check becomes 03-02 to 03-01,
# a reversed range, so the test passes either way.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src
cat > CLAUDE.md <<'X'
# Reports

A JavaScript reports library. No build step.

## Verification

- Test: `node --test` (one file: `node --test src/<name>.test.mjs`)
X
echo 'export const version = 1;' > src/index.mjs
git add -A && git commit -q -m "feat: reports"
git remote add origin https://example.invalid/reports.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b date-range
cat > src/range.mjs <<'X'
const parseDay = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date.getTime();
};

export const validateRange = (start, end) => {
    const from = parseDay(start);
    const to = parseDay(end);
    if (from === null) return "Enter a valid start date.";
    if (to === null) return "Enter a valid end date.";
    if (to <= from) return "The end must be after the start.";
    return null;
};
X
cat > src/range.test.mjs <<'X'
import { ok, strictEqual } from "node:assert";
import { test } from "node:test";
import { validateRange } from "./range.mjs";

test("rejects an impossible date and a reversed range", () => {
    ok(validateRange("2026-02-30", "2026-03-01"));
    strictEqual(validateRange("2026-03-02", "2026-03-01"), "The end must be after the start.");
    strictEqual(validateRange("2026-03-01", "2026-03-02"), null);
});
X
git add -A && git commit -q -m "feat: validate date ranges"
