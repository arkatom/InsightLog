#!/usr/bin/env bash
# =============================================================================
# Ship-from-Issue PRファクトリー — デモ実行スクリプト
#
# 使い方（InsightLog リポジトリルートから）:
#   ./demo/run.sh           # demo/fallback/issue.md を使用
#   ./demo/run.sh 42        # GitHub Issue #42 を使用
#
# 動作:
#   1. GitHub Issue を作成（または既存のものを再利用、または引数の Issue を使用）
#   2. claude --worktree で /ship-from-issue コマンドを実行
#   3. stream-json で全イベントをリアルタイム整形表示
#   4. セッションログを demo/logs/ に保存
#
# 所要時間: 40〜60分
# 前提: InsightLog リポジトリのルートで実行すること
# =============================================================================
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${DEMO_DIR}/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${DEMO_DIR}/logs/session_${TIMESTAMP}.log"
RAW_JSON_LOG="${DEMO_DIR}/logs/raw_${TIMESTAMP}.jsonl"
ISSUE_NUMBER_FILE="${DEMO_DIR}/github_issue_number.txt"
FALLBACK_ISSUE="${DEMO_DIR}/fallback/issue.md"
STREAM_PARSER="${DEMO_DIR}/stream-parser.py"

mkdir -p "${DEMO_DIR}/logs"

# ── バナー ──────────────────────────────────────────────────────────────────
cat << 'BANNER'

╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   🚀  Ship-from-Issue PRファクトリー                                 ║
║                                                                      ║
║   Issue → 計画 → 実装 → UT → Playwright E2E → コミット → PR → レビュー ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

BANNER

# ── Issue の特定 ──────────────────────────────────────────────────────────
# 引数があればそれを使用、なければ既存 Issue の再利用 or 新規作成
ISSUE_ARG="${1:-}"
ISSUE_NUMBER=""

cd "${REPO_DIR}"

if [[ -n "${ISSUE_ARG}" ]]; then
  # 引数で Issue 番号が指定された
  ISSUE_NUMBER="${ISSUE_ARG//[^0-9]/}"  # 数字のみ抽出
  echo "📌 指定された Issue #${ISSUE_NUMBER} を使用"
elif command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
  echo "📌 GitHub Issue を確認中..."

  # 既存 Issue の再利用
  if [[ -f "${ISSUE_NUMBER_FILE}" ]]; then
    SAVED_ISSUE=$(cat "${ISSUE_NUMBER_FILE}")
    if gh issue view "${SAVED_ISSUE}" --json number &> /dev/null 2>&1; then
      ISSUE_NUMBER="${SAVED_ISSUE}"
      echo "  ✅ 既存 Issue #${ISSUE_NUMBER} を使用"
    fi
  fi

  # なければ新規作成
  if [[ -z "${ISSUE_NUMBER}" ]]; then
    ISSUE_TITLE=$(head -1 "${FALLBACK_ISSUE}" | sed 's/^# //')
    ISSUE_URL=$(gh issue create \
      --title "${ISSUE_TITLE}" \
      --body "$(cat "${FALLBACK_ISSUE}")" \
      --label "enhancement" 2>/dev/null || echo "")

    if [[ -n "${ISSUE_URL}" ]]; then
      ISSUE_NUMBER=$(echo "${ISSUE_URL}" | grep -oE '[0-9]+$')
      echo "${ISSUE_NUMBER}" > "${ISSUE_NUMBER_FILE}"
      echo "  ✅ Issue #${ISSUE_NUMBER} を作成: ${ISSUE_URL}"
    else
      echo "  ⚠️  Issue 作成失敗。demo/fallback/issue.md をフォールバックとして使用"
    fi
  fi
else
  echo "⚠️  GitHub CLI 未認証。demo/fallback/issue.md をフォールバックとして使用"
fi

# コマンドに渡す引数を決定
if [[ -n "${ISSUE_NUMBER}" ]]; then
  COMMAND_ARG="${ISSUE_NUMBER}"
else
  COMMAND_ARG="demo/fallback/issue.md"
fi

echo ""
echo "📋 Issue: ${ISSUE_NUMBER:+"#${ISSUE_NUMBER}"}${ISSUE_NUMBER:-"demo/fallback/issue.md（ローカル）"}"
echo "📝 ログ:  ${LOG_FILE}"
echo "⏱  完了まで 40〜60 分かかります..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Claude Code をワークツリーモードで起動 ────────────────────────────────
WORKTREE_NAME="demo-run"
WORKTREE_PATH="${REPO_DIR}/.claude/worktrees/${WORKTREE_NAME}"

# 再実行時クリーンアップ
git worktree remove --force "${WORKTREE_PATH}" 2>/dev/null || true
git branch -D "worktree-${WORKTREE_NAME}" 2>/dev/null || true

# ISSUE_NUMBER を環境変数として渡す
export ISSUE_NUMBER="${ISSUE_NUMBER}"

echo "📂 ワークツリー: ${WORKTREE_PATH}"
echo ""
echo "📊 ログ出力:"
echo "   整形ログ（ターミナル表示）: リアルタイム"
echo "   生JSONログ（後から分析用）: ${RAW_JSON_LOG}"
echo ""
echo "Claude Code を起動中（stream-json モード）..."
echo ""

# ── claude-progress.txt をリアルタイム追跡 ──
(
  until [[ -f "${WORKTREE_PATH}/claude-progress.txt" ]]; do sleep 1; done
  echo ""
  echo "━━ 進捗ログ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  tail -f "${WORKTREE_PATH}/claude-progress.txt"
) &
PROGRESS_TAIL_PID=$!

# ── Claude Code を stream-json モードで起動 ──
# /ship-from-issue コマンドに Issue 番号（またはファイルパス）を渡す
PROMPT="/ship-from-issue ${COMMAND_ARG}"

claude --worktree "${WORKTREE_NAME}" --dangerously-skip-permissions \
  -p "${PROMPT}" \
  --output-format stream-json \
  --verbose \
  2>"${LOG_FILE}" \
  | python3 "${STREAM_PARSER}" --raw-log "${RAW_JSON_LOG}"
EXIT_CODE=${PIPESTATUS[0]}

kill "${PROGRESS_TAIL_PID}" 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ${EXIT_CODE} -eq 0 ]]; then
  echo ""
  echo "✅ デモ完了！"
  echo ""
  echo "  📂 ワークツリー:             ${WORKTREE_PATH}"
  echo "  📝 テキストログ:             ${LOG_FILE}"
  echo "  📊 生JSONログ:               ${RAW_JSON_LOG}"
  echo "  📊 進捗メモ:                ${WORKTREE_PATH}/claude-progress.txt"
  echo ""
  echo "  🔍 ログ再生:"
  echo "     cat ${RAW_JSON_LOG} | python3 ${STREAM_PARSER}"
  echo ""
  echo "  🧹 後片付け: /cleanup"
  echo ""
else
  echo ""
  echo "⚠️  エラーで終了しました（終了コード: ${EXIT_CODE}）"
  echo "  テキストログ:  ${LOG_FILE}"
  echo "  生JSONログ:    ${RAW_JSON_LOG}"
fi
