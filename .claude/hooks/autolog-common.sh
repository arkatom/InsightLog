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

# ISO 8601 UTC、ミリ秒精度。
# 注意: GNU date の `%3N` は macOS の BSD date で literal `%3N` になってしまうため、
# プラットフォーム非依存のために jq で生成する。
autolog_ts() {
  jq -nr '
    now as $t |
    ($t | floor) as $sec |
    (($t - $sec) * 1000 | floor) as $ms |
    ($sec | gmtime | strftime("%Y-%m-%dT%H:%M:%S")) as $base |
    $base + (if $ms < 10 then ".00\($ms)" elif $ms < 100 then ".0\($ms)" else ".\($ms)" end) + "Z"
  '
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

# transcript ファイルからセッション累計メトリクスを JSON 1 行で出力。
# 引数: $1 transcript_path
# 出力フィールド: duration_ms / turn_count / input_tokens / output_tokens / cache_read_input_tokens / cache_creation_input_tokens
# 取れないフィールドは省略。transcript 不在なら空文字を返す。
autolog_metrics_from_transcript() {
  local path="$1"
  [ -n "$path" ] && [ -f "$path" ] || return 0

  # 累計 usage と最初/最後のタイムスタンプを 1 パスで集計
  jq -s '
    def usages: [.[] | select(.message.usage != null) | .message.usage];
    def tsmin: [.[].timestamp | select(. != null)] | sort | first // empty;
    def tsmax: [.[].timestamp | select(. != null)] | sort | last // empty;
    {
      _first: tsmin,
      _last: tsmax,
      turn_count: ([.[] | select(.type == "assistant")] | length),
      input_tokens: (usages | map(.input_tokens // 0) | add // 0),
      output_tokens: (usages | map(.output_tokens // 0) | add // 0),
      cache_read_input_tokens: (usages | map(.cache_read_input_tokens // 0) | add // 0),
      cache_creation_input_tokens: (usages | map(.cache_creation_input_tokens // 0) | add // 0)
    }
  ' "$path" 2>/dev/null || true
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

# 現在時刻 → epoch ms。jq の now を使うのでプラットフォーム非依存。
autolog_epoch_ms() {
  jq -nr 'now * 1000 | floor' 2>/dev/null || true
}

# ISO 8601 文字列 → epoch ms。
# jq の fromdateiso8601 は秒精度のみ対応のため、小数秒を別途取り出して加算する。
autolog_iso_to_epoch_ms() {
  local iso="$1"
  [ -z "$iso" ] && return 0
  jq -nr --arg ts "$iso" '
    # 小数秒（.123Z 等）を捕捉
    ($ts | capture("\\.(?<f>[0-9]+)Z$") // {f: "0"}) as $frac |
    # 小数秒を取り除いた整数秒部
    ($ts | sub("\\.[0-9]+Z$"; "Z")) as $clean |
    ($clean | fromdateiso8601 * 1000) as $base |
    # frac を 3 桁に正規化 ("812" → 812ms, "5" → 500ms, "12" → 120ms, "1234" → 123ms)
    (($frac.f + "000")[0:3] | tonumber) as $ms |
    $base + $ms
  ' 2>/dev/null || true
}

# 指定ディレクトリにいる体で git 情報を読みたいとき、安全に cd する
# $1: 候補ディレクトリ。存在しなければ無視（cd しない）。
autolog_enter_cwd() {
  local target="$1"
  [ -n "$target" ] && [ -d "$target" ] && cd "$target" 2>/dev/null
  return 0
}
