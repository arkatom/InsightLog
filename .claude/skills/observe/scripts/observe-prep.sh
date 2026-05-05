#!/bin/bash
# observe-prep.sh
#
# 役割: /observe スキルのデータ準備フェーズを bash 完結で実行する。
#       (1) jsonl パス解決 (2) 早期終了判定 (3) heartbeat file 集約読込
#       (4) 強いシグナル grep スキャン (旧 scan-strong-signals.sh 機能を内包)
#       出力 (区切り付きセクションテキスト) を AI が文脈解釈して reflection /
#       improvements を生成する。
#
# 設計原則:
#   - Python / Node 不要 (bash + jq + grep + awk のみ)
#   - InsightLog devcontainer (javascript-node:22 + jq) で確実動作
#   - GitHub Codespace でも追加 install なし
#   - AI 解釈領域 (rubric / reflection 生成) と script 領域 (jsonl 走査) を分離
#
# 使い方:
#   bash apps/InsightLog/.claude/skills/observe/scripts/observe-prep.sh
#
# stdin (optional):
#   hook 経由 (SessionEnd / Stop) なら JSON payload (transcript_path / cwd / session_id)
#   非 hook (手動 /observe) なら stdin 空 → 環境変数 + cwd で導出
#
# stdout (区切り付きセクション、AI が解釈):
#   === META ===
#   pwd: <絶対パス>
#   skip_history: 0|1
#   slug: <slug>
#   project_dir: <CONFIG_DIR/projects/SLUG>
#   patterns_file: <scan-patterns.md path>
#   === EARLY_EXIT_CHECK ===
#   verdict: continue|early_exit_no_new_work|early_exit_skip_history
#   reason: <自然言語>
#   last_observe_iso: <ISO8601 or unknown>
#   === JSONL_PATHS ===
#   <path1> <mtime>
#   <path2> <mtime>
#   ...
#   === HEARTBEAT_FILES ===
#   --- improvements.md (tail -50) ---
#   ...
#   --- failure-patterns.md (tail -30) ---
#   ...
#   --- rubric-log.md (tail -10) ---
#   ...
#   === RECENT_REFLECTION ===
#   --- <latest reflection file path> ---
#   ...
#   === GIT_LOG ===
#   <git log --oneline -20 出力>
#   === SCAN_RESULTS ===
#   ... (旧 scan-strong-signals.sh 出力)
#
# 終了コード:
#   0  正常 (early exit 含む、AI が verdict で判断)
#   1  致命的エラー (jq 不在 / patterns file 不正 / cwd が repo 外 等)
#
# 依存: bash 3.2+ (macOS デフォルト互換、連想配列禁止), jq, grep, awk
#
# 設計の核 (旧 scan-strong-signals.sh 統合):
#   - カテゴリ定義は scan-patterns.md だけが single source
#   - skill_origin_markers カテゴリは「skill 由来 text の除外フィルター」
#     として特殊扱い、空だと user 全消去事故になるため fail-closed で停止
#   - 純 user text = jq で .type=="user" + tool_result 分離後、skill_origin で grep -v
set -eu

# ---------------------------------------------------------------------------
# 0. 依存チェック (fail-closed)
# ---------------------------------------------------------------------------
fatal() { echo "[observe-prep ERROR] $*" >&2; exit 1; }

command -v jq >/dev/null 2>&1 || fatal "jq が見つかりません。devcontainer に jq をインストールしてください"
command -v grep >/dev/null 2>&1 || fatal "grep が見つかりません"
command -v awk >/dev/null 2>&1 || fatal "awk が見つかりません"

# Devil-Edge#11 反映: HOME / CLAUDE_CONFIG_DIR の最低 1 つは設定必須
# CLAUDE_CONFIG_DIR が設定されていれば HOME 不要、両方未設定なら fatal
if [ -z "${CLAUDE_CONFIG_DIR:-}" ] && [ -z "${HOME:-}" ]; then
  fatal "HOME も CLAUDE_CONFIG_DIR も未設定。Claude Code 環境変数を確認してください"
fi

# 巨大 jsonl の scan を防ぐサイズ上限 (Devil-Edge#4 反映、デフォルト 50MB)
MAX_SCAN_BYTES="${OBSERVE_PREP_MAX_SCAN_BYTES:-52428800}"

