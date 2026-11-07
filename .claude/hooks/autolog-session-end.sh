#!/bin/bash
# SessionEnd hook — セッション終了時の最終スナップショットを追記
#
# Stop は各ターン末で発火するが、SessionEnd は clear/resume/logout/prompt_input_exit
# などセッション自体の終了タイミングに発火する。end_reason と最終的な累積メトリクスを
# まとめてここで一度だけ記録しておくと、後段の集計で「セッション末値」として
# 確実に利用できる。

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/autolog-common.sh"

INPUT=$(cat)

session_id=$(echo "$INPUT" | jq -r '.session_id // ""')
cwd=$(echo "$INPUT" | jq -r '.cwd // ""')
transcript_path=$(echo "$INPUT" | jq -r '.transcript_path // ""')
end_reason=$(echo "$INPUT" | jq -r '.end_reason // .reason // ""')

ts=$(autolog_ts)

metrics='{}'
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
  m=$(autolog_metrics_from_transcript "$transcript_path")
  if [ -n "$m" ]; then
    metrics="$m"
  fi
fi

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

token_metrics=$(echo "$metrics" | jq -c 'del(._first, ._last)')

event=$(jq -nc \
  --arg ts "$ts" \
  --arg sid "$session_id" \
  --arg dur "$duration_ms" \
  --arg repo "$repo" \
  --arg branch "$branch" \
  --arg reason "$end_reason" \
  --argjson tok "$token_metrics" \
  '{ts:$ts, type:"session_end", session_id:$sid}
   + (if $repo != "" then {repo:$repo} else {} end)
   + (if $branch != "" then {branch:$branch} else {} end)
   + (if $reason != "" then {end_reason:$reason} else {} end)
   + (if $dur != "" then {duration_ms:($dur|tonumber)} else {} end)
   + $tok')

autolog_append "$event"

# セッション終了したので start ファイルをクリーンアップ
if [ -n "$session_id" ]; then
  rm -f "$(autolog_dir)/sessions/${session_id}.start"
fi

exit 0
