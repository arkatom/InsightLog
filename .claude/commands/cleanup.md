---
description: "デモ実行の後片付け。ワークツリー・ブランチ・ログ・スクリーンショットを削除する。"
---

# クリーンアップ

デモ実行（`demo/run.sh`）で生成されたワークツリー・ブランチ・ログ・スクリーンショットを削除する。

## 手順

### 1. ワークツリーの確認と削除

```bash
git worktree list
```

`main` 以外のワークツリーが存在する場合、一覧を表示してユーザーに削除確認する。

**各ワークツリーについて:**
- ワークツリーのパスとブランチ名を表示する
- `AskUserQuestion` で「このワークツリーを削除しますか？」と確認する
- 承認された場合のみ `git worktree remove --force <パス>` で削除する
- 紐づくブランチも `git branch -D <ブランチ名>` で削除する
- リモートブランチが存在する場合は `git push origin --delete <ブランチ名>` も提案する（実行前に確認）

### 2. ログファイルの確認と削除

```bash
ls -lh demo/logs/ 2>/dev/null
```

ログファイルが存在する場合:
- ファイル数・合計サイズを表示する
- `AskUserQuestion` で「ログファイルを削除しますか？（session_*.log, raw_*.jsonl）」と確認する
- 承認された場合のみ `rm demo/logs/session_*.log demo/logs/raw_*.jsonl` で削除する

### 3. スクリーンショット・ビデオの確認と削除

```bash
ls -lh demo/screenshots/*.png 2>/dev/null
ls -lh demo/screenshots/test-results/ 2>/dev/null
```

スクリーンショット・ビデオが存在する場合:
- ファイル数・合計サイズを表示する
- `AskUserQuestion` で「スクリーンショット・ビデオを削除しますか？」と確認する
- 承認された場合のみ削除する

### 4. その他の生成ファイル

以下のファイルも確認し、存在する場合は削除を提案する:
- `demo/feature_list.json`（毎回再生成されるので削除可）
- `demo/plan_output.md`（planner が生成した計画書）
- `demo/github_issue_number.txt`（Issue 番号キャッシュ — 削除すると次回新規 Issue が作成される旨を警告）

### 5. サマリー

削除した内容をまとめて表示する:
```
クリーンアップ完了:
  ワークツリー: N件削除
  ブランチ:     N件削除
  ログ:         N件 (XXX MB) 削除
  スクリーンショット: N件削除
  スキップ:     [スキップした項目]
```
