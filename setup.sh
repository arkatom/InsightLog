#!/bin/bash

# .envファイルの読み込み
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "エラー: .env ファイルが見つかりません。"
    exit 1
fi

echo "=== 研修環境の初期セットアップを開始します ==="

# 1. GitHub CLI 認証（デバイスフロー）
if gh auth status >/dev/null 2>&1; then
    echo "✅ すでにGitHubに認証済みです。"
else
    echo "🔑 GitHubの認証を行います。画面に表示されるワンタイムコードをコピーし、"
    echo "   自動で開くブラウザ（または表示されるURL）に入力して認証を許可してください。"

    gh auth login --hostname github.com --git-protocol https --web

    if [ $? -ne 0 ]; then
        echo "❌ 認証がキャンセルされたか失敗しました。処理を中断します。"
        exit 1
    fi
    echo "✅ GitHubの認証が完了しました。"
fi

# 2. リポジトリの初期化と個別設定
if [ ! -d ".git" ]; then
    echo "📦 リポジトリを初期化しています..."
    git init

    if [ -n "$TRAINEE_NAME" ] && [ -n "$TRAINEE_EMAIL" ]; then
        git config --local user.name "$TRAINEE_NAME"
        git config --local user.email "$TRAINEE_EMAIL"
    fi

    git add .
    git commit -m "Initial commit for InsightLog training"
fi

# 3. GitHub上へのプライベートリポジトリ自動作成とPush
REPO_NAME="InsightLog-$(date +%s)"
echo "🚀 プライベートリポジトリ ($REPO_NAME) を作成し、コードを送信します..."

gh repo create "$REPO_NAME" --private --source=. --remote=origin --push

echo "🎉 セットアップが完了しました。開発を開始できます。"
