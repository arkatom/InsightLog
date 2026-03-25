FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Claude Code のインストールに必要なパッケージを追加
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Claude Code のインストール（公式推奨のネイティブ版）
# node ユーザーとしてインストールし、シンボリックリンクの実体ごと正しく配置する
USER node
RUN curl -fsSL https://claude.ai/install.sh | bash
USER root
RUN ln -sf /home/node/.local/bin/claude /usr/local/bin/claude
