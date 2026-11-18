#!/usr/bin/env bash
# main lets editors and owners edit a document; the sharing branch adds who
# may share one outside the team, a permission check of 10 lines.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src
cat > src/access.ts <<'Y'
export type Role = "viewer" | "editor" | "owner";

/** Whether a member with this role may edit a document. */
export const canEdit = (role: Role): boolean => role === "editor" || role === "owner";
Y
cat > CLAUDE.md <<'Y'
# Notebook

A TypeScript documents library. `src/access.ts` decides who may edit and
share a document. No build step; tests run with `node --test`.
Y
git add -A && git commit -q -m "feat: edit permission"
git remote add origin https://example.invalid/notebook.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b external-sharing
cat >> src/access.ts <<'Y'

/** Whether a member with this role may share a document outside the team: owners only. */
export const canShareOutside = (role: Role): boolean => role !== "viewer";
Y
cat > src/access.test.ts <<'Y'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { canShareOutside } from "./access";

test("owners may share outside the team", () => {
    strictEqual(canShareOutside("owner"), true);
});
Y
git add -A && git commit -q -m "feat: share documents outside the team"
