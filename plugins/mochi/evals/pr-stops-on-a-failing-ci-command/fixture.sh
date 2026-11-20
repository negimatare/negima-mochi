#!/usr/bin/env bash
# A local feature branch that is not pushed, and a failing check in the
# CLAUDE.md list for a push to an open PR. See _shared/api-docs-check.sh.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/api-docs-check.sh"
finish_shop
