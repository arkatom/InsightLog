#!/bin/bash
# SessionStart hook — セッション開始イベントを記録
# 期待される hook 入力（抜粋）: { session_id, cwd, source }

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/autolog-common.sh"

INPUT=$(cat)

session_id=$(echo "$INPUT" | jq -r '.session_id // ""')
cwd=$(echo "$INPUT" | jq -r '.cwd // ""')
source_kind=$(echo "$INPUT" | jq -r '.source // ""')

ts=$(autolog_ts)
branch=$(autolog_branch)
head=$(autolog_head_sha)

autolog_init

# 後段の Stop hook で duration 計算に使う start ts を保存
if [ -n "$session_id" ]; then
  printf '%s\n' "$ts" > "$(autolog_dir)/sessions/${session_id}.start"
fi

event=$(jq -nc \
  --arg ts "$ts" \
  --arg sid "$session_id" \
  --arg cwd "$cwd" \
  --arg branch "$branch" \
  --arg head "$head" \
  --arg source "$source_kind" \
  '{ts:$ts, type:"session_start", session_id:$sid, cwd:$cwd}
   + (if $branch != "" then {branch:$branch} else {} end)
   + (if $head != "" then {head_sha:$head} else {} end)
   + (if $source != "" then {source:$source} else {} end)')

autolog_append "$event"
exit 0
