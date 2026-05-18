# Claude Code Auto-Log Hooks

Claude Code の hooks を「タイムカード」として使い、作業イベントを **追記専用 JSONL** に積むスクリプト群。**1日1回まとめて InsightLog にインポートする運用** を前提に設計している。リポジトリ横断のタスク（複数 repo を行き来する開発）にも対応する。

## 設計方針

- **既定の出力先はユーザーホーム配下**：`$HOME/.claude/tmp/autolog/events.jsonl`。複数リポジトリの作業を1箇所に集約する。
- **追記専用 JSONL**。並行追記に強く、壊れにくい。
- **失敗してもツール実行をブロックしない**。フックスクリプトは常に `exit 0`。
- **プロジェクト内 `.claude/settings.json` で配線**。ユーザー設定 (`~/.claude/settings.json`) は触らない。
- **イベントには必ず `repo`（git toplevel）と `repo_remote`（origin URL）を載せる**。横断集計の主キー。

## 出力先の解決順

1. `INSIGHTLOG_AUTOLOG_DIR` 環境変数があればそれを使う（テスト・個別運用向け）
2. なければ `$HOME/.claude/tmp/autolog/`（既定。リポジトリ横断）
3. `$HOME` も無い場合は `$CLAUDE_PROJECT_DIR/.claude/tmp/autolog` または `$PWD/.claude/tmp/autolog`

リポ内 `.claude/tmp/` は `.gitignore` 済みなので、override してもコミット汚染しない。

## ファイル配置

```
.claude/hooks/
  autolog-common.sh         # 共通: 出力先解決・タイムスタンプ・JSONL 追記・git 情報・transcript 集計
  autolog-session-start.sh  # SessionStart 用
  autolog-stop.sh           # Stop 用（毎ターン、transcript ベースの累積メトリクス）
  autolog-session-end.sh    # SessionEnd 用（end_reason 付き最終スナップショット）
  autolog-posttool.sh       # PostToolUse(Bash) 用、git 系コマンドを検出
  autolog-daily-report.sh   # 日次サマリーを Markdown で標準出力
  README.md                 # 本ファイル

$HOME/.claude/tmp/autolog/      # 既定の出力先（または INSIGHTLOG_AUTOLOG_DIR）
  events.jsonl                  # メインのイベントログ（全リポ集約・追記専用）
  sessions/
    <session_id>.start          # 開始 ts 保存。transcript が読めない時の duration fallback
```

## イベントスキーマ

各行は 1 JSON。`ts` は ISO 8601 UTC ミリ秒精度。`session_id` は Claude Code が hook 入力で供給する値。

### 共通フィールド（多くのイベントに付く）

| field | 由来 | 備考 |
|---|---|---|
| `ts` | スクリプト実行時刻 | UTC ISO 8601 |
| `session_id` | hook 入力 `.session_id` | Claude Code 採番 |
| `cwd` | hook 入力 `.cwd` | Claude Code の作業ディレクトリ。hook 内で `cd` して以下の git 情報を取る |
| `repo` | `git rev-parse --show-toplevel` | リポジトリのトップレベル絶対パス |
| `repo_remote` | `git remote get-url origin`（不在時は最初の remote） | 横断集計の主キー候補 |
| `branch` | `git symbolic-ref --short HEAD` | detached HEAD では省略 |

git リポでないディレクトリで実行された場合は `repo` / `branch` / `repo_remote` は省略される。

### `session_start`

```json
{"ts":"...","type":"session_start","session_id":"...","cwd":"...","repo":"...","repo_remote":"...","branch":"feat/x","head_sha":"a1b2c3d","source":"startup"}
```

| 追加 field | 由来 | 備考 |
|---|---|---|
| `head_sha` | `git rev-parse --short HEAD` | セッション開始時点の HEAD |
| `source` | hook 入力 `.source` | `startup` / `resume` / `clear` / `compact` |

### `session_progress`

Claude Code の `Stop` フックは **毎ターン終了時に発火する**（セッション終了時だけではない）。なので各行は「そのターン終了時点の累積値スナップショット」として読む。インポート時はセッション内の最終行を「セッション終了時の値」として扱う。

Stop hook 入力には `duration` / `cost` フィールドが含まれないため、`transcript_path` で渡されるセッショントランスクリプトを jq で集計して取得する（`autolog_metrics_from_transcript`）。

