#!/bin/bash
# autolog-common.sh — InsightLog autolog hook の共通関数
# 直接実行せず、各 hook スクリプトから `.` (source) して使う。

# 出力先ディレクトリ。CLAUDE_PROJECT_DIR があればそれを優先。
autolog_dir() {
  local base="${CLAUDE_PROJECT_DIR:-$PWD}"
  echo "$base/.claude/tmp/autolog"
}

# ISO 8601 UTC、ミリ秒精度（取れなければ秒精度）
autolog_ts() {
  date -u +"%Y-%m-%dT%H:%M:%S.%3NZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# 必要ディレクトリを作る
autolog_init() {
  mkdir -p "$(autolog_dir)/sessions"
}

# JSON 1 行を events.jsonl に追記
# $1: 完成済み JSON 文字列（改行なし）
autolog_append() {
  autolog_init
  printf '%s\n' "$1" >> "$(autolog_dir)/events.jsonl"
}

# 現在の git ブランチ（rev-parse 単独だと detached HEAD で短 SHA を返してしまうため二段構え）
autolog_branch() {
  git --no-optional-locks symbolic-ref --short HEAD 2>/dev/null || true
}

autolog_head_sha() {
  git --no-optional-locks rev-parse --short HEAD 2>/dev/null || true
}

# epoch ミリ秒（GNU date 想定。失敗時は空）
autolog_epoch_ms() {
  date -u +%s%3N 2>/dev/null || true
}

# ISO 8601 文字列 → epoch ms（GNU date のみ）
autolog_iso_to_epoch_ms() {
  local iso="$1"
  [ -z "$iso" ] && return 0
  date -u -d "$iso" +%s%3N 2>/dev/null || true
}
