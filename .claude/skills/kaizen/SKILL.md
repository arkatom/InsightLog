---
name: kaizen
description: |
  改善提案の採用・却下を管理する。improvements.mdのproposed項目を一覧表示し、
  ユーザーの判断で採用(applied)・却下(rejected)・保留を記録する。
  採用時はdiff案を提示し、承認されたら適用まで行う。
  使用場面: Heartbeat後の提案レビュー、定期的な改善サイクル管理。
---

# Kaizen (改善レビュー)

## 実行手順

### 1. 提案一覧の取得

`.claude/memory/heartbeat/improvements.md` を読み、`Status: proposed` の項目を抽出する。

- proposed が0件の場合: 「未レビューの提案はありません」と報告して終了
- proposed がある場合: 一覧を簡潔に表示（日付、タイトル、Root cause、Fix の要約）

### 2. 各提案のレビュー

proposed の項目を1件ずつユーザーに提示し、AskUserQuestion で判断を求める:

- **採用**: 提案を採用する → ステップ3へ
- **却下**: 提案を却下する → ステップ4へ
- **保留**: 今回は保留（変更なし）→ 次の提案へ

### 3. 採用時の処理

#### 3a. ログ更新
1. `.claude/memory/heartbeat/improvements.md` の該当項目の `Status: proposed` を `Status: applied` に更新
2. `.claude/memory/heartbeat/decisions.md` に追記:

```markdown
## YYYY-MM-DD -- 採用: {proposal title}
- Why: {採用理由}
- Expected impact: {期待される効果（improvements.mdから転記）}
- Rollback: {元に戻す方法（improvements.mdから転記）}
```

#### 3b. diff案の提示と適用
1. Fix の内容に基づき、**変更対象ファイルと具体的なdiff案**を提示する
2. AskUserQuestion で適用の承認を求める:
   - **適用する**: diff を実際にファイルに適用する
   - **修正してから適用**: ユーザーの修正指示を受けてdiffを調整→再提示
   - **適用しない（ログだけ）**: ログ更新のみで完了。ファイル変更はしない

### 4. 却下時の処理

1. `.claude/memory/heartbeat/improvements.md` の該当項目の `Status: proposed` を `Status: rejected -- {理由}` に更新
2. decisions.md への記録は不要

### 5. サマリー出力

レビュー結果をまとめて表示:
- 採用: N件（うち適用済み: N件）
- 却下: N件
- 保留: N件
- 未レビュー残: N件

## 禁止事項

- ユーザーの承認なしでの Status 変更・ファイル変更
- improvements.md の過去エントリの削除
