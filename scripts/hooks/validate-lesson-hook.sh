#!/bin/bash
# PostToolUse hook: run the SPOKES lesson validator after Write/Edit on a lesson.
#
# Claude Code delivers hook input as JSON on stdin (tool_input.file_path).
# Contract: exit 0 = pass/not applicable; exit 2 + stderr = blocking failure
# that is fed back to Claude. (Exit 1 output is discarded — do not use it.)

set -u

INPUT=$(cat)

FILE_PATH=$(printf '%s' "$INPUT" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print('')
    sys.exit(0)
print(data.get('tool_input', {}).get('file_path', ''))
")

# Only validate lesson entry points.
case "$FILE_PATH" in
  *lesson-*/index.html) ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
VALIDATOR="$ROOT/scripts/validate-lesson.py"

if [ ! -f "$VALIDATOR" ]; then
  echo "validate-lesson-hook: validator not found at $VALIDATOR" >&2
  exit 2
fi

OUTPUT=$(python3 "$VALIDATOR" "$FILE_PATH" 2>&1)
STATUS=$?

if [ "$STATUS" -ne 0 ]; then
  {
    echo "SPOKES validator found CRITICAL failures in $FILE_PATH:"
    printf '%s\n' "$OUTPUT" | grep -E '^\[FAIL\]|^SUMMARY'
    echo "Fix all CRITICAL failures (see SPOKES-STANDARD.md) before proceeding."
  } >&2
  exit 2
fi

exit 0
