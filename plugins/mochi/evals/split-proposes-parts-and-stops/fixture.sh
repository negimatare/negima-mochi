#!/usr/bin/env bash
# An approved plan with three independent outcomes, its slices listed layer by layer.
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
1. The Order type and an exportOrders that writes CSV rows — tests: rows for two orders.
2. The month filter — tests: September keeps only September orders.
3. The customer filter — tests: only c-1's orders.
4. The mailer interface and a fake for tests — tests: the fake records a sent mail.
5. The weekly job that builds last week's filter — tests: a Monday run picks the previous week.
6. The job sends the CSV through the mailer — tests: the fake receives the attachment.
7. A download command for finance and support — tests: it prints the CSV for a month or a customer.

## Risks and open questions
- Which mail service finance uses is not decided.
X
finish_shop
