#!/bin/bash
# autolog-common.sh — InsightLog autolog hook の共通関数
# 直接実行せず、各 hook スクリプトから `.` (source) して使う。

# 出力先ディレクトリ。
# 解決順:
#   1) $INSIGHTLOG_AUTOLOG_DIR（明示指定、テストや個別運用向け）
#   2) $HOME/.claude/tmp/autolog（既定。リポジトリ横断で1箇所に集約する）
#   3) $CLAUDE_PROJECT_DIR/.claude/tmp/autolog または $PWD/.claude/tmp/autolog（HOME 不在時のフォールバック）
autolog_dir() {
  if [ -n "${INSIGHTLOG_AUTOLOG_DIR:-}" ]; then
    echo "$INSIGHTLOG_AUTOLOG_DIR"
    return
  fi
  if [ -n "${HOME:-}" ]; then
    echo "$HOME/.claude/tmp/autolog"
    return
  fi
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

# Git リポジトリのトップレベル絶対パス（リポでなければ空）
autolog_repo_root() {
  git --no-optional-locks rev-parse --show-toplevel 2>/dev/null || true
}

# origin の URL。無ければ最初に見つかった remote の URL。
autolog_repo_remote() {
  git --no-optional-locks remote get-url origin 2>/dev/null && return
  local first_remote
  first_remote=$(git --no-optional-locks remote 2>/dev/null | head -1)
  [ -n "$first_remote" ] || return 0
  git --no-optional-locks remote get-url "$first_remote" 2>/dev/null || true
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

# 指定ディレクトリにいる体で git 情報を読みたいとき、安全に cd する
# $1: 候補ディレクトリ。存在しなければ無視（cd しない）。
autolog_enter_cwd() {
  local target="$1"
  [ -n "$target" ] && [ -d "$target" ] && cd "$target" 2>/dev/null
  return 0
}
