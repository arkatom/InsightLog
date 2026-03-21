#!/usr/bin/env bash
# =============================================================================
# Ship-from-Issue PRファクトリー — デモ実行スクリプト
#
# 使い方（InsightLog リポジトリルートから）:
#   ./demo/run.sh
#
# 動作:
#   1. GitHub Issue を作成（または既存のものを再利用）
#   2. claude --worktree で supervisor エージェントを起動
#   3. feature_list.json のフェーズ定義に従って Sub-agent が自律実行
#      implement → unit-test + e2e-plan → e2e-run → commit → pr → review
#   4. セッションログを demo/logs/ に保存
#
# 所要時間: 40〜60分
# 前提: InsightLog リポジトリのルートで実行すること
# =============================================================================
set -euo pipefail

# InsightLog がスタンドアロンリポジトリとして使われる想定
# → このスクリプトの親ディレクトリ（= InsightLog のルート）がリポジトリルート
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${DEMO_DIR}/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${DEMO_DIR}/logs/session_${TIMESTAMP}.log"
ISSUE_NUMBER_FILE="${DEMO_DIR}/github_issue_number.txt"

mkdir -p "${DEMO_DIR}/logs" "${DEMO_DIR}/screenshots"

# ── バナー ──────────────────────────────────────────────────────────────────
cat << 'BANNER'

╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   🚀  Ship-from-Issue PRファクトリー                                 ║
║                                                                      ║
║   Issue → 実装 → UT → Playwright E2E → コミット → PR → レビュー     ║
║                                                                      ║
║   アプリ: InsightLog（ポモドーロ × AI活用記録）                      ║
║   機能:   feature_list.json のフェーズ定義を参照                     ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

BANNER

echo "  Sub-agent 構成:"
echo "  supervisor → implementer → [test-writer, e2e-planner] → e2e-runner"
echo "             → committer → pr-creator → pr-reviewer"
echo ""

# ── GitHub Issue の作成/再利用 ──────────────────────────────────────────────
ISSUE_NUMBER=""
cd "${REPO_DIR}"

if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
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
    ISSUE_TITLE=$(head -1 "${DEMO_DIR}/issue.md" | sed 's/^# //')
    ISSUE_URL=$(gh issue create \
      --title "${ISSUE_TITLE}" \
      --body "$(cat "${DEMO_DIR}/issue.md")" \
      --label "enhancement" 2>/dev/null || echo "")

    if [[ -n "${ISSUE_URL}" ]]; then
      ISSUE_NUMBER=$(echo "${ISSUE_URL}" | grep -oE '[0-9]+$')
      echo "${ISSUE_NUMBER}" > "${ISSUE_NUMBER_FILE}"
      echo "  ✅ Issue #${ISSUE_NUMBER} を作成: ${ISSUE_URL}"
    else
      echo "  ⚠️  Issue 作成失敗。demo/issue.md をフォールバックとして使用"
    fi
  fi
else
  echo "⚠️  GitHub CLI 未認証。demo/issue.md をフォールバックとして使用"
  echo "   ※ 認証するには: gh auth login"
fi

echo ""
echo "📋 Issue: ${ISSUE_NUMBER:+"GitHub Issue #${ISSUE_NUMBER}"}${ISSUE_NUMBER:-"demo/issue.md（ローカル）"}"
echo "📝 ログ:  ${LOG_FILE}"
echo "⏱  完了まで 40〜60 分かかります..."
echo ""
echo "  進捗確認:"
echo "  - ${REPO_DIR}/claude-progress.txt"
echo "  - ${DEMO_DIR}/feature_list.json"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── feature_list.json の started_at を更新 ────────────────────────────────
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|\"started_at\": null|\"started_at\": \"${NOW}\"|" "${DEMO_DIR}/feature_list.json" 2>/dev/null || true
else
  sed -i "s|\"started_at\": null|\"started_at\": \"${NOW}\"|" "${DEMO_DIR}/feature_list.json" 2>/dev/null || true
fi

# ── Claude Code をワークツリーモードで起動 ────────────────────────────────
# .claude/commands/ship-from-issue.md から本文（frontmatter 除外）を取得
COMMANDS_FILE="${REPO_DIR}/.claude/commands/ship-from-issue.md"
if [[ -f "${COMMANDS_FILE}" ]]; then
  PROMPT="$(awk 'BEGIN{f=0} /^---$/{f++; next} f>=2{print}' "${COMMANDS_FILE}")"
else
  PROMPT="supervisor エージェントを起動してください。demo/feature_list.json を読み、パイプラインを実行してください。"
fi

# ISSUE_NUMBER を環境変数として渡す
export ISSUE_NUMBER="${ISSUE_NUMBER}"

echo "Claude Code (worktree) を起動中..."
echo ""

# --worktree: 隔離された git worktree で実行
# -p: 非インタラクティブ実行
claude --worktree -p "${PROMPT}" 2>&1 | tee "${LOG_FILE}"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ${EXIT_CODE} -eq 0 ]]; then
  echo ""
  echo "✅ デモ完了！"
  echo ""
  echo "  📸 スクリーンショット・ビデオ: ${DEMO_DIR}/screenshots/"
  echo "  📝 セッションログ:             ${LOG_FILE}"
  echo "  📊 進捗メモ:                  ${REPO_DIR}/claude-progress.txt"
  echo ""
  echo "  PR URL はログの末尾を確認してください ↑"
else
  echo ""
  echo "⚠️  エラーで終了しました（終了コード: ${EXIT_CODE}）"
  echo "  ログ:  ${LOG_FILE}"
  echo "  進捗: ${REPO_DIR}/claude-progress.txt"
fi
