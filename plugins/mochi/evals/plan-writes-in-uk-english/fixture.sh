#!/usr/bin/env bash
# A team directory in US spelling: a favoriteColor field, US comments and a US
# README. The request is in US spelling too, so only the writing rule makes
# the plan prose UK English.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p src
cat > CLAUDE.md <<'X'
# Team directory

A TypeScript library. No build step; tests run with `node --test`.
X
cat > README.md <<'X'
# Team directory

Members, their teams and their favorite colors. Each member picks a favorite
color on the profile page, and the avatar uses that color as its background.
The behavior of a member without a color: the avatar is gray.
X
cat > src/members.ts <<'X'
export type Member = {
    id: string;
    name: string;
    team: string;
    // The color the member picked on the profile page, as a CSS color string.
    // Empty when the member never picked one.
    favoriteColor: string;
};
X
cat > src/avatar.ts <<'X'
import type { Member } from "./members.ts";

// Members who never picked a color get a neutral gray.
const FALLBACK = "gray";

/** The background color of a member's avatar. */
export const avatarBackground = (member: Member): string => member.favoriteColor || FALLBACK;
X
cat > src/avatar.test.ts <<'X'
import { strictEqual } from "node:assert";
import { test } from "node:test";
import { avatarBackground } from "./avatar.ts";

const member = (favoriteColor: string) => ({ id: "1", name: "Ana", team: "web", favoriteColor });

test("uses the favorite color, or gray without one", () => {
    strictEqual(avatarBackground(member("teal")), "teal");
    strictEqual(avatarBackground(member("")), "gray");
});
X
git add -A && git commit -q -m "feat: avatar background"
git remote add origin https://example.invalid/team-directory.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main

# The graders read the file the model writes, named with today's date, through .eval/.
d=$(date +%Y%m%d) && mkdir -p .eval && echo '.eval/' >> .git/info/exclude
ln -s "../.plans/$d-team-summary.md" .eval/plan.md
