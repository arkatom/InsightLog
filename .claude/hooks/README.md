# Claude Code Auto-Log Hooks

Claude Code の hooks を「タイムカード」として使い、作業イベントを `.claude/tmp/autolog/events.jsonl` に追記するスクリプト群。後段で InsightLog のタスクログにインポートする想定。

## 設計方針

- **`.claude/tmp/` 配下にだけ書き出す**（gitignore 済み）。リポジトリは汚さない。
- **追記専用 JSONL**。並行追記に強く、壊れにくい。
- **失敗してもツール実行をブロックしない**。フックスクリプトは常に `exit 0`。
- **プロジェクト内 `.claude/settings.json` で配線**。ユーザー設定 (`~/.claude/settings.json`) は触らない。

## ファイル配置

```
.claude/
  hooks/
    autolog-common.sh         # 共通: JSONL 追記関数・パス決定
    autolog-session-start.sh  # SessionStart 用
    autolog-stop.sh           # Stop 用
    autolog-posttool.sh       # PostToolUse(Bash) 用、git 系コマンドを検出
    README.md                 # 本ファイル
  tmp/                        # gitignored
    autolog/
      events.jsonl            # メインのイベントログ（追記専用）
      sessions/
        <session_id>.start    # 開始 ts 保存。Stop hook で duration 計算に使う
```

## イベントスキーマ

各行は 1 JSON。`ts` は ISO 8601 UTC、`session_id` は Claude Code が提供する値。

### `session_start`

```json
{"ts":"2026-05-18T10:00:01.234Z","type":"session_start","session_id":"abc123","cwd":"/workspaces/InsightLog","branch":"feat/x","head_sha":"a1b2c3d","source":"startup"}
```

| field | 由来 | 備考 |
|---|---|---|
| `ts` | 実行時刻 | UTC ISO 8601 |
| `session_id` | hook 入力 `.session_id` | Claude Code 採番 |
| `cwd` | hook 入力 `.cwd` | 実行ディレクトリ |
| `branch` | `git symbolic-ref` | git リポでない場合は省略 |
| `head_sha` | `git rev-parse HEAD` | short SHA |
| `source` | hook 入力 `.source` | `startup` / `resume` / `clear` / `compact` |

### `session_progress`

Claude Code の `Stop` フックは **毎ターン終了時に発火する**（セッション終了時だけではない）。なので各行は「そのターン終了時点の累積値スナップショット」として読む。インポート時はセッション内の最終行を「セッション終了時の値」として扱う。

```json
{"ts":"2026-05-18T11:05:00.567Z","type":"session_progress","session_id":"abc123","duration_ms":3899333,"cost_usd":1.234,"lines_added":120,"lines_removed":35}
```

| field | 由来 | 備考 |
|---|---|---|
| `duration_ms` | Stop hook 入力 `.cost.total_duration_ms`、なければ `session_start.ts` との差分から計算 | 累積 |
| `cost_usd` | Stop hook 入力 `.cost.total_cost_usd` | 累積。取れない環境では省略 |
| `lines_added` / `lines_removed` | Stop hook 入力 `.cost.total_lines_*` | 累積。取れない環境では省略 |

### `git_commit`

```json
{"ts":"...","type":"git_commit","session_id":"...","branch":"feat/x","commit":"a1b2c3","subject":"feat: add hooks","files":12,"cwd":"..."}
```

| field | 由来 | 備考 |
|---|---|---|
| `commit` | `git rev-parse --short HEAD` | post-commit 時点の HEAD |
| `subject` | `git log -1 --pretty=%s` | 1行目のみ |
| `files` | `git show --stat HEAD` から件数抽出 | 変更ファイル数 |

### `git_push`

```json
{"ts":"...","type":"git_push","session_id":"...","branch":"feat/x","command":"git push origin feat/x","cwd":"..."}
```

push 完了は「完了候補」シグナルとして使う。実際の commit 範囲は別途 InsightLog 側でブランチ × 時間窓から決定する。

### `git_checkout`

```json
{"ts":"...","type":"git_checkout","session_id":"...","to_branch":"feat/y","from_branch":"feat/x","command":"git switch feat/y","cwd":"..."}
```

`from_branch` は `git reflog -1 HEAD@{1}` から抽出（取れない場合は省略）。

## hooks 配線

`.claude/settings.json` の `hooks` に以下を登録：

```jsonc
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/autolog-session-start.sh" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "bash .claude/hooks/autolog-stop.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "bash .claude/hooks/autolog-posttool.sh" }] }
    ]
  }
}
```

## 確認方法

```bash
# 直近のイベントを見る
tail -n 20 .claude/tmp/autolog/events.jsonl | jq -c '{ts, type, branch, session_id}'

# あるセッションの全イベント
jq -c 'select(.session_id == "<id>")' .claude/tmp/autolog/events.jsonl

# 累計コスト
jq -s 'map(select(.type=="session_stop") | .cost_usd) | add' .claude/tmp/autolog/events.jsonl
```

## 既知の制約

1. **Claude Code 起動中の作業しか測れない**。手動の作業時間は別途記録が要る。
2. **複数 Claude Code 並行起動**は session_id で識別できるが、人間が「同じタスクをやっていた」ことを判別するのは後段の InsightLog 側ロジック。
3. **`git push` 後の HEAD 範囲は post-hook では取れない**。push 直前にローカル `@{u}..HEAD` を残す PreToolUse を後で追加する余地あり。
