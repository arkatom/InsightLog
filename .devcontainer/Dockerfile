FROM mcr.microsoft.com/devcontainers/javascript-node:22

# curl: setup.sh の Claude Code インストールで使用
# jq: .claude/hooks/ のスクリプトで使用
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Playwright Chromium のシステム依存パッケージをイメージに事前インストール
# ランタイムでの --with-deps (sudo 必要) を不要にし、Codespaces でも確実に動作させる
RUN npx -y playwright install-deps chromium
