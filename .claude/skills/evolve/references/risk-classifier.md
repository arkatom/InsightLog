# リスク分類基準

/evolve が自動適用の可否を判定するための基準。

## Low-risk（自動適用可能）

以下の条件を **全て** 満たす変更:

1. 対象ファイルが以下のいずれか:
   - `.claude/skills/*/references/*.md`（スキルのリファレンスファイル）
   - `.claude/instructions/core/` 配下（**追記のみ**。既存行の変更を含まない）
   - `docs/memory/heartbeat/*.md`（append-only の追記）
2. 変更が「追記」のみ（既存の行を削除・変更しない）
3. 対象がコードファイル（.ts, .js, .py, .sh, .css, .html 等）ではない

## High-risk（人間キュー）

以下の **いずれか** に該当する変更:

1. `soul.md`, `CLAUDE.md`, `identity.md` への変更
2. `settings.json` / `settings.local.json` への変更
3. コードファイルへの変更
4. 新ファイルの作成
5. ファイルの削除
6. 既存行の変更・削除を伴う変更
7. Hook の追加・変更・削除
8. SKILL.md の Hard rules / description の変更

## 判定手順

1. improvements.md の `Risk-level` フィールドを確認する
2. Risk-level が未記入（旧フォーマット）の場合は、`Fix` の内容からこの基準に基づいて判定する
3. 判定結果が low でも、Fix の文言に「削除」「変更」「置換」「書き換え」が含まれる場合は high に格上げする
