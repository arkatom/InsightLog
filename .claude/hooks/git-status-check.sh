#!/bin/bash
# Git コマンド実行前に git status を表示

set -euo pipefail

# 標準入力からJSON を読み取る
INPUT=$(cat)

# tool_input.command を抽出
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# git コマンドの場合のみ git status を実行
if echo "$COMMAND" | grep -q '^git '; then
  echo "📊 Git状態を確認中..." >&2
  git status 2>/dev/null || true
  echo "" >&2
fi

# exit 0 で正常終了（ツールの実行をブロックしない）
exit 0
