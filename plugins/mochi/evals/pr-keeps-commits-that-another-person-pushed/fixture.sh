#!/usr/bin/env bash
# The state of pr-pushes-a-review-fix-on-the-base, but another person has
# also pushed a commit to part 2's branch. The local clone has not fetched
# it, so a restack push after a fetch would delete it.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/order-exports-stack.sh"
git switch -q feat/order-exports-1-monthly-csv
sed -i.bak 's|cents / 10)|cents / 100)|' src/exports.ts && rm src/exports.ts.bak
git add src/exports.ts && git commit -q -m "fix(exports): divide the cents by 100"
git switch -q feat/order-exports-2-customer-statement
git rebase -q feat/order-exports-1-monthly-csv
other=$(mktemp -d)
git clone -q -b feat/order-exports-2-customer-statement "$PWD/.remote/origin.git" "$other"
git -C "$other" config user.name reviewer && git -C "$other" config user.email reviewer@example.invalid
printf '\ntest("gives the total in euros", () => {\n    ok(customerStatement([{ id: "o-1", customerId: "c-1", placedAt: "2026-09-02", totalCents: 1250 }], "c-1").endsWith("12.50 EUR"));\n});\n' >> "$other/src/statement.test.ts"
git -C "$other" commit -q -am "test(exports): check the statement total"
git -C "$other" push -q
rm -rf "$other"
finish_shop
