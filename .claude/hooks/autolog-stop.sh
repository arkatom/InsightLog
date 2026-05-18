#!/bin/bash
# Stop hook — 毎ターン終了時に累積メトリクスを session_progress として追記
# 期待される hook 入力（抜粋）: { session_id, cost: { total_duration_ms, total_cost_usd, total_lines_added, total_lines_removed } }
# 注意: Stop hook はセッション終了時のみではなく、Claude の各応答ターン末ごとに発火する。

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/autolog-common.sh"

INPUT=$(cat)

session_id=$(echo "$INPUT" | jq -r '.session_id // ""')
cwd=$(echo "$INPUT" | jq -r '.cwd // ""')
duration_ms=$(echo "$INPUT" | jq -r '.cost.total_duration_ms // ""')
cost_usd=$(echo "$INPUT" | jq -r '.cost.total_cost_usd // ""')
lines_added=$(echo "$INPUT" | jq -r '.cost.total_lines_added // ""')
lines_removed=$(echo "$INPUT" | jq -r '.cost.total_lines_removed // ""')

ts=$(autolog_ts)

# duration が hook 入力に無い場合は session_start.ts との差分で計算
if [ -z "$duration_ms" ] && [ -n "$session_id" ]; then
  start_file="$(autolog_dir)/sessions/${session_id}.start"
  if [ -f "$start_file" ]; then
    start_ts=$(cat "$start_file")
    start_epoch=$(autolog_iso_to_epoch_ms "$start_ts")
    now_epoch=$(autolog_epoch_ms)
    if [ -n "$start_epoch" ] && [ -n "$now_epoch" ]; then
      duration_ms=$((now_epoch - start_epoch))
    fi
  fi
fi

autolog_enter_cwd "$cwd"
repo=$(autolog_repo_root)
branch=$(autolog_branch)

event=$(jq -nc \
  --arg ts "$ts" \
  --arg sid "$session_id" \
  --arg dur "$duration_ms" \
  --arg cost "$cost_usd" \
  --arg la "$lines_added" \
  --arg lr "$lines_removed" \
  --arg repo "$repo" \
  --arg branch "$branch" \
  '{ts:$ts, type:"session_progress", session_id:$sid}
   + (if $repo != "" then {repo:$repo} else {} end)
   + (if $branch != "" then {branch:$branch} else {} end)
   + (if $dur != "" then {duration_ms:($dur|tonumber)} else {} end)
   + (if $cost != "" then {cost_usd:($cost|tonumber)} else {} end)
   + (if $la != "" then {lines_added:($la|tonumber)} else {} end)
   + (if $lr != "" then {lines_removed:($lr|tonumber)} else {} end)')

autolog_append "$event"
exit 0