# ---------------------------------------------------------------------------
# 1. stdin payload (hook 経由) と環境変数を解決
# ---------------------------------------------------------------------------
STDIN_PAYLOAD=""
if [ ! -t 0 ]; then
  STDIN_PAYLOAD=$(cat 2>/dev/null || true)
fi

HOOK_TRANSCRIPT=""
HOOK_CWD=""
if [ -n "$STDIN_PAYLOAD" ]; then
  HOOK_TRANSCRIPT=$(printf '%s' "$STDIN_PAYLOAD" | jq -r '.transcript_path // empty' 2>/dev/null || true)
  HOOK_CWD=$(printf '%s' "$STDIN_PAYLOAD" | jq -r '.cwd // empty' 2>/dev/null || true)
fi

PWD_ABS="${HOOK_CWD:-$(pwd)}"
CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SLUG=$(printf '%s' "$PWD_ABS" | sed 's|[^a-zA-Z0-9]|-|g')
PROJECT_JSONL_DIR="$CONFIG_DIR/projects/$SLUG"
SKIP_HISTORY="${CLAUDE_CODE_SKIP_PROMPT_HISTORY:-0}"

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SKILL_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
PATTERNS_FILE="$SKILL_DIR/references/scan-patterns.md"
[ -f "$PATTERNS_FILE" ] || fatal "scan-patterns.md が見つかりません: $PATTERNS_FILE"

# ---------------------------------------------------------------------------
# 2. last-observe-time 読取 (早期終了判定の基準)
# ---------------------------------------------------------------------------
LAST_OBSERVE_FILE="$PWD_ABS/.claude/tmp/last-observe-time"
LAST_OBSERVE_EPOCH=0
if [ -f "$LAST_OBSERVE_FILE" ]; then
  LAST_OBSERVE_EPOCH=$(cat "$LAST_OBSERVE_FILE" 2>/dev/null || echo 0)
  case "$LAST_OBSERVE_EPOCH" in
    ''|*[!0-9]*) LAST_OBSERVE_EPOCH=0 ;;
  esac
fi

if [ "$LAST_OBSERVE_EPOCH" -gt 0 ]; then
  LAST_OBSERVE_ISO=$(date -u -r "$LAST_OBSERVE_EPOCH" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
    || date -u -d "@$LAST_OBSERVE_EPOCH" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
    || echo unknown)
else
  LAST_OBSERVE_ISO=unknown
fi

# ---------------------------------------------------------------------------
# 3. 対象 jsonl 特定
# ---------------------------------------------------------------------------
JSONL_LIST_FILE=$(mktemp -t observe-prep-jsonl-XXXXXX)
trap 'rm -f "$JSONL_LIST_FILE"' EXIT

PROJECT_DIR_WARN=""
if [ -n "$HOOK_TRANSCRIPT" ] && [ -f "$HOOK_TRANSCRIPT" ]; then
  # hook 経由: transcript_path を最優先
  printf '%s\n' "$HOOK_TRANSCRIPT" > "$JSONL_LIST_FILE"
elif [ -d "$PROJECT_JSONL_DIR" ]; then
  # Devil-Edge#8 反映: 読取権限チェック、silent fail を防ぐ
  if [ ! -r "$PROJECT_JSONL_DIR" ]; then
    PROJECT_DIR_WARN="$PROJECT_JSONL_DIR は dir として存在するが読取権限なし (chmod 確認)"
  else
    # 手動: project dir 内 jsonl を mtime 降順で列挙
    # 前回 observe 以降に mtime 更新された全件を対象
    find "$PROJECT_JSONL_DIR" -maxdepth 1 -name '*.jsonl' -type f 2>/dev/null \
      | while IFS= read -r f; do
          mt=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
          if [ "$mt" -ge "$LAST_OBSERVE_EPOCH" ]; then
            printf '%s\t%s\n' "$mt" "$f"
          fi
        done \
      | sort -rn \
      | awk -F'\t' '{print $2}' > "$JSONL_LIST_FILE"
  fi
fi

JSONL_COUNT=$(wc -l < "$JSONL_LIST_FILE" | tr -d ' ')

