#!/bin/bash
# PostToolUse hook: Playwright スクリーンショットを VS Code プレビューで自動表示
#
# 優先順位:
#   1. tool_input.filename（Claude が指定したファイル名）
#   2. tool_response 内のファイルパス（MCP サーバーが返したパス）
#
# 前提: jq がインストール済み（Dockerfile で追加済み）
#
# 注意: set -e は使わない。jq パースエラーや code コマンド失敗で
# hook 全体が死ぬと Claude Code の動作に影響するため。

# jq がなければ何もせず終了
if ! command -v jq &>/dev/null; then
  exit 0
fi

INPUT=$(cat) || exit 0
CWD=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null) || CWD=""

# 1. tool_input.filename から取得（推奨パス）
FILEPATH=$(echo "$INPUT" | jq -r '.tool_input.filename // empty' 2>/dev/null) || FILEPATH=""

# 2. filename がなければ tool_response からパスを抽出
if [ -z "$FILEPATH" ]; then
  FILEPATH=$(echo "$INPUT" | jq -r '
    .tool_response
    | if type == "object" then .path // .filePath // .fileName // empty
      elif type == "string" then
        (match("[\\w/.\\-]+\\.(?:png|jpeg|jpg)") | .string) // empty
      else empty
      end
  ' 2>/dev/null) || FILEPATH=""
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
  code "$FILEPATH" 2>/dev/null || true
fi

exit 0
