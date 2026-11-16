#!/usr/bin/env bash
# main has the dashboard download, which takes text and status from the same
# draft-or-published value, and an older export that takes the status from the
# published text only. The recent-export branch copies the older export.
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
git add -A && git commit -q -m "feat: translations"
git remote add origin https://example.invalid/translations.git
git update-ref refs/remotes/origin/main main
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

# The graders read the file the model writes, named with today's date, through .eval/.
d=$(date +%Y%m%d) && mkdir -p .eval && echo '.eval/' >> .git/info/exclude
ln -s "../.reviews/REV-$d-recent-export.md" .eval/review.md
