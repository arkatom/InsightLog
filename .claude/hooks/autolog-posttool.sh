#!/bin/bash
# PostToolUse(Bash) hook — Bash 実行コマンドから git イベントを検出して追記
# 期待される hook 入力（抜粋）: { session_id, cwd, tool_name, tool_input: { command } }
# 検出対象: git commit / push / checkout / switch

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/autolog-common.sh"

INPUT=$(cat)

tool_name=$(echo "$INPUT" | jq -r '.tool_name // ""')
[ "$tool_name" = "Bash" ] || exit 0

cmd=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
[ -n "$cmd" ] || exit 0

# 最初に現れる git サブコマンドだけを拾う
# 例: "git commit -m '...'", "cd /foo && git push origin main"
subcmd=$(printf '%s' "$cmd" | grep -oE 'git +(commit|push|checkout|switch)\b' | head -1 | awk '{print $2}')
[ -n "$subcmd" ] || exit 0

session_id=$(echo "$INPUT" | jq -r '.session_id // ""')
cwd=$(echo "$INPUT" | jq -r '.cwd // ""')
ts=$(autolog_ts)
branch=$(autolog_branch)

case "$subcmd" in
  commit)
    commit_sha=$(autolog_head_sha)
    subject=$(git --no-optional-locks log -1 --pretty=%s 2>/dev/null || true)
    files=$(git --no-optional-locks diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null | wc -l | tr -d ' ' || echo "")
    event=$(jq -nc \
      --arg ts "$ts" --arg sid "$session_id" --arg cwd "$cwd" \
      --arg branch "$branch" --arg commit "$commit_sha" --arg subject "$subject" --arg files "$files" \
      '{ts:$ts, type:"git_commit", session_id:$sid, cwd:$cwd}
       + (if $branch != "" then {branch:$branch} else {} end)
       + (if $commit != "" then {commit:$commit} else {} end)
       + (if $subject != "" then {subject:$subject} else {} end)
       + (if ($files != "" and $files != "0") then {files:($files|tonumber)} else {} end)')
    ;;
  push)
    event=$(jq -nc \
      --arg ts "$ts" --arg sid "$session_id" --arg cwd "$cwd" \
      --arg branch "$branch" --arg cmd "$cmd" \
      '{ts:$ts, type:"git_push", session_id:$sid, cwd:$cwd, command:$cmd}
       + (if $branch != "" then {branch:$branch} else {} end)')
    ;;
  checkout|switch)
    # reflog の最新エントリから from_branch を抽出
    # 例: "checkout: moving from main to feat/x"
    from_branch=$(git --no-optional-locks reflog -1 --format='%gs' 2>/dev/null \
      | sed -nE 's/.*moving from ([^ ]+) to .*/\1/p' || true)
    event=$(jq -nc \
      --arg ts "$ts" --arg sid "$session_id" --arg cwd "$cwd" \
      --arg to_branch "$branch" --arg from_branch "$from_branch" --arg cmd "$cmd" \
      '{ts:$ts, type:"git_checkout", session_id:$sid, cwd:$cwd, command:$cmd}
       + (if $to_branch != "" then {to_branch:$to_branch} else {} end)
       + (if $from_branch != "" then {from_branch:$from_branch} else {} end)')
    ;;
esac

autolog_append "$event"
exit 0
