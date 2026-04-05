#!/bin/bash
set -euo pipefail

# オプション解析
NO_API=false
for arg in "$@"; do
    case "$arg" in
        --no-api) NO_API=true ;;
    esac
done

# .envファイルの読み込み（存在する場合のみ）
# Codespace Secrets は環境変数として自動注入されるため .env がなくてもOK
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# 必須フィールドのバリデーション（--no-api 時はスキップ）
if [ "$NO_API" = false ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo "エラー: ANTHROPIC_API_KEY が設定されていません。"
    echo ".env ファイルまたは Codespace Secrets で設定してください。"
    echo "（API キーなしで続行するには: bash setup.sh --no-api）"
    exit 1
fi

echo "=== 研修環境の初期セットアップを開始します ==="

# 1. npm 依存パッケージのインストール
if [ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]; then
    echo "npm パッケージは既にインストール済みです。"
else
    echo "npm パッケージをインストールしています..."
    npm install
fi

# 2. Playwright Chromium ブラウザのインストール
BROWSERS_DIR="${PLAYWRIGHT_BROWSERS_PATH:-$(pwd)/.playwright-browsers}"
export PLAYWRIGHT_BROWSERS_PATH="$BROWSERS_DIR"
if [ -d "$BROWSERS_DIR" ] && [ "$(ls -A "$BROWSERS_DIR" 2>/dev/null)" ]; then
    echo "Playwright Chromium は既にインストール済みです。"
else
    echo "Playwright Chromium ブラウザをインストールしています..."
    npx -y -p @playwright/mcp@latest playwright install chromium
fi

# 3. Claude Code のインストール（未インストールまたは動作しない場合のみ）
if claude -v >/dev/null 2>&1; then
    echo "Claude Code は既にインストール済みです。($(claude -v))"
else
    echo "Claude Code をインストールしています..."
    curl -fsSL https://claude.ai/install.sh | bash
    # PATHに追加（現在のシェルセッション用）
    export PATH="$HOME/.local/bin:$PATH"
    if claude -v >/dev/null 2>&1; then
        echo "Claude Code のインストールが完了しました。($(claude -v))"
    else
        echo "警告: Claude Code のインストールに失敗しました。手動で再試行してください:"
        echo "  curl -fsSL https://claude.ai/install.sh | bash"
    fi
fi

# 4. GitHub CLI 認証（デバイスフロー）
if gh auth status >/dev/null 2>&1; then
    echo "すでにGitHubに認証済みです。"
else
    echo "GitHubの認証を行います。画面に表示されるワンタイムコードをコピーし、"
    echo "自動で開くブラウザ（または表示されるURL）に入力して認証を許可してください。"

    gh auth login --hostname github.com --git-protocol https --web

    if [ $? -ne 0 ]; then
        echo "認証がキャンセルされたか失敗しました。処理を中断します。"
        exit 1
    fi
    echo "GitHubの認証が完了しました。"
fi

# 5. リポジトリの初期化と個別設定
if [ ! -d ".git" ]; then
    echo "リポジトリを初期化しています..."
    git init

    if [ -n "${TRAINEE_NAME:-}" ] && [ -n "${TRAINEE_EMAIL:-}" ]; then
        git config --local user.name "$TRAINEE_NAME"
        git config --local user.email "$TRAINEE_EMAIL"
    fi

    # .gitignore が .env を除外していることを確認してからコミット
    if ! grep -qx '\.env' .gitignore 2>/dev/null; then
        echo ".env" >> .gitignore
    fi

    git add .
    git commit -m "Initial commit for InsightLog training"
fi

# 6. GitHub上へのプライベートリポジトリ自動作成とPush
if ! git remote get-url origin >/dev/null 2>&1; then
    REPO_NAME="InsightLog-$(date +%s)"
    echo "プライベートリポジトリ ($REPO_NAME) を作成し、コードを送信します..."

    gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
else
    echo "リモート origin が既に設定済みです。プッシュします..."
    git push -u origin HEAD
fi

# 7. Codespaces アイドルタイムアウトを60分に設定
if [ -n "${CODESPACES:-}" ] && [ -n "${CODESPACE_NAME:-}" ]; then
    echo "Codespaces のアイドルタイムアウトを60分に設定しています..."
    gh api -X PATCH "/user/codespaces/${CODESPACE_NAME}" \
        -F idle_timeout_minutes=60 2>/dev/null \
        && echo "タイムアウト設定が完了しました。" \
        || echo "警告: タイムアウト設定に失敗しました。GitHub Settings > Codespaces から手動で設定してください。"
fi

echo "セットアップが完了しました。開発を開始できます。"
