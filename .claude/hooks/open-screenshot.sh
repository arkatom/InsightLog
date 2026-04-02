#!/bin/bash
# PostToolUse hook: Playwright スクリーンショットを VS Code プレビューで自動表示
#
# 優先順位:
#   1. tool_input.filename（Claude が指定したファイル名）
#   2. tool_response 内のファイルパス（MCP サーバーが返したパス）
#
# 前提: jq がインストール済み（Dockerfile で追加済み）
set -euo pipefail

# jq がなければ何もせず終了
if ! command -v jq &>/dev/null; then
  exit 0
fi

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

# 1. tool_input.filename から取得（推奨パス）
FILEPATH=$(echo "$INPUT" | jq -r '.tool_input.filename // empty')

# 2. filename がなければ tool_response からパスを抽出
if [ -z "$FILEPATH" ]; then
  FILEPATH=$(echo "$INPUT" | jq -r '
    .tool_response
    | if type == "object" then .path // .filePath // .fileName // empty
      elif type == "string" then
        (match("[\\w/.\\-]+\\.(?:png|jpeg|jpg)") | .string) // empty
      else empty
      end
  ' 2>/dev/null || true)
fi

# パスが取れなければ終了
if [ -z "$FILEPATH" ]; then
  exit 0
fi

# 相対パスを絶対パスに解決
if [[ "$FILEPATH" != /* ]] && [ -n "$CWD" ]; then
  FILEPATH="${CWD}/${FILEPATH}"
fi

# VS Code でプレビュー表示（Codespaces では code コマンドが利用可能）
if [ -f "$FILEPATH" ]; then
  # code が使えなければ無視（CI環境等）
  code "$FILEPATH" 2>/dev/null || true
fi

exit 0
