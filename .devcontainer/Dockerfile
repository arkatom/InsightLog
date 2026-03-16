FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Claude Code のインストールに必要なパッケージを追加
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Claude Code を node ユーザーとしてインストール
USER node
RUN curl -fsSL https://claude.ai/install.sh | bash
