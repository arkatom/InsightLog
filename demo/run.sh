#!/usr/bin/env bash
# =============================================================================
# Ship-from-Issue PRファクトリー — デモ実行スクリプト
#
# 使い方:
#   cd apps/InsightLog && ./demo/run.sh
#
# 動作:
#   1. GitHub Issue を作成（または既存のものを再利用）
#   2. claude --worktree で ship-supervisor エージェントを起動
#   3. Issue → 実装 → UT → Playwright E2E → GIF → コミット → PR → レビュー
#   4. セッションログを demo/logs/ に保存
#
# 所要時間: 40〜60分
# =============================================================================
set -euo pipefail

DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${DEMO_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${APP_DIR}/../.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${DEMO_DIR}/logs/session_${TIMESTAMP}.log"
ISSUE_NUMBER_FILE="${DEMO_DIR}/github_issue_number.txt"

mkdir -p "${DEMO_DIR}/logs" "${DEMO_DIR}/screenshots"

# ── バナー ──────────────────────────────────────────────────────────────────
cat << 'BANNER'

╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║   🚀  Ship-from-Issue PRファクトリー  (Sub-agent アーキテクチャ版)  ║
║                                                                      ║
║   Issue → 実装 → UT → Playwright E2E + GIF → コミット → PR → レビュー  ║
║                                                                      ║
║   対象アプリ : InsightLog（ポモドーロ × AI活用記録）                 ║
║   実装機能   : AI ROI ダッシュボード                                 ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

BANNER

echo "  エージェント構成:"
echo "  supervisor → implementer → ut-writer + qa-planner → qa-executor"
echo "             → committer → pr-creator → pr-reviewer"
echo ""

# ── GitHub Issue の作成/再利用 ──────────────────────────────────────────────
ISSUE_NUMBER=""

if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
  echo "📌 GitHub Issue を確認中..."

  # 既存の Issue があれば再利用
  if [[ -f "${ISSUE_NUMBER_FILE}" ]]; then
    SAVED_ISSUE=$(cat "${ISSUE_NUMBER_FILE}")
    if gh issue view "${SAVED_ISSUE}" &> /dev/null 2>&1; then
      ISSUE_NUMBER="${SAVED_ISSUE}"
      echo "  ✅ 既存 Issue #${ISSUE_NUMBER} を使用"
    fi
  fi

  # なければ新規作成
  if [[ -z "${ISSUE_NUMBER}" ]]; then
    echo "  📝 GitHub Issue を新規作成中..."
    cd "${REPO_ROOT}"
    ISSUE_URL=$(gh issue create \
      --title "feat(InsightLog): AI ROI ダッシュボード機能を追加" \
      --body "$(cat "${DEMO_DIR}/issue.md")" \
      --label "enhancement" 2>/dev/null || echo "")

    if [[ -n "${ISSUE_URL}" ]]; then
      ISSUE_NUMBER=$(echo "${ISSUE_URL}" | grep -oE '[0-9]+$')
      echo "${ISSUE_NUMBER}" > "${ISSUE_NUMBER_FILE}"
      echo "  ✅ Issue #${ISSUE_NUMBER} を作成: ${ISSUE_URL}"
    else
      echo "  ⚠️  Issue 作成失敗。ローカルの demo/issue.md をフォールバックとして使用"
    fi
  fi
else
  echo "⚠️  GitHub CLI 未認証。demo/issue.md をフォールバックとして使用"
  echo "   ※ GitHub連携するには: gh auth login"
fi

echo ""
echo "📋 Issue: ${ISSUE_NUMBER:+"GitHub Issue #${ISSUE_NUMBER}"}${ISSUE_NUMBER:-"demo/issue.md（ローカル）"}"
echo "📝 ログ:  ${LOG_FILE}"
echo "⏱  完了まで 40〜60 分かかります..."
echo ""
echo "  進捗確認:"
echo "  - ${APP_DIR}/claude-progress.txt"
echo "  - ${DEMO_DIR}/feature_list.json"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── feature_list.json の started_at を更新 ────────────────────────────────
FEATURE_LIST="${DEMO_DIR}/feature_list.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|\"started_at\": null|\"started_at\": \"${NOW}\"|" "${FEATURE_LIST}" 2>/dev/null || true
else
  sed -i "s|\"started_at\": null|\"started_at\": \"${NOW}\"|" "${FEATURE_LIST}" 2>/dev/null || true
fi

# ── Claude Code を worktree モードで起動 ─────────────────────────────────
cd "${REPO_ROOT}"

# プロンプト: ship-supervisor エージェントを起動する指示
# ISSUE_NUMBER を環境変数として渡す
PROMPT=$(cat << PROMPT_EOF
ship-supervisor エージェントとして、InsightLog の Ship-from-Issue パイプラインを実行してください。

## 設定情報
- リポジトリルート: $(pwd)
- アプリディレクトリ: apps/InsightLog
- Issue ファイル: apps/InsightLog/demo/issue.md
- GitHub Issue 番号: ${ISSUE_NUMBER:-"未設定（demo/issue.md を使用）"}
- 作業ブランチ: feat/ai-roi-dashboard
- 進捗ログ: apps/InsightLog/claude-progress.txt
- チェックリスト: apps/InsightLog/demo/feature_list.json

## パイプライン実行

以下の Sub-agent を順番に起動して、パイプラインを完走してください:

1. **ship-implementer** — Issue を読んで機能を実装
2. **ship-ut-writer** と **ship-qa-planner** — 並行実行（UTとE2Eテスト設計）
3. **ship-qa-executor** — Playwright テスト実行・GIF録画
4. **ship-committer** — 論理的な粒度でコミット・プッシュ
5. **ship-pr-creator** — PR作成（GIF/スクリーンショット添付）
6. **ship-pr-reviewer** — PR自動レビュー

各ステップ完了後に apps/InsightLog/claude-progress.txt に進捗を記録すること。
テストが失敗した場合は修正して再実行すること（最大2回）。

完了したら PR の URL を出力してください。
PROMPT_EOF
)

echo "Claude Code (worktree) を起動中..."
echo ""

# --worktree: 隔離された git worktree で実行（main ブランチを汚さない）
# -p: 非インタラクティブ実行
export ISSUE_NUMBER="${ISSUE_NUMBER}"
claude --worktree -p "${PROMPT}" 2>&1 | tee "${LOG_FILE}"

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ ${EXIT_CODE} -eq 0 ]]; then
  echo ""
  echo "✅ デモ完了！"
  echo ""
  echo "  📹 GIF・スクリーンショット: ${DEMO_DIR}/screenshots/"
  echo "  📝 セッションログ:          ${LOG_FILE}"
  echo "  📊 進捗メモ:               ${APP_DIR}/claude-progress.txt"
  echo ""
  echo "  PR URL はログの末尾を確認してください ↑"
else
  echo ""
  echo "⚠️  エラーで終了しました（終了コード: ${EXIT_CODE}）"
  echo "  ログ:     ${LOG_FILE}"
  echo "  進捗:     ${APP_DIR}/claude-progress.txt"
fi
