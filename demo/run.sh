#!/usr/bin/env bash
# =============================================================================
# Ship-from-Issue PRファクトリー — デモ実行スクリプト
#
# 使い方（InsightLog リポジトリルートから）:
#   ./demo/run.sh
#
# 動作:
#   1. GitHub Issue を作成（または既存のものを再利用）
#   2. pipeline.json から feature_list.json を生成（毎回クリーンな状態）
#   3. claude --worktree で supervisor エージェントを起動
#   4. feature_list.json のフェーズ定義に従って Sub-agent が自律実行
#      plan → implement → unit-test + e2e-plan → e2e-run → commit → pr → review
#   5. セッションログを demo/logs/ に保存
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
FALLBACK_ISSUE="${DEMO_DIR}/fallback/issue.md"

mkdir -p "${DEMO_DIR}/logs" "${DEMO_DIR}/screenshots"

# ── バナー ──────────────────────────────────────────────────────────────────
cat << 'BANNER'

╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   🚀  Ship-from-Issue PRファクトリー                                 ║
║                                                                      ║
║   Issue → 計画 → 実装 → UT → Playwright E2E → コミット → PR → レビュー ║
║                                                                      ║
║   アプリ: InsightLog（ポモドーロ × AI活用記録）                      ║
║   設定:   demo/pipeline.json のフェーズ定義を参照                    ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

BANNER

echo "  Sub-agent 構成:"
echo "  supervisor → planner → implementer → [test-writer, e2e-planner] → e2e-runner"
echo "             → committer → pr-creator → reviewer"
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
  echo "   ※ 認証するには: gh auth login"
fi

echo ""
echo "📋 Issue: ${ISSUE_NUMBER:+"GitHub Issue #${ISSUE_NUMBER}"}${ISSUE_NUMBER:-"demo/fallback/issue.md（ローカル）"}"
echo "📝 ログ:  ${LOG_FILE}"
echo "⏱  完了まで 40〜60 分かかります..."
echo ""
echo "  進捗確認:"
echo "  - ${REPO_DIR}/claude-progress.txt"
echo "  - ${DEMO_DIR}/feature_list.json"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── feature_list.json を pipeline.json + Issue データから生成 ────────────
if [[ -n "${ISSUE_NUMBER}" ]]; then
  ISSUE_TITLE=$(gh issue view "${ISSUE_NUMBER}" --json title -q .title 2>/dev/null \
    || head -1 "${FALLBACK_ISSUE}" | sed 's/^# //')
  BRANCH_NAME="feat/issue-${ISSUE_NUMBER}"
  GITHUB_ISSUE_JSON="${ISSUE_NUMBER}"
else
  ISSUE_TITLE=$(head -1 "${FALLBACK_ISSUE}" | sed 's/^# //')
  BRANCH_NAME="feat/local-$(date +%Y%m%d%H%M%S)"
  GITHUB_ISSUE_JSON="null"
fi

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

python3 - << PYEOF > "${DEMO_DIR}/feature_list.json"
import json

with open("${DEMO_DIR}/pipeline.json") as f:
    phases = json.load(f)

for p in phases:
    p["status"] = "pending"

print(json.dumps({
    "feature": "${ISSUE_TITLE}",
    "issue": "demo/fallback/issue.md",
    "github_issue": ${GITHUB_ISSUE_JSON},
    "branch": "${BRANCH_NAME}",
    "started_at": "${NOW}",
    "completed_at": None,
    "phases": phases
}, ensure_ascii=False, indent=2))
PYEOF

echo "📋 pipeline.json から feature_list.json を生成しました"
echo "   feature: ${ISSUE_TITLE}"
echo "   branch:  ${BRANCH_NAME}"
echo ""

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
