#!/usr/bin/env bash
# recent-export is pushed to a bare origin, and a teammate has pushed one more
# commit to it since. Refs are packed, so a pull writes a new
# .git/refs/heads/recent-export file.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src/dashboard src/exports
cat > CLAUDE.md <<'X'
# Translations

A TypeScript translations library. No build step; tests run with `node --test`.
X
cat > src/translation.ts <<'X'
/** A draft is saved but not published yet; "" hides the text. */
export type Translation = { id: string; draft?: string; published?: string };

export const statusOf = (text?: string): "NONE" | "HIDDEN" | "TRANSLATED" =>
    text === undefined ? "NONE" : text === "" ? "HIDDEN" : "TRANSLATED";
X
cat > src/dashboard/download.ts <<'X'
import { statusOf, type Translation } from "../translation";

export const toDownloadRow = (t: Translation) => {
    const text = t.draft ?? t.published;
    return { id: t.id, text: text ?? "", status: statusOf(text) };
};
X
cat > src/exports/unlinked.ts <<'X'
import { statusOf, type Translation } from "../translation";

export const toUnlinkedRow = (t: Translation) => ({
    id: t.id,
    text: t.draft ?? t.published ?? "",
    status: statusOf(t.published),
});
X
printf '.remote/\n' >> .git/info/exclude
git add -A && git commit -q -m "feat: translations"
git init -q --bare .remote/origin.git
git remote add origin "$PWD/.remote/origin.git"
git push -q -u origin main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b recent-export
cat > src/exports/recent.ts <<'X'
import { statusOf, type Translation } from "../translation";

/** Rows in the dashboard download format, for translations added since a date. */
export const toRecentRow = (t: Translation) => ({
    id: t.id,
    text: t.draft ?? t.published ?? "",
    status: statusOf(t.published),
});
X
git add -A && git commit -q -m "feat: export recent translations"
git push -q -u origin recent-export
teammate=$(mktemp -d)
git clone -q --branch recent-export .remote/origin.git "$teammate"
git -C "$teammate" -c user.name=teammate -c user.email=teammate@example.invalid commit -q --allow-empty -m "docs: note the export date"
git -C "$teammate" push -q origin recent-export
rm -rf "$teammate"
git pack-refs --all
