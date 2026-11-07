#!/bin/bash
# autolog-compact.sh — events.jsonl を圧縮する
#
# 同一 session_id の session_progress は累積値なので、最新の1行だけ残せば
# 情報損失なく大幅に減らせる。session_start / session_end / git_* は全部残す。
#
# 使い方:
#   .claude/hooks/autolog-compact.sh            # デフォルト出力先を対象
#   .claude/hooks/autolog-compact.sh /path/to/events.jsonl
#   INSIGHTLOG_AUTOLOG_DIR=... .claude/hooks/autolog-compact.sh
#
# 動作:
#   1. 入力ファイルを別パスにコピー（snapshot）
#   2. snapshot を jq で圧縮、tmp に書き出し
#   3. tmp を入力ファイル位置に rename（原子的）
#   4. snapshot 以降に追記された分があれば失わないよう、書き戻し直前に再読込して追加
#
# 注意:
#   - 並行する hooks 追記との race window はゼロではない（書込開始〜rename 間）が、
#     実用上は無視できる小さなウィンドウ。
#   - dry-run したい場合は INSIGHTLOG_COMPACT_DRY_RUN=1 を指定。

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/autolog-common.sh"

INPUT_FILE="${1:-$(autolog_dir)/events.jsonl}"
DRY_RUN="${INSIGHTLOG_COMPACT_DRY_RUN:-0}"

if [ ! -f "$INPUT_FILE" ]; then
  echo "events.jsonl が見つかりません: $INPUT_FILE" >&2
  exit 1
fi

BEFORE_LINES=$(wc -l < "$INPUT_FILE")
BEFORE_BYTES=$(wc -c < "$INPUT_FILE")

# Step 1: snapshot
SNAPSHOT=$(mktemp)
cp "$INPUT_FILE" "$SNAPSHOT"

# Step 2: 圧縮
# 全イベントを読み、session_progress については session_id ごとに最新だけ残す
TMP_OUT=$(mktemp)
jq -sc '
  # session_progress を session_id ごとに集めて max_by(.ts) で 1 つだけ残す
  (map(select(.type == "session_progress")) | group_by(.session_id) | map(max_by(.ts))) as $progress_kept
  | (map(select(.type != "session_progress"))) as $others
  | ($progress_kept + $others)
  | sort_by(.ts)
  | .[]
' "$SNAPSHOT" > "$TMP_OUT"

AFTER_LINES=$(wc -l < "$TMP_OUT")

if [ "$DRY_RUN" = "1" ]; then
  echo "=== dry-run ==="
  echo "  input:     $INPUT_FILE"
  echo "  before:    $BEFORE_LINES lines / $BEFORE_BYTES bytes"
  echo "  after:     $AFTER_LINES lines"
  echo "  reduction: $((BEFORE_LINES - AFTER_LINES)) lines"
  rm -f "$SNAPSHOT" "$TMP_OUT"
  exit 0
fi

# Step 3: snapshot 以降の追記分を保全
INPUT_NOW_BYTES=$(wc -c < "$INPUT_FILE")
if [ "$INPUT_NOW_BYTES" -gt "$BEFORE_BYTES" ]; then
  # snapshot 取得後に追記された行をそのまま付ける
  tail -c "+$((BEFORE_BYTES + 1))" "$INPUT_FILE" >> "$TMP_OUT"
fi

# Step 4: 原子的に置換
mv "$TMP_OUT" "$INPUT_FILE"
rm -f "$SNAPSHOT"

AFTER_BYTES=$(wc -c < "$INPUT_FILE")
FINAL_LINES=$(wc -l < "$INPUT_FILE")

echo "compacted: $INPUT_FILE"
echo "  lines: $BEFORE_LINES → $FINAL_LINES ($((BEFORE_LINES - FINAL_LINES)) 行削減)"
echo "  bytes: $BEFORE_BYTES → $AFTER_BYTES ($((BEFORE_BYTES - AFTER_BYTES)) バイト削減)"
