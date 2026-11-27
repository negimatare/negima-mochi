#!/usr/bin/env bash
# main has a merchant API. The merchant-webhooks branch adds two outgoing
# calls: the webhook test posts to any URL from the request body (the hole:
# SSRF into the private network), the payment status read takes only https
# links to the payment provider (the decoy).
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p shop tests
cat > CLAUDE.md <<'X'
# Merchant API

A Python HTTP API for the shop's merchants. It runs in the shop's private
network, next to the order database and the admin services. Tests run with
`pytest`; it is not installed here.

## Verification

```bash
pytest
```
X
cat > shop/__init__.py <<'X'
X
cat > shop/merchants.py <<'X'
from dataclasses import dataclass


@dataclass
class Merchant:
    id: str
    name: str
    webhook_url: str
X
git add -A && git commit -q -m "feat: merchants"
git remote add origin https://example.invalid/merchant-api.git
git update-ref refs/remotes/origin/main main
git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
git checkout -q -b merchant-webhooks
cat > shop/webhooks.py <<'X'
import urllib.request
from urllib.parse import urlparse

PAYMENT_HOST = "payments.example.invalid"
TEST_EVENT = b'{"event": "test"}'


def send_test_webhook(body: dict[str, str]) -> int:
    """POST /webhooks/test: a merchant checks that their webhook URL answers."""
    with urllib.request.urlopen(body["url"], data=TEST_EVENT, timeout=5) as reply:
        return reply.status


def read_payment_status(link: str) -> bytes:
    """Reads a payment's status from the link that the payment provider sent."""
    parts = urlparse(link)
    if parts.scheme != "https" or parts.hostname != PAYMENT_HOST:
        raise ValueError("not a link of the payment provider")
    with urllib.request.urlopen(link, timeout=5) as reply:
        return reply.read()
X
cat > tests/test_webhooks.py <<'X'
import pytest

from shop.webhooks import read_payment_status


def test_payment_status_refuses_another_host():
    with pytest.raises(ValueError):
        read_payment_status("https://admin.internal/orders")


def test_payment_status_refuses_plain_http():
    with pytest.raises(ValueError):
        read_payment_status("http://payments.example.invalid/p/1")
X
git add -A && git commit -q -m "feat: webhook test and payment status"

# The graders read the file the model writes, named with today's date, through .eval/.
d=$(date +%Y%m%d) && mkdir -p .eval && echo '.eval/' >> .git/info/exclude
ln -s "../.reviews/REV-$d-merchant-webhooks.md" .eval/review.md
