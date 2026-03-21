FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Claude Code のインストールに必要なパッケージを追加
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Claude Code をシステムワイドにインストール（root として実行 → /usr/local/bin に配置）
# USER node で実行すると /home/node/.local への書き込みが Docker layer を圧迫するため
RUN npm install -g @anthropic-ai/claude-code