```json
{"ts":"...","type":"session_progress","session_id":"...","repo":"...","branch":"...","duration_ms":22732315,"turn_count":390,"input_tokens":605,"output_tokens":482252,"cache_read_input_tokens":62459268,"cache_creation_input_tokens":1690357}
```

| 追加 field | 由来 | 備考 |
|---|---|---|
| `duration_ms` | transcript の最初〜最後のタイムスタンプ差分。なければ `session_start.ts` との差分にフォールバック | 累積 |
| `turn_count` | transcript 内の `type:"assistant"` 行数 | ≒ ターン数 |
| `input_tokens` | `message.usage.input_tokens` 合算 | 累積（キャッシュ抜きの新規入力） |
| `output_tokens` | `message.usage.output_tokens` 合算 | 累積 |
| `cache_read_input_tokens` | 同 cache_read 合算 | 累積（安価なキャッシュヒット） |
| `cache_creation_input_tokens` | 同 cache_creation 合算 | 累積 |

### `session_end`

`SessionEnd` フックでセッション終了時に一度だけ書かれる。終了理由 (`end_reason`) と最終累積値を持つ。フィールドは `session_progress` と同じに加えて：

```json
{"ts":"...","type":"session_end","session_id":"...","repo":"...","branch":"...","end_reason":"clear","duration_ms":...,"turn_count":...,...}
```

| 追加 field | 由来 | 備考 |
|---|---|---|
| `end_reason` | hook 入力 `.end_reason` | `clear` / `resume` / `logout` / `prompt_input_exit` 等 |

`SessionEnd` は **発火が保証されない**（端末強制終了等で出ない場合がある）。そのため import 側は `session_progress` と `session_end` の両方を「セッション末値の候補」として扱い、各セッションの最新タイムスタンプ行を採用する。

### `git_commit`

```json
{"ts":"...","type":"git_commit","session_id":"...","cwd":"...","repo":"...","repo_remote":"...","branch":"feat/x","commit":"a1b2c3","subject":"feat: ...","files":12}
```

| 追加 field | 由来 | 備考 |
|---|---|---|
| `commit` | `git rev-parse --short HEAD` | post-commit 時点の HEAD |
| `subject` | `git log -1 --pretty=%s` | コミットメッセージ1行目 |
| `files` | `git diff-tree --no-commit-id --name-only -r HEAD \| wc -l` | 変更ファイル数 |

### `git_push`

```json
{"ts":"...","type":"git_push","session_id":"...","cwd":"...","repo":"...","branch":"feat/x","command":"git push origin feat/x"}
```

push 完了は「完了候補」シグナルとして使う。実際の commit 範囲は別途 InsightLog 側で `repo × branch × 時間窓` から決定する。

### `git_checkout`

```json
{"ts":"...","type":"git_checkout","session_id":"...","cwd":"...","repo":"...","branch":"feat/y","to_branch":"feat/y","from_branch":"feat/x","command":"git switch feat/y"}
```

`from_branch` は `git reflog -1 HEAD@{0}` の `gs` フォーマットから抽出（`checkout: moving from X to Y` 形式）。取れない場合は省略。

## hooks 配線

`.claude/settings.json` の `hooks` に登録（このリポでは設定済み）：

```jsonc
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/autolog-session-start.sh" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/autolog-stop.sh" }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/autolog-session-end.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "bash .claude/hooks/autolog-posttool.sh" }] }
    ]
  }
}
```

別リポでも同じ運用にしたい場合は、各リポの `.claude/settings.json` に同じ配線を書く。出力先は既定で `$HOME/.claude/tmp/autolog/` に集約されるので、ログは一箇所に貯まる。

## events.jsonl の削減

events.jsonl は追記専用で、放置すると単調に増え続ける。削減方法は 2 つあり、用途で使い分ける。

### 1. ブラウザ取り込み時の物理削除（自動・推奨）

ImportModal で下書きを確定（タスクとして保存）した瞬間に、events.jsonl から該当イベントが物理削除される。

- File System Access API が必要（Chromium 系のみ）
- 初回のファイル選択時に「書込権限」のダイアログが出る。許可すれば以降の取り込みでは自動削除される
- 並行書込 race の対策として「書き戻し直前に再読込して新規追記分を保全」する実装
- 権限が拒否されている / 非対応ブラウザでは IndexedDB の「取り込み済み」フラグだけで重複防止する（events.jsonl は変わらない）

