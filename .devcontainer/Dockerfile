FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Playwright の依存パッケージを事前インストール（ブラウザ本体は postCreateCommand で取得）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*
