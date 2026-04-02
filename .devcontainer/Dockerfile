FROM mcr.microsoft.com/devcontainers/javascript-node:22

# curl: setup.sh の Claude Code インストールで使用
# jq: .claude/hooks/ のスクリプトで使用
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*