実装は `src/lib/autologMaintenance.ts` の `purgeImportedFromJsonl`。

### 2. `autolog-compact.sh` — session_progress の集約圧縮

同一 `session_id` の `session_progress` は累積値なので、最新 1 件だけ残せば情報損失なし。`session_start` / `session_end` / `git_*` は全部維持する。

```bash
# デフォルト出力先を圧縮
.claude/hooks/autolog-compact.sh

# 任意のファイルを圧縮
.claude/hooks/autolog-compact.sh /path/to/events.jsonl

# dry-run（行数の試算だけ）
INSIGHTLOG_COMPACT_DRY_RUN=1 .claude/hooks/autolog-compact.sh
```

- 並行追記対策: 圧縮中の追記分は `tail -c` で末尾だけ取り出して連結
- 50 ターン/セッションのファイルなら 50→1 で約 98% 削減

長期運用の目安: 月初に手動実行 or cron。自動化したくなったら `autolog-stop.sh` から行数閾値超過で呼ぶ追加可能（今は手動）。

## 日次レポート

1日の終わりに `autolog-daily-report.sh` を実行すると、その日のセッションとコミットを repo × branch でグルーピングした Markdown が出る。これを InsightLog の手動入力時のリファレンスに使う。

```bash
# 今日（UTC）
.claude/hooks/autolog-daily-report.sh

# 指定日
.claude/hooks/autolog-daily-report.sh 2026-05-18

# 範囲
.claude/hooks/autolog-daily-report.sh --since 2026-05-15 --until 2026-05-18
```

出力例：

```markdown
# InsightLog autolog 日次レポート

- 期間: 2026-05-18 〜 2026-05-18 (UTC)
- イベント総数: 42 / セッション開始: 3 / コミット: 8 / プッシュ: 2 / ブランチ切替: 5

## セッション集計

| session_id | repo | branch | duration | cost(USD) | +行/-行 |
|---|---|---|---:|---:|---:|
| abc12345 | InsightLog | feat/x | 1h20m | $1.23 | +120/-35 |
| def67890 | other-repo | feat/y | 45m | $0.67 | +40/-10 |

## リポジトリ × ブランチ別コミット

### InsightLog / feat/x (3 commits)
- `a1b2c3d` feat: 〜〜 — 2026-05-18T10:32:14Z
...
```

## アドホックなクエリ

```bash
EVENTS=$HOME/.claude/tmp/autolog/events.jsonl

# 直近のイベント
tail -n 20 $EVENTS | jq -c '{ts, type, repo, branch}'

# あるセッションの全イベント
jq -c 'select(.session_id == "<id>")' $EVENTS

# repo ごとの累計トークン（最終 progress/end を採用）
jq -s '
  map(select(.type=="session_progress" or .type=="session_end"))
  | group_by(.session_id)
  | map({repo: (.[0].repo // ""), out: (last.output_tokens // 0), dur: (last.duration_ms // 0)})
  | group_by(.repo)
  | map({repo: .[0].repo, total_output_tokens: (map(.out) | add), total_duration_ms: (map(.dur) | add)})
' $EVENTS

# 今日触ったブランチ一覧（repo × branch）
TODAY=$(date -u +%Y-%m-%d)
jq -r --arg d $TODAY 'select(.ts | startswith($d)) | "\(.repo // "?") / \(.branch // "?")"' $EVENTS | sort -u
```

## 既知の制約

1. **Claude Code 起動中の作業しか測れない**。エディタだけ開いて作業した時間は別途記録が要る。
2. **複数 Claude Code 並行起動** は session_id で識別できるが、人間が「同じタスクをやっていた」ことを後段で紐付ける必要がある（commit メッセージや branch 名で判別）。
3. **`cd /other && git ...` で別 repo を触った時**、hook は入力 `.cwd` をベースに git 情報を読むので大半は正しく検出するが、`.cwd` 更新が反映されていないタイミングでは元 repo として記録される可能性がある。確実に切り替えたい時は `cd` を独立した Bash 呼び出しにする。
4. **`git push` 後の HEAD 範囲** は post-hook では取れない。必要になったら push 直前に `@{u}..HEAD` を残す PreToolUse を追加する。
5. **ブラウザ取り込み時の物理削除と autolog-compact.sh の race**: ほぼ無視できる時間窓だが、両者を全く同時に実行すると新規追記分のロストが理論上ありうる。手動 compact は Claude Code 非稼働時に実行が安全。
