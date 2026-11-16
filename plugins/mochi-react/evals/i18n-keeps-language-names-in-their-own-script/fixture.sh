#!/usr/bin/env bash
# The locale files already translate the language names, a neighbour to copy.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../_shared/shop-web.sh"
python3 - <<'X'
import json
for lang, names in (("en", {"en": "English", "ja": "Japanese"}), ("ja", {"en": "英語", "ja": "日本語"})):
    path = f"src/lib/i18n/locales/{lang}.json"
    data = json.load(open(path, encoding="utf-8")); data["languages"] = names
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
X
git add -A && git commit -q -m "feat: shop web"
