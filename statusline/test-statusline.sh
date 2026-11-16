#!/bin/bash
# Tests for statusline.sh (run: bash statusline/test-statusline.sh)

# Do not use set -e because arithmetic operations like ((PASSED++))
# can return non-zero when incrementing from 0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATUS_LINE_SCRIPT="$SCRIPT_DIR/statusline.sh"

# Colors for test output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASSED=0
FAILED=0

# Strip ANSI color codes so patterns match the visible text; a test
# passes "raw" as its 4th argument to assert on the color codes.
strip_ansi() {
    sed $'s/\033\\[[0-9;]*m//g'
}

# Render input through the script.
render() {
    local input="$1" mode="$2"
    local output
    output=$(echo "$input" | "$STATUS_LINE_SCRIPT" 2>&1) || true
    [ "$mode" = "raw" ] || output=$(printf '%s\n' "$output" | strip_ansi)
    printf '%s' "$output"
}

# A plain pattern matches any output row. "__LINES__N" instead asserts
# the number of output rows; "__ROW1__<pattern>" matches row 1 only.
matches() {
    local output="$1" pattern="$2"
    if [[ "$pattern" == __LINES__* ]]; then
        [ "$(printf '%s\n' "$output" | wc -l | tr -d ' ')" = "${pattern#__LINES__}" ]
    elif [[ "$pattern" == __ROW1__* ]]; then
        printf '%s\n' "$output" | head -n 1 | grep -qE -e "${pattern#__ROW1__}"
    else
        printf '%s\n' "$output" | grep -qE -e "$pattern"
    fi
}

# Test helper function
run_test() {
    local test_name="$1"
    local input="$2"
    local expected_pattern="$3"

    if [ ! -x "$STATUS_LINE_SCRIPT" ]; then
        echo -e "${RED}FAIL${NC}: $test_name - statusline.sh not found or not executable"
        ((FAILED++))
        return
    fi

    local output
    output=$(render "$input" "$4")

    if matches "$output" "$expected_pattern"; then
        echo -e "${GREEN}PASS${NC}: $test_name"
        ((PASSED++))
    else
        echo -e "${RED}FAIL${NC}: $test_name"
        echo "  Input: $input"
        echo "  Expected pattern: $expected_pattern"
        echo "  Actual output: $output"
        ((FAILED++))
    fi
}

# Test helper for negative assertions (pattern should NOT match)
run_test_not() {
    local test_name="$1"
    local input="$2"
    local unexpected_pattern="$3"

    if [ ! -x "$STATUS_LINE_SCRIPT" ]; then
        echo -e "${RED}FAIL${NC}: $test_name - statusline.sh not found or not executable"
        ((FAILED++))
        return
    fi

    local output
    output=$(render "$input" "$4")

    if matches "$output" "$unexpected_pattern"; then
        echo -e "${RED}FAIL${NC}: $test_name"
        echo "  Input: $input"
        echo "  Pattern should NOT match: $unexpected_pattern"
        echo "  Actual output: $output"
        ((FAILED++))
    else
        echo -e "${GREEN}PASS${NC}: $test_name"
        ((PASSED++))
    fi
}

echo "=========================================="
echo "Status Line Script Tests"
echo "=========================================="
echo ""

# Display: row 2 shows context USED with a 10-cell bar. The bar color
# follows USED (cyan <60%, amber 60-69%, orange 70-79%, red 80%+); the
# /compact hint follows REMAINING (none 70%+, suggestion 30-69%, urgent
# <30%).
echo "--- No hint (70%+ remaining) ---"
run_test "70% remaining shows 30% used" \
    '{"context_window":{"remaining_percentage":70}}' \
    "▓▓▓░░░░░░░ 30%"

run_test "100% remaining shows 0% used with an empty bar" \
    '{"context_window":{"remaining_percentage":100}}' \
    "░░░░░░░░░░ 0%"

run_test_not "70% remaining shows no compact hint" \
    '{"context_window":{"remaining_percentage":70}}' \
    "compact"

echo ""

echo "--- Suggestion hint (30-69% remaining) ---"
run_test "69% remaining hints Consider /compact" \
    '{"context_window":{"remaining_percentage":69}}' \
    "31%.*Consider /compact"

run_test "30% remaining hints Consider /compact" \
    '{"context_window":{"remaining_percentage":30}}' \
    "70%.*Consider /compact"

echo ""

echo "--- Urgent hint (<30% remaining) ---"
run_test "29% remaining urges Run /compact now" \
    '{"context_window":{"remaining_percentage":29}}' \
    "71%.*Run /compact.*now"

run_test "0% remaining shows a full bar and urges /compact" \
    '{"context_window":{"remaining_percentage":0}}' \
    "▓▓▓▓▓▓▓▓▓▓ 100%.*Run /compact.*now"

echo ""

echo "--- Bar color by context used ---"
run_test "59% used is cyan" \
    '{"context_window":{"remaining_percentage":41}}' \
    $'\033\\[38;5;45m▓▓▓▓▓░░░░░\033\\[0m \033\\[38;5;45m59%' raw