# ---------------------------------------------------------------------------
# 4. 早期終了判定
# ---------------------------------------------------------------------------
EARLY_VERDICT=continue
EARLY_REASON="新規 jsonl mtime 更新あり、observe 続行"

if [ "$SKIP_HISTORY" = "1" ]; then
  EARLY_VERDICT=early_exit_skip_history
  EARLY_REASON="CLAUDE_CODE_SKIP_PROMPT_HISTORY=1 設定中、jsonl 永続化なしのため observe 不可"
elif [ "$JSONL_COUNT" = "0" ]; then
  if [ ! -d "$PROJECT_JSONL_DIR" ]; then
    EARLY_VERDICT=early_exit_no_new_work
    EARLY_REASON="$PROJECT_JSONL_DIR が存在しない (Claude Code 初回起動か slug 不一致)"
  else
    EARLY_VERDICT=early_exit_no_new_work
    EARLY_REASON="前回 observe ($LAST_OBSERVE_ISO) 以降に mtime 更新された jsonl なし"
  fi
fi

# ---------------------------------------------------------------------------
# 5. scan-strong-signals 機能 (旧 scan-strong-signals.sh 統合)
# ---------------------------------------------------------------------------
load_pattern() {
  awk -v cat="$1" '
    $0 == "## " cat || index($0, "## " cat " ") == 1 { found = 1; next }
    found && /^## / { exit }
    found {
      if ($0 ~ /^[[:space:]]*$/ || /^意図:/ || /^# /) next
      print; exit
    }
  ' "$PATTERNS_FILE"
}

load_label() {
  awk -v cat="$1" '
    $0 == "## " cat || index($0, "## " cat " ") == 1 {
      if (match($0, /\([^)]+\)/)) {
        print substr($0, RSTART+1, RLENGTH-2)
      } else {
        print cat
      }
      exit
    }
  ' "$PATTERNS_FILE"
}

list_categories() {
  awk '/^## [a-z_][a-z0-9_]* / { sub(/^## /, ""); sub(/ .*/, ""); print }' "$PATTERNS_FILE"
}

# bash 3.2 互換: 連想配列禁止、並列配列で管理
CATEGORIES=()
while IFS= read -r cat; do
  [ -z "$cat" ] && continue
  val=$(load_pattern "$cat")
  trimmed=$(printf '%s' "$val" | tr -d '[:space:]')
  if [ -z "$trimmed" ]; then
    fatal "scan-patterns.md カテゴリ '$cat' が空または空白のみ (fail-closed)"
  fi
  CATEGORIES+=("$cat")
done < <(list_categories)

[ "${#CATEGORIES[@]}" -gt 0 ] || fatal "scan-patterns.md からカテゴリ抽出 0 件"

SKILL_ORIGIN=$(load_pattern "skill_origin_markers")
[ -n "$SKILL_ORIGIN" ] || fatal "skill_origin_markers カテゴリが scan-patterns.md に未定義"

