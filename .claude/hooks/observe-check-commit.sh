#!/bin/bash
# ============================================================================
# observe-check-commit.sh
# ============================================================================
#
# 【目的】
#   git commit が完了した直後に、最後の /observe 実行から 1 時間以上経過していた
#   場合だけ、Claude のコンテキストに「/observe を実行することを推奨」のメッセージ
#   を注入する。commit 自体は止めない。
#
# 【受講者向け解説 — なぜこの設計か】
#
# 1. なぜ Hook event は PostToolUse か（PreToolUse ではなく）？
#    - PreToolUse:  tool 実行 "前" に発火。tool 自体をブロックすることもできる
#    - PostToolUse: tool 実行 "後" に発火。tool は既に終わっている
#    - 今回は「commit が完了したあとに次のアクション (/observe) を促す」セマンティクス
#      なので PostToolUse が公式に正しい
#    - 公式: https://docs.claude.com/en/docs/claude-code/hooks
#      （PostToolUse 節: "Runs immediately after a tool completes successfully"）
#
# 2. なぜ JSON で additionalContext を返すのか（echo "..." ではダメ）？
#    - PreToolUse / PostToolUse では plain text の stdout は Claude のコンテキスト
#      に "入らない"。これは公式仕様
#    - plain text stdout が context に入るのは UserPromptSubmit / SessionStart の
#      hook だけ
#    - PostToolUse で Claude にメッセージを伝えたいなら hookSpecificOutput.additionalContext
#    - 公式: https://docs.claude.com/en/docs/claude-code/hooks
#      （Hook Output → JSON Output → hookSpecificOutput.additionalContext 節）
#
# 3. なぜ専用ファイル .claude/tmp/last-observe-time でタイムスタンプ管理するのか？
#    - "docs/memory/ 内のファイル mtime を見る" 方式は、手動編集や別ツールの更新
#      でも mtime が変わってしまう → "/observe 実行時刻" と一致しない
#    - /observe skill 自体が処理の最後 (Step 9) に
#      `date -u +%s > .claude/tmp/last-observe-time` を書き込む仕様
#    - したがってこの専用ファイルだけが "正確な /observe 実行時刻" になる
#
# 4. なぜ exit 0 固定なのか？
#    - PostToolUse で exit 2 を返すと stderr が Claude にエラーとして送られる
#      (commit はもう完了しているので元には戻せないが Claude には伝わる)
#    - 今回は "ブロックしない" "エラーではない" "単に context を追加するだけ"
#      なので exit 0 で問題なし
#    - 公式: https://docs.claude.com/en/docs/claude-code/hooks
#      （Hook Output → Exit Code 節）
#
# ============================================================================
#
# 【.claude/settings.json への登録例】
#
#   {
#     "hooks": {
#       "PostToolUse": [
#         {
#           "matcher": "Bash",
#           "if": "Bash(git commit *)",
#           "hooks": [
#             { "type": "command", "command": "bash .claude/hooks/observe-check-commit.sh" }
#           ]
#         }
#       ]
#     }
#   }
#
#   - matcher: "Bash"          → Bash tool 全般を対象に
#   - if:      "Bash(git commit *)" → permission rule 構文で git commit のみに絞る
#   - command: bash で本スクリプトを実行
#
# ============================================================================

set -euo pipefail

# Claude Code から渡される hook 入力 JSON を stdin から読む
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# settings.json の if 条件で「Bash(git commit *)」に絞っているが、
# 二重防御として中身でも「git commit」始まりかをチェック
if ! echo "$COMMAND" | grep -qE '^git commit'; then
  exit 0
fi

# プロジェクトルートを特定する
# 公式仕様: $CLAUDE_PROJECT_DIR は Claude Code が自動でセットする環境変数で、
# プロジェクトルートを指す。フォールバックは $(pwd)（Claude Code を起動した cwd）。
# 公式: https://docs.claude.com/en/docs/claude-code/hooks
#   （Working Directory and Environment Variables 節 → $CLAUDE_PROJECT_DIR）
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# /observe 実行時刻を保存している専用ファイル
# observe skill が処理の最後 (Step 9) に
#   date -u +%s > .claude/tmp/last-observe-time
# を実行する仕様になっている
TIMESTAMP_FILE="${PROJECT_ROOT}/.claude/tmp/last-observe-time"

# 1 時間 (秒) を閾値にする
THRESHOLD=3600

# Claude のコンテキストに文字列を追加するための JSON を出力するヘルパー
# 公式仕様: PostToolUse + hookSpecificOutput.additionalContext
emit_context() {
  jq -nc --arg msg "$1" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: $msg
    }
  }'
}

# タイムスタンプファイルが無い → /observe をまだ 1 度も実行していない
if [ ! -f "$TIMESTAMP_FILE" ]; then
  emit_context "💡 /observe の実行記録がありません。続けて /observe を実行してください。observe は内部で /evolve も連続実行します（low risk は自動適用、high risk は人間判断キューに残ります）。"
  exit 0
fi

# 前回の実行時刻を読む（壊れていれば 0 扱いで「実行記録なし」相当に）
LAST=$(cat "$TIMESTAMP_FILE" 2>/dev/null || echo 0)
NOW=$(date +%s)
ELAPSED=$((NOW - LAST))

# 1 時間以上経過していたら Claude のコンテキストにメッセージを注入
if [ "$ELAPSED" -ge "$THRESHOLD" ]; then
  MIN=$((ELAPSED / 60))
  emit_context "💡 前回の /observe 実行から約 ${MIN} 分経過しています。続けて /observe を実行してください。observe は内部で /evolve も連続実行します（low risk は自動適用、high risk は人間判断キューに残ります）。"
fi

# commit はブロックしない
exit 0
