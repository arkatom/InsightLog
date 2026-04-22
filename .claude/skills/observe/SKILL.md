---
name: observe
description: |
  セッションの観察・評価・改善提案を一括実行する。
  (1) 振り返り記録の生成 (2) Rubric スコアリング (3) 摩擦検出と改善提案。
  改善点があれば improvements.md に1件追記。なければ OBSERVE_OK を出力。
  使用場面: セッション終了時、/loop での定期実行、Stop hook からの自動トリガー。
---

# Observe (coach)

## Hard rules

- 1回の observe で記録する改善は最大1件
- タスクを実行しない。設定を変更しない。提案のみ
- 秘密情報をログに書かない
- improvements.md の過去エントリを編集・削除しない

## 実行手順

### 1. 早期終了チェック

前回の observe 以降に新しい作業があるか確認する:
- `docs/memory/reflection/` 内の最新ファイルの更新日時
- `git log --oneline -5` で直近のコミット

前回の observe（improvements.md の最終エントリの日付）以降に新しい振り返りもコミットもなければ:
→ `OBSERVE_OK` を出力して終了

### 2. 情報収集

以下を読み込む（存在するもののみ）:
- `docs/memory/heartbeat/improvements.md` -- 既存の改善ログ（重複提案の防止）
- `docs/memory/heartbeat/failure-patterns.md` -- 既知の失敗パターン（再発検出）
- `docs/memory/heartbeat/rubric-log.md` -- 直近のスコア推移
- `docs/memory/reflection/` 内の最新ファイル（あれば）
- `git log --oneline -20` -- 直近のコミット履歴

### 3. 振り返り記録

[テンプレート](./references/reflection-template.md) に従い、`docs/memory/reflection/YYYYMMDD_{title}.md` を生成する。

Handshake, 摩擦ポイント, 得られた知見, 次回アクション, 刺さったフレーズの5セクションに加えて、
Rubric Score セクションを含める。

### 4. Rubric スコアリング

5基準10点満点でセッション品質を評価する:

| 基準 | 配点 | 判定方法 |
|------|------|----------|
| 手戻り率 | 3 | やり直し 0回=3, 1回=2, 2回=1, 3回以上=0 |
| 指示理解度 | 2 | ユーザーの修正指示 0回=2, 1回=1, 2回以上=0 |
| 前提確認 | 2 | 必要な前提を全確認=2, 一部漏れ=1, 確認なし=0 |
| 動作検証 | 2 | 全変更を検証=2, 一部=1, 未検証=0 |
| 後片付け | 1 | 残骸なし=1, あり=0 |

スコアを振り返りファイルの Rubric Score セクションに記録し、
`docs/memory/heartbeat/rubric-log.md` にも1行追記する:
```
YYYY-MM-DD | N/10 | 手戻りN 指示N 前提N 検証N 片付けN | {セッション概要}
```

### 5. 摩擦検出

[チェックリスト](./references/checklist.md) に従い、以下を検出する:

1. 同じエラーの2回以上の発生
2. 前提条件の欠落
3. 曖昧なプロンプト
4. リスクの高い操作
5. 過度な冗長性
6. 手順の抜け漏れ

既に improvements.md に記録済み（Status: proposed/applied）の問題は除外する。
ただし Status: applied なのに再発している場合は、failure-patterns.md を更新し、新たなエントリとして記録する。

### 6. 失敗パターン照合

摩擦ポイントを `docs/memory/heartbeat/failure-patterns.md` の既存パターンと照合する:
- 既知パターンに該当 → 発生回数を更新、最終発生日を更新
- 新規パターン → 新しい行を追加

### 7. 改善提案

摩擦を検出した場合、[テンプレート](./references/improvement-template.md) に従い
`docs/memory/heartbeat/improvements.md` の末尾に **1件だけ** 追記する。

複数検出した場合は **最もインパクトが大きい1件のみ** を選択する。
Rubric スコアが特定の基準で目標（8.0/10）を下回っている場合は、その基準に関連する改善を優先する。

### 8. 出力

- 改善を記録した場合:
  ```
  OBSERVE: logged 1 improvement -- "{short title}" (rubric: N/10)
  ```
- 記録なし:
  ```
  OBSERVE_OK (rubric: N/10)
  ```
- 未レビューの proposed が2件以上溜まっている場合:
  ```
  OBSERVE_OK (rubric: N/10, 注意: 未レビューの提案が{N}件。/evolve で処理してください)
  ```

### 9. 実行時刻の記録（commit-hook 連携用）

ステップ 1〜8 が完了したら、必ず最後に以下を実行して `/observe` の最終実行時刻を記録する:

```bash
mkdir -p "${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/tmp"
date -u +%s > "${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/tmp/last-observe-time"
```

このタイムスタンプは `.claude/hooks/observe-check-commit.sh`（PostToolUse hook）が読み、前回 `/observe` から 1 時間以上経過していたら次の `git commit` 完了後に Claude へ「`/observe` 実行を推奨」のメッセージを差し込む仕組みで使われる。記録を忘れると hook が「実行記録なし」と判断して毎回プロンプトが出るので、ステップ 9 まで必ず実行する。