run_test "60% used is amber" \
    '{"context_window":{"remaining_percentage":40}}' \
    $'\033\\[38;5;214m▓▓▓▓▓▓░░░░\033\\[0m \033\\[38;5;214m60%' raw

run_test "70% used is orange" \
    '{"context_window":{"remaining_percentage":30}}' \
    $'\033\\[38;5;202m▓▓▓▓▓▓▓░░░\033\\[0m \033\\[38;5;202m70%' raw

run_test "80% used is dark red" \
    '{"context_window":{"remaining_percentage":20}}' \
    $'\033\\[38;5;124m▓▓▓▓▓▓▓▓░░\033\\[0m \033\\[38;5;124m80%' raw

run_test "hint takes the bar color" \
    '{"context_window":{"remaining_percentage":50}}' \
    $'\033\\[38;5;45mConsider /compact' raw

echo ""

echo "--- used_percentage ---"
run_test "used_percentage is preferred over 100 - remaining" \
    '{"context_window":{"remaining_percentage":75.7,"used_percentage":24.3}}' \
    "▓▓░░░░░░░░ 24%"

run_test "decimal remaining without used_percentage is truncated" \
    '{"context_window":{"remaining_percentage":75.7}}' \
    " 25%"

echo ""

echo "--- No context-size label ---"
run_test_not "Context past 200K shows no [1M] label" \
    '{"context_window":{"remaining_percentage":80},"exceeds_200k_tokens":true}' \
    "\[1M\]"

echo ""

echo "--- Row 1: model, directory, branch ---"
GIT_FIXTURE="$(mktemp -d "${TMPDIR:-/tmp}/statusline-git.XXXXXX")" || {
    echo "FATAL: mktemp failed; cannot create the git fixture" >&2
    exit 1
}
: "${GIT_FIXTURE:?}"
mkdir -p "$GIT_FIXTURE/my-app" "$GIT_FIXTURE/plain-dir"
git -C "$GIT_FIXTURE/my-app" init -q -b feature/auth

run_test "model display name in brackets leads row 2" \
    '{"model":{"display_name":"Opus 5.5"},"context_window":{"remaining_percentage":90}}' \
    "^\[Opus 5\.5\] ▓░░░░░░░░░ 10%"

run_test "model leads row 2 in the fallback too" \
    '{"model":{"display_name":"Opus 5.5"}}' \
    "^\[Opus 5\.5\] ░░░░░░░░░░ --%"

run_test "row 1 starts with the bare directory name" \
    "{\"model\":{\"display_name\":\"Opus 5.5\"},\"workspace\":{\"current_dir\":\"$GIT_FIXTURE/my-app\"},\"context_window\":{\"remaining_percentage\":90}}" \
    "__ROW1__^my-app \| ⎇ feature/auth$"

run_test "directory basename and git branch" \
    "{\"workspace\":{\"current_dir\":\"$GIT_FIXTURE/my-app\"},\"context_window\":{\"remaining_percentage\":90}}" \
    "my-app \| ⎇ feature/auth$"

run_test "cwd is used when workspace.current_dir is absent" \
    "{\"cwd\":\"$GIT_FIXTURE/my-app\"}" \
    "my-app \| ⎇ feature/auth"

run_test_not "non-git directory shows no branch" \
    "{\"workspace\":{\"current_dir\":\"$GIT_FIXTURE/plain-dir\"}}" \
    "⎇"

run_test_not "missing model shows no brackets" \
    "{\"workspace\":{\"current_dir\":\"$GIT_FIXTURE/plain-dir\"}}" \
    "\["

rm -rf "$GIT_FIXTURE"

echo ""

echo "--- Row 2: cost and duration ---"
run_test "cost and duration follow the percentage" \
    '{"context_window":{"remaining_percentage":58},"cost":{"total_cost_usd":0.0234,"total_duration_ms":2400}}' \
    "42% \| \\\$0\.02 \| ◷ 0m 2s"

run_test "duration of an hour or more shows hours and minutes" \
    '{"context_window":{"remaining_percentage":90},"cost":{"total_duration_ms":3900000}}' \
    "◷ 1h 5m"

run_test_not "missing cost shows no dollar amount" \
    '{"context_window":{"remaining_percentage":90}}' \
    "\\\$"

run_test "output has exactly two rows" \
    '{"model":{"display_name":"Opus"},"context_window":{"remaining_percentage":90},"cost":{"total_cost_usd":1}}' \
    "__LINES__2"

echo ""

echo "--- Fallbacks ---"
run_test "Malformed JSON shows --% fallback" \
    '{invalid json' \
    "░░░░░░░░░░ --%"

run_test "Empty input shows --% fallback" \
    '' \
    "░░░░░░░░░░ --%"

run_test "Missing context_window shows --% fallback" \
    '{"other_field":"value"}' \
    " --%"

run_test "Missing remaining_percentage shows --% fallback" \
    '{"context_window":{}}' \
    " --%"

run_test "Null remaining_percentage shows --% fallback" \
    '{"context_window":{"remaining_percentage":null}}' \
    " --%"

run_test "fallback still shows cost" \
    '{"cost":{"total_cost_usd":1.5}}' \
    "--% \| \\\$1\.50"

echo ""

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
