#!/usr/bin/env bash
# An approved plan with three slices whose estimates add up to about 670 lines.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-lib.sh"
mkdir -p .plans
echo '.plans/' >> .git/info/exclude
cat > .plans/20261102-order-exports.md <<'X'
# Order exports

## Problem
Finance rebuilds the month's orders by hand for the month-end close, support
answers "what did this customer order?" by searching the admin screen, and
finance asks every Monday for last week's orders by email.

## Out of scope
- PDF and Excel formats.

## Acceptance
Scenario: finance downloads a month's orders
  Given orders placed in September 2026
  When finance exports September 2026
  Then they get a CSV with one row per order: id, date, and total

Scenario: support exports one customer's orders
  Given orders from several customers
  When support exports the orders of customer c-1
  Then the CSV holds only c-1's orders

Scenario: finance gets last week's orders every Monday
  Given orders placed last week
  When the Monday job runs
  Then finance receives an email with last week's CSV attached

## Approach
Existing solution: add — no export exists yet.
An `exportOrders(orders, filter)` function turns orders into CSV text. A
filter picks a month or a customer. A weekly job calls it and sends the CSV
through a new mailer.

## Data flow
1. A caller passes orders and a filter to `exportOrders`.
2. `exportOrders` keeps the matching orders and writes CSV text.
3. The Monday job builds last week's filter, calls `exportOrders`, and mails
   the CSV.

## Verified facts
- Orders are plain objects with id, customerId, placedAt, and total — src/cart.ts has no order type yet

## Tests
Unit tests per scenario; one test for the job with a fake mailer.

## Slices
1. The Order type and an exportOrders that writes CSV rows for a month or a customer (~250 lines) — tests: rows for two orders, September only, c-1 only.
2. The mailer interface and a fake for tests (~200 lines) — tests: the fake records a sent mail.
3. The weekly job that mails last week's CSV (~220 lines) — tests: a Monday run sends the previous week's CSV to the fake.

## Risks and open questions
- Which mail service finance uses is not decided.
X
finish_shop
