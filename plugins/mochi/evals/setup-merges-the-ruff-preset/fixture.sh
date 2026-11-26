#!/usr/bin/env bash
# A FastAPI project with its own Ruff config and one file that reads the time
# directly. Its .venv has a fake Ruff that runs offline: it reports TID251 on
# a direct datetime.now() when the rule is on, by the command line or by
# pyproject.toml, unless pyproject.toml ignores it for that file.
set -euo pipefail
git init -q -b main
git config user.name eval && git config user.email eval@example.invalid
mkdir -p app .venv/bin
cat > pyproject.toml <<'P'
[project]
name = "orders"
version = "0.1.0"
dependencies = ["fastapi"]

[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F"]
P
cat > app/__init__.py <<'P'
P
cat > app/clock.py <<'P'
from datetime import datetime


def stamp() -> str:
    return datetime.now().isoformat()
P
cat > app/cart.py <<'P'
def total(prices: list[int]) -> int:
    return sum(prices)
P
cat > .venv/bin/ruff <<'P'
#!/usr/bin/env bash
[ "${1:-}" = "--version" ] && { echo "ruff 0.17.6"; exit 0; }
[ "${1:-}" = "check" ] || { echo "ruff: only check is supported here" >&2; exit 2; }
on=no
case " $* " in *TID251*) on=yes ;; esac
grep -q 'TID251' pyproject.toml && on=yes
[ "$on" = yes ] || exit 0
found=1
for file in $(grep -rl 'datetime.now()' app --include='*.py'); do
    grep -Eq "\"($file|\*\*/$(basename "$file"))\" *= *\[[^]]*TID251" pyproject.toml && continue
    echo "$file:5:12: TID251 \`datetime.datetime.now\` is banned: Take the time from the injected clock (Clock)"
    found=0
done
[ "$found" = 0 ] && exit 1
exit 0
P
chmod +x .venv/bin/ruff
printf '.venv/\n__pycache__/\n' > .gitignore
git add -A && git commit -q -m "feat: order clock"
