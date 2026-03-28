---
name: heartbeat
description: |
  定期Heartbeat。直近のセッション活動を評価し、改善点があれば1件だけ
  .claude/memory/heartbeat/improvements.mdに追記する。改善点がなければHEARTBEAT_OKを出力。
  使用場面: セッション振り返り後、定期的な品質チェック、/loop 30m で自動実行。
---

# Heartbeat (coach)

## Hard rules

- 改善点がなければ `HEARTBEAT_OK` のみ出力して終了
- **1回のHeartbeatで記録する改善は最大1件**
- タスクを実行しない。設定を変更しない。提案のみ
- 秘密情報をログに書かない

## 実行手順

### 1. 早期終了チェック

`.claude/memory/reflection/` 内の最新ファイルの更新日時を確認する。
前回の Heartbeat（improvements.md の最終エントリの日付）以降に新しい振り返りがなければ:
→ `HEARTBEAT_OK` を出力して終了

### 2. 情報収集

以下を読み込む（存在するもののみ）:
- `.claude/memory/heartbeat/improvements.md` — 既存の改善ログ（重複提案の防止）
- `.claude/memory/reflection/` 内の最新ファイル — 直近のセッション振り返り
- `git log --oneline -20` — 直近のコミット履歴

### 3. 摩擦検出

[チェックリスト](./references/heartbeat-checklist.md) に従い、以下を検出する:

1. 同じエラーの2回以上の発生
2. 前提条件の欠落
3. 曖昧なプロンプト
4. リスクの高い操作
5. 過度な冗長性
6. 手順の抜け漏れ

既に improvements.md に記録済み（Status: proposed/applied）の問題は除外する。
ただし Status: applied なのに再発している場合は、新たなエントリとして記録する。

### 4. 改善ログ記入

摩擦を検出した場合、[テンプレート](./references/improvement-template.md) に従い
`.claude/memory/heartbeat/improvements.md` の末尾に **1件だけ** 追記する。

複数検出した場合は **最もインパクトが大きい1件のみ** を選択する。

### 5. 出力

- 改善を記録した場合:
  ```
  HEARTBEAT: logged 1 improvement -- "{short title}"
  ```
- 記録なし:
  ```
  HEARTBEAT_OK
  ```
- 未レビューの proposed が3件以上溜まっている場合:
  ```
  HEARTBEAT_OK (注意: 未レビューの提案が{N}件あります。/kaizen で確認してください)
  ```

## 禁止事項（coachの不可侵ルール）

- タスクの実行（コード変更、ビルド、テスト実行など）
- 設定ファイルの変更（settings.json, CLAUDE.md 等）
- 改善の自動適用
- 1回の Heartbeat で2件以上の改善記録
