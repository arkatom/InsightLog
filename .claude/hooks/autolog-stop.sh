#!/bin/bash
# Stop hook — 毎ターン終了時に session_progress として累計メトリクスを追記
#
# Claude Code の Stop hook 入力は cost/duration/lines を含まない (公式ドキュメント上の
# response_cost / response_duration / lines_generated とも実際には別構造)。
# そこで transcript_path に書き出されているセッショントランスクリプトを jq で集計し、
# duration / トークン使用量を取得する。
#
# 注意: Stop hook はセッション終了時のみではなく、各応答ターン末に発火する。
# したがって各行は「そのターン終了時点での累積値スナップショット」として扱う。

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/autolog-common.sh"

INPUT=$(cat)

session_id=$(echo "$INPUT" | jq -r '.session_id // ""')
cwd=$(echo "$INPUT" | jq -r '.cwd // ""')
transcript_path=$(echo "$INPUT" | jq -r '.transcript_path // ""')

ts=$(autolog_ts)

# transcript から累計メトリクスを取得
metrics='{}'
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
  m=$(autolog_metrics_from_transcript "$transcript_path")
  if [ -n "$m" ]; then
    metrics="$m"
  fi
fi

# duration_ms を計算: transcript の _first → _last
duration_ms=""
first_ts=$(echo "$metrics" | jq -r '._first // ""')
last_ts=$(echo "$metrics" | jq -r '._last // ""')
if [ -n "$first_ts" ] && [ -n "$last_ts" ]; then
  first_epoch=$(autolog_iso_to_epoch_ms "$first_ts")
  last_epoch=$(autolog_iso_to_epoch_ms "$last_ts")
  if [ -n "$first_epoch" ] && [ -n "$last_epoch" ] && [ "$last_epoch" -gt "$first_epoch" ]; then
    duration_ms=$((last_epoch - first_epoch))
  fi
fi

# fallback: transcript が読めなければ session_start.ts との差分
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

# token メトリクスから内部用 _first/_last を除去
token_metrics=$(echo "$metrics" | jq -c 'del(._first, ._last)')

event=$(jq -nc \
  --arg ts "$ts" \
  --arg sid "$session_id" \
  --arg dur "$duration_ms" \
  --arg repo "$repo" \
  --arg branch "$branch" \
  --argjson tok "$token_metrics" \
  '{ts:$ts, type:"session_progress", session_id:$sid}
   + (if $repo != "" then {repo:$repo} else {} end)
   + (if $branch != "" then {branch:$branch} else {} end)
   + (if $dur != "" then {duration_ms:($dur|tonumber)} else {} end)
   + $tok')

autolog_append "$event"
exit 0