# ラベル幅の事前計算
LABEL_WIDTH=0
for cat in "${CATEGORIES[@]}"; do
  [ "$cat" = "skill_origin_markers" ] && continue
  label=$(load_label "$cat")
  w=${#label}
  if [ "$w" -gt "$LABEL_WIDTH" ]; then
    LABEL_WIDTH=$w
  fi
done

scan_file() {
  local file="$1"
  if [ ! -f "$file" ]; then
    echo "[scan WARN] jsonl が消えた: $file"
    return
  fi

  # Devil-Edge#4 反映: 巨大 jsonl のスキャンを skip して暴走防止
  local fsize
  fsize=$(stat -f %z "$file" 2>/dev/null || stat -c %s "$file" 2>/dev/null || echo 0)
  if [ "$fsize" -gt "$MAX_SCAN_BYTES" ]; then
    echo "--- $file ---"
    echo "[scan SKIPPED] file size ${fsize} bytes > MAX_SCAN_BYTES ${MAX_SCAN_BYTES}。OBSERVE_PREP_MAX_SCAN_BYTES で上限を変更可能"
    return
  fi

  local users
  users=$(jq -rc 'select(.type=="user") | .message.content | if type=="array" then map(select(.type=="text") | .text) | .[] else . end // ""' "$file" 2>/dev/null \
    | grep -vE "$SKILL_ORIGIN" || true)

  # Devil-Compat#9 反映: 空 users を 1 行扱いする bug 修正
  local user_message_count
  if [ -n "$users" ]; then
    user_message_count=$(printf '%s\n' "$users" | wc -l | tr -d ' ')
  else
    user_message_count=0
  fi

  echo "--- $file ---"
  printf "純 user text 行数:%*s%s\n" "$((LABEL_WIDTH - 16))" "" "$user_message_count"

  local cat label pattern count
  for cat in "${CATEGORIES[@]}"; do
    [ "$cat" = "skill_origin_markers" ] && continue
    label=$(load_label "$cat")
    pattern=$(load_pattern "$cat")
    if [ -n "$users" ]; then
      count=$(printf '%s\n' "$users" | grep -cE "$pattern" || true)
    else
      count=0
    fi
    printf "%s:%*s%s\n" "$label" "$((LABEL_WIDTH - ${#label}))" "" "$count"
  done
}

# ---------------------------------------------------------------------------
# 6. 出力 (区切り付きセクション)
# ---------------------------------------------------------------------------
echo "=== META ==="
echo "pwd: $PWD_ABS"
echo "skip_history: $SKIP_HISTORY"
echo "slug: $SLUG"
echo "project_dir: $PROJECT_JSONL_DIR"
echo "patterns_file: $PATTERNS_FILE"
echo "hook_transcript: ${HOOK_TRANSCRIPT:-<none>}"
echo "max_scan_bytes: $MAX_SCAN_BYTES"
if [ -n "$PROJECT_DIR_WARN" ]; then
  echo "warn: $PROJECT_DIR_WARN"
fi

echo "=== EARLY_EXIT_CHECK ==="
echo "verdict: $EARLY_VERDICT"
echo "reason: $EARLY_REASON"
echo "last_observe_iso: $LAST_OBSERVE_ISO"
echo "jsonl_count: $JSONL_COUNT"

echo "=== JSONL_PATHS ==="
if [ -s "$JSONL_LIST_FILE" ]; then
  while IFS= read -r f; do
    mt=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
    iso=$(date -u -r "$mt" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
      || date -u -d "@$mt" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
      || echo unknown)
    echo "$f $iso"
  done < "$JSONL_LIST_FILE"
fi

echo "=== HEARTBEAT_FILES ==="
HEARTBEAT_DIR="$PWD_ABS/docs/memory/heartbeat"
for spec in "improvements.md:50" "failure-patterns.md:30" "rubric-log.md:10"; do
  name="${spec%%:*}"
  n="${spec##*:}"
  path="$HEARTBEAT_DIR/$name"
  if [ -f "$path" ]; then
    echo "--- $name (tail -$n) ---"
    tail -n "$n" "$path"
  else
    echo "--- $name (not found at $path) ---"
  fi
done

echo "=== RECENT_REFLECTION ==="
REFLECT_DIR="$PWD_ABS/docs/memory/reflection"
if [ -d "$REFLECT_DIR" ]; then
  latest=$(find "$REFLECT_DIR" -maxdepth 1 -name '*.md' -type f 2>/dev/null \
    | while IFS= read -r f; do
        mt=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
        printf '%s\t%s\n' "$mt" "$f"
      done \
    | sort -rn | head -1 | awk -F'\t' '{print $2}')
  if [ -n "$latest" ] && [ -f "$latest" ]; then
    echo "--- $latest ---"
    cat "$latest"
  else
    echo "(reflection dir 空)"
  fi
else
  echo "(reflection dir 未作成: $REFLECT_DIR)"
fi

echo "=== GIT_LOG ==="
( cd "$PWD_ABS" && git log --oneline -20 2>/dev/null ) || echo "(git log 取得失敗、repo 外か git 不在)"

echo "=== SCAN_RESULTS ==="
if [ "$EARLY_VERDICT" = continue ] && [ -s "$JSONL_LIST_FILE" ]; then
  while IFS= read -r f; do
    scan_file "$f"
  done < "$JSONL_LIST_FILE"
else
  echo "(skipped: verdict=$EARLY_VERDICT)"
fi

echo "=== END ==="
exit 0
