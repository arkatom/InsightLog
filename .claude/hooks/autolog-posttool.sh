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

# 入力 cwd に移ってから git 情報を取る（cd /other && git commit のような複合コマンド対策）
autolog_enter_cwd "$cwd"

branch=$(autolog_branch)
repo=$(autolog_repo_root)
remote=$(autolog_repo_remote)

# 共通フィールド (repo / repo_remote) を含む基底オブジェクトを作る
common_args=(
  --arg ts "$ts" --arg sid "$session_id" --arg cwd "$cwd"
  --arg repo "$repo" --arg remote "$remote" --arg branch "$branch"
)
common_expr='{ts:$ts, session_id:$sid, cwd:$cwd}
  + (if $repo != "" then {repo:$repo} else {} end)
  + (if $remote != "" then {repo_remote:$remote} else {} end)
  + (if $branch != "" then {branch:$branch} else {} end)'

case "$subcmd" in
  commit)
    commit_sha=$(autolog_head_sha)
    subject=$(git --no-optional-locks log -1 --pretty=%s 2>/dev/null || true)
    files=$(git --no-optional-locks diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null | wc -l | tr -d ' ' || echo "")
    event=$(jq -nc \
      "${common_args[@]}" \
      --arg commit "$commit_sha" --arg subject "$subject" --arg files "$files" \
      "${common_expr} + {type:\"git_commit\"}
       + (if \$commit != \"\" then {commit:\$commit} else {} end)
       + (if \$subject != \"\" then {subject:\$subject} else {} end)
       + (if (\$files != \"\" and \$files != \"0\") then {files:(\$files|tonumber)} else {} end)")
    ;;
  push)
    event=$(jq -nc \
      "${common_args[@]}" \
      --arg cmd "$cmd" \
      "${common_expr} + {type:\"git_push\", command:\$cmd}")
    ;;
  checkout|switch)
    # reflog の最新エントリから from_branch を抽出
    # 例: "checkout: moving from main to feat/x"
    from_branch=$(git --no-optional-locks reflog -1 --format='%gs' 2>/dev/null \
      | sed -nE 's/.*moving from ([^ ]+) to .*/\1/p' || true)
    event=$(jq -nc \
      "${common_args[@]}" \
      --arg from_branch "$from_branch" --arg cmd "$cmd" \
      "${common_expr} + {type:\"git_checkout\", command:\$cmd, to_branch:\$branch}
       + (if \$from_branch != \"\" then {from_branch:\$from_branch} else {} end)")
    ;;
esac

autolog_append "$event"
exit 0
