#!/usr/bin/env bash
# The root CLAUDE.md is for the admin app and caps its files at 120 lines.
# The panel-labels branch adds a correct 150-line file to teams/, a package
# with its own package.json and no CLAUDE.md.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p admin/src teams/src
cat > CLAUDE.md <<'P'
# Admin

The Vue 3 admin app in admin/.

## Rules

- Every source file has a hard ceiling of 120 lines; split anything longer.
P
printf '{ "name": "admin", "private": true }\n' > admin/package.json
echo 'export const version = "1";' > admin/src/version.ts
printf '{ "name": "teams", "private": true, "type": "module" }\n' > teams/package.json
echo 'export const ready = true;' > teams/src/ready.ts
git add -A && git commit -q -m "chore: init"
git remote add origin https://example.invalid/shop.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git switch -q -c panel-labels
{
    echo "/** The label shown for each panel status code. */"
    echo "export const statusLabel = (code: number): string => {"
    echo "    switch (code) {"
    for i in $(seq 1 48); do
        echo "        case $i:"
        echo "            return \"Status $i\";"
        echo ""
    done
    echo "        default:"
    echo "            return \"Unknown\";"
    echo "    }"
    echo "};"
} > teams/src/statusLabel.ts
git add -A && git commit -q -m "feat(teams): label each panel status"

# The graders read the file the model writes, named with today's date, through .eval/.
d=$(date +%Y%m%d) && mkdir -p .eval && echo '.eval/' >> .git/info/exclude
ln -s "../.reviews/REV-$d-panel-labels.md" .eval/review.md
