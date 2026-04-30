#!/bin/bash
# observe scan-strong-signals.sh
#
# 役割: session jsonl 群から「純 user text」を抽出し、scan-patterns.md で
#       定義された各カテゴリ (anger / rework など) のヒット数を出力する。
#       observe SKILL.md の「補助 grep スキャン」を外部スクリプト化したもの。
#
# 使い方:
#   bash scan-strong-signals.sh <patterns-file> <jsonl-file> [<jsonl-file>...]
#
# 引数:
#   patterns-file  scan-patterns.md の絶対 or 相対パス (single source of truth)
#   jsonl-file     1 件以上の session jsonl ファイル
#
# 出力:
#   各 jsonl について `=== <path> ===` ヘッダ + カテゴリ別ヒット数を行ごとに出力
#
# 終了コード:
#   0  成功
#   1  patterns-file 不正 / カテゴリ未定義 / 空パターン (fail-closed)
#   2  jsonl ファイル不正 (存在しない / 読めない)
#
# 依存: bash 3.2+ (macOS デフォルト互換), jq, grep, awk
#       Python / Node / 連想配列 (bash 4+) は使わない。
#
# 設計の核 (Codex Layer 3 検証済):
#   - カテゴリ定義は scan-patterns.md だけが single source。スクリプトは
#     `## カテゴリ名 (日本語ラベル)` 形式の見出し本文を auto-derive する。
#     カテゴリ追加 = scan-patterns.md 編集だけで反映 (3 ファイル同期を 1 に)
#   - skill_origin_markers カテゴリは「skill 由来 text の除外フィルター」
#     として特殊扱い。空だと user 全消去事故になるため fail-closed で停止
#   - 純 user text = jq で .type=="user" + tool_result を分離した後、
#     skill_origin_markers で grep -v 除外したもの
#
set -eu

PATTERNS_FILE="${1:-}"
if [ -z "$PATTERNS_FILE" ] || [ ! -f "$PATTERNS_FILE" ]; then
  echo "[scan-strong-signals ERROR] patterns file が指定されていないか存在しない: ${PATTERNS_FILE:-<未指定>}" >&2
  echo "usage: bash $0 <patterns-file> <jsonl-file> [<jsonl-file>...]" >&2
  exit 1
fi
shift

if [ "$#" -eq 0 ]; then
  echo "[scan-strong-signals ERROR] jsonl ファイルが 1 件も指定されていない" >&2
  exit 1
fi

# 単一カテゴリのパターン本文を取得 (見出し直下の空行 / 意図: 行 / コメント行を
# スキップし、最初の非空非コメント行を返す)。
load_pattern() {
  local cat="$1"
  awk -v cat="$cat" '
    $0 == "## " cat || index($0, "## " cat " ") == 1 { found = 1; next }
    found && /^## / { exit }
    found {
      if ($0 ~ /^[[:space:]]*$/ || /^意図:/ || /^# /) next
      print; exit
    }
  ' "$PATTERNS_FILE"
}

# 単一カテゴリの日本語ラベル (`## anger (強い怒り表現)` の括弧内) を取得。
# 見出しに `(` がない場合はカテゴリ名そのままを返す (フォールバック)。
load_label() {
  local cat="$1"
  awk -v cat="$cat" '
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

# scan-patterns.md 内の `## ascii_word_name ` 形式のカテゴリ見出しを抽出。
# 日本語見出し (## SKILL.md との同期関係 など) は ascii 単語ではないので
# 自動的に除外される。
list_categories() {
  awk '/^## [a-z_][a-z0-9_]* / { sub(/^## /, ""); sub(/ .*/, ""); print }' "$PATTERNS_FILE"
}

# bash 3.2 互換のため連想配列ではなく並列配列で管理。
CATEGORIES=()
while IFS= read -r cat; do
  [ -z "$cat" ] && continue
  val=$(load_pattern "$cat")
  trimmed=$(printf '%s' "$val" | tr -d '[:space:]')
  if [ -z "$trimmed" ]; then
    echo "[scan-strong-signals ERROR] scan-patterns.md のカテゴリ '$cat' が空または空白のみ (fail-closed)" >&2
    exit 1
  fi
  CATEGORIES+=("$cat")
done < <(list_categories)

if [ "${#CATEGORIES[@]}" -eq 0 ]; then
  echo "[scan-strong-signals ERROR] scan-patterns.md からカテゴリを 1 件も抽出できなかった" >&2
  exit 1
fi

SKILL_ORIGIN=$(load_pattern "skill_origin_markers")
if [ -z "$SKILL_ORIGIN" ]; then
  echo "[scan-strong-signals ERROR] skill_origin_markers カテゴリが scan-patterns.md に未定義" >&2
  exit 1
fi

# ラベル幅 (右寄せ揃え用) を事前計算。
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
    echo "[scan-strong-signals ERROR] jsonl が存在しない: $file" >&2
    exit 2
  fi

  local users
  # jq で user 発話のみ抽出 (tool_result を分離) → skill_origin で除外
  users=$(jq -rc 'select(.type=="user") | .message.content | if type=="array" then map(select(.type=="text") | .text) | .[] else . end // ""' "$file" 2>/dev/null \
    | grep -vE "$SKILL_ORIGIN" || true)

  local user_message_count
  user_message_count=$(printf '%s\n' "$users" | wc -l | tr -d ' ')

  echo "=== $file ==="
  printf "純 user text 行数:%*s%s\n" "$((LABEL_WIDTH - 16))" "" "$user_message_count"

  local cat label pattern count
  for cat in "${CATEGORIES[@]}"; do
    [ "$cat" = "skill_origin_markers" ] && continue
    label=$(load_label "$cat")
    pattern=$(load_pattern "$cat")
    count=$(printf '%s\n' "$users" | grep -cE "$pattern" || true)
    printf "%s:%*s%s\n" "$label" "$((LABEL_WIDTH - ${#label}))" "" "$count"
  done
}

for f in "$@"; do
  scan_file "$f"
done
