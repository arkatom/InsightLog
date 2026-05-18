#!/bin/bash
# autolog-daily-report.sh — events.jsonl から1日分のサマリーを Markdown で出す
#
# 使い方:
#   .claude/hooks/autolog-daily-report.sh            # 今日（UTC）
#   .claude/hooks/autolog-daily-report.sh 2026-05-18 # 指定日
#   .claude/hooks/autolog-daily-report.sh --since 2026-05-15 --until 2026-05-18
#
# 出力先は標準出力。InsightLog 取り込み前の人間確認 / 日次まとめ用。

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/autolog-common.sh"

EVENTS="$(autolog_dir)/events.jsonl"
if [ ! -f "$EVENTS" ]; then
  echo "events.jsonl not found at $EVENTS" >&2
  exit 1
fi

# 引数解釈
SINCE=""
UNTIL=""
if [ $# -eq 0 ]; then
  SINCE="$(date -u +%Y-%m-%d)"
  UNTIL="$SINCE"
elif [ "$1" = "--since" ] || [ "$1" = "--until" ]; then
  while [ $# -gt 0 ]; do
    case "$1" in
      --since) SINCE="$2"; shift 2 ;;
      --until) UNTIL="$2"; shift 2 ;;
      *) echo "unknown arg: $1" >&2; exit 2 ;;
    esac
  done
  [ -n "$SINCE" ] || SINCE="1970-01-01"
  [ -n "$UNTIL" ] || UNTIL="$(date -u +%Y-%m-%d)"
else
  SINCE="$1"
  UNTIL="$1"
fi

# 範囲フィルタ → repo × branch ごとに集約
jq -s --arg since "$SINCE" --arg until "$UNTIL" '
  # 期間境界: [since 00:00:00Z, until+1day 00:00:00Z)
  ($since + "T00:00:00.000Z") as $lo
  | ($until + "T23:59:59.999Z") as $hi
  | map(select(.ts >= $lo and .ts <= $hi))
  | {
      since: $since,
      until: $until,
      total_events: length,
      sessions:    (map(select(.type == "session_start")) | length),
      commits:     [.[] | select(.type == "git_commit")],
      pushes:      [.[] | select(.type == "git_push")],
      checkouts:   [.[] | select(.type == "git_checkout")],
      progress:    [.[] | select(.type == "session_progress")],
      # repo × branch ごとにコミット
      by_repo_branch: (
        [.[] | select(.type == "git_commit")]
        | group_by([.repo, .branch])
        | map({
            repo:    (.[0].repo // "(unknown)"),
            branch:  (.[0].branch // "(detached)"),
            commits: map({ts, commit, subject, files}),
            count:   length
          })
      ),
      # セッション末の累積メトリクス（各 session_id の最後の session_progress）
      session_totals: (
        [.[] | select(.type == "session_progress")]
        | group_by(.session_id)
        | map({
            session_id: .[0].session_id,
            repo:       (.[0].repo // ""),
            branch:     (.[0].branch // ""),
            duration_ms:  (last.duration_ms  // 0),
            cost_usd:     (last.cost_usd     // 0),
            lines_added:  (last.lines_added  // 0),
            lines_removed:(last.lines_removed// 0)
          })
      )
    }
' "$EVENTS" \
| jq -r '
  def fmt_dur(ms):
    if ms == null or ms == 0 then "-"
    else
      (ms / 60000 | floor) as $m
      | ($m / 60 | floor) as $h
      | ($m % 60) as $mm
      | if $h > 0 then "\($h)h\($mm)m" else "\($mm)m" end
    end;
  def short_repo(r): if r == null or r == "" then "(unknown)" else (r | split("/") | last) end;

  "# InsightLog autolog 日次レポート",
  "",
  "- 期間: \(.since) 〜 \(.until) (UTC)",
  "- イベント総数: \(.total_events) / セッション開始: \(.sessions) / コミット: \(.commits|length) / プッシュ: \(.pushes|length) / ブランチ切替: \(.checkouts|length)",
  "",
  "## セッション集計",
  "",
  if (.session_totals|length) == 0 then "(なし)"
  else
    "| session_id | repo | branch | duration | cost(USD) | +行/-行 |",
    "|---|---|---|---:|---:|---:|",
    (.session_totals[] | "| \(.session_id[0:8]) | \(short_repo(.repo)) | \(.branch) | \(fmt_dur(.duration_ms)) | $\(.cost_usd) | +\(.lines_added)/-\(.lines_removed) |")
  end,
  "",
  "## リポジトリ × ブランチ別コミット",
  "",
  if (.by_repo_branch|length) == 0 then "(なし)"
  else
    (.by_repo_branch[] |
      "### \(short_repo(.repo)) / \(.branch) (\(.count) commits)",
      "",
      (.commits[] | "- `\(.commit // "?")` \(.subject // "(no subject)") — \(.ts)"),
      ""
    )
  end
'
