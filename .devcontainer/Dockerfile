FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Claude Code のインストールに必要なパッケージを追加
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Claude Code のインストール（公式推奨のネイティブ版）
# root権限でインストール後、全ユーザーからアクセス可能な /usr/local/bin に移動する
RUN curl -fsSL https://claude.ai/install.sh | bash \
    && mv /root/.local/bin/claude /usr/local/bin/claude \
    && chmod +x /usr/local/bin/claude
