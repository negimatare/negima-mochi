#!/bin/bash
# Status line: two rows rendered from the status-line JSON on stdin.
#   Row 1: dir | ⎇ branch
#   Row 2: [Model] ▓▓▓▓░░░░░░ 42% | $0.02 | ◷ 0m 2s
# The bar and percentage show context USED, colored by that value: cyan
# below 60%, amber 60-69%, orange 70-79%, dark red 80%+. Independently,
# context REMAINING picks the /compact hint: none at 70%+, a suggestion at
# 30-69%, an urgent prompt below 30%.
# Install: ln -s "$PWD/statusline/statusline.sh" ~/.claude/statusline.sh,
# then set statusLine.command to ~/.claude/statusline.sh in
# ~/.claude/settings.json.

input=$(cat)

# One jq pass; fields are joined by the ASCII unit separator because
# `read` collapses runs of whitespace separators, which would shift every
# field after an empty one. Invalid JSON leaves every field empty.
US=$'\x1f'
IFS="$US" read -r model dir cost duration_ms remaining used < <(
    printf '%s' "$input" | jq -r --arg us "$US" '[
        (.model.display_name // ""),
        (.workspace.current_dir // .cwd // ""),
        (.cost.total_cost_usd // "" | tostring),
        (.cost.total_duration_ms // "" | tostring),
        (.context_window.remaining_percentage // "" | tostring),
        (.context_window.used_percentage // "" | tostring)
    ] | join($us)' 2>/dev/null
)

CYAN='\033[36m'
YELLOW='\033[33m'
DIM='\033[2m'
RESET='\033[0m'
# Context-bar palette (256-color, which renders consistently through
# terminal multiplexers where 24-bit color may not).
BAR_CYAN='\033[38;5;45m'
BAR_AMBER='\033[38;5;214m'
BAR_ORANGE='\033[38;5;202m'
BAR_RED='\033[38;5;124m'

# --- Row 1: directory, git branch ---
[ -n "$dir" ] || dir="$PWD"
row1="${dir##*/}"
# --no-optional-locks keeps this read-only call from contending with a
# concurrent git process for index.lock.
branch=$(git -C "$dir" --no-optional-locks branch --show-current 2>/dev/null)
if [ -z "$branch" ]; then
    # Detached HEAD: fall back to the short commit hash.
    branch=$(git -C "$dir" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
fi
[ -n "$branch" ] && row1+=" | ⎇ ${branch}"

# --- Row 2 prefix and suffix: model; cost and duration ---
prefix=""
[ -n "$model" ] && prefix="${CYAN}[${model}]${RESET} "
suffix=""
if [[ "$cost" =~ ^[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$ ]]; then
    suffix+=" | ${YELLOW}$(printf '$%.2f' "$cost")${RESET}"
fi
if [[ "$duration_ms" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    total_s=$(( ${duration_ms%.*} / 1000 ))
    if [ "$total_s" -ge 3600 ]; then
        suffix+=" | ◷ $(( total_s / 3600 ))h $(( total_s % 3600 / 60 ))m"
    else
        suffix+=" | ◷ $(( total_s / 60 ))m $(( total_s % 60 ))s"
    fi
fi

# --- Row 2 fallback: remaining_percentage absent or non-numeric ---
if ! [[ "$remaining" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    echo -e "$row1"
    echo -e "${prefix}${DIM}░░░░░░░░░░${RESET} --%${suffix}"
    exit 0
fi

remaining_int=${remaining%.*}
if [[ "$used" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    used_int=${used%.*}
else
    used_int=$(( 100 - remaining_int ))
fi
[ "$used_int" -lt 0 ] && used_int=0
[ "$used_int" -gt 100 ] && used_int=100

if [ "$used_int" -ge 80 ]; then
    color="$BAR_RED"
elif [ "$used_int" -ge 70 ]; then
    color="$BAR_ORANGE"
elif [ "$used_int" -ge 60 ]; then
    color="$BAR_AMBER"
else
    color="$BAR_CYAN"
fi

if [ "$remaining_int" -ge 70 ]; then
    hint=""
elif [ "$remaining_int" -ge 30 ]; then
    hint=" | ${color}Consider /compact <goal + next step>${RESET}"
else
    hint=" | ${color}Run /compact <goal + next step> now!${RESET}"
fi

# Filled cells use the dense shade and empty cells the light shade, both
# in the bar color.
filled=$(( used_int / 10 ))
printf -v fill "%${filled}s" ""
printf -v pad "%$(( 10 - filled ))s" ""
bar="${color}${fill// /▓}${pad// /░}${RESET}"

echo -e "$row1"
echo -e "${prefix}${bar} ${color}${used_int}%${RESET}${suffix}${hint}"
