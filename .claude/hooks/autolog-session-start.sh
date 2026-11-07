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

# 入力 cwd に移ってから git 情報を取る（multi-repo セッションで重要）
autolog_enter_cwd "$cwd"

branch=$(autolog_branch)
head=$(autolog_head_sha)
repo=$(autolog_repo_root)
remote=$(autolog_repo_remote)

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
  --arg repo "$repo" \
  --arg remote "$remote" \
  '{ts:$ts, type:"session_start", session_id:$sid, cwd:$cwd}
   + (if $repo != "" then {repo:$repo} else {} end)
   + (if $remote != "" then {repo_remote:$remote} else {} end)
   + (if $branch != "" then {branch:$branch} else {} end)
   + (if $head != "" then {head_sha:$head} else {} end)
   + (if $source != "" then {source:$source} else {} end)')

autolog_append "$event"
exit 0
