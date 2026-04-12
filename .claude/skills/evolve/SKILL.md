---
name: evolve
description: |
  改善提案を適用・検証する自律改善エンジン。
  (1) 低リスク提案は自動適用 (2) 高リスク提案は人間キューに (3) 適用済みの検証
  (4) サイクル健全性チェック。1回の実行で最大1件を自動適用。
  使用場面: /loop 30m での定期実行、手動での改善レビュー。
---

# Evolve (coach)

## Hard rules

- 1回の自動適用で最大1件
- 高リスク変更は人間の承認なしに適用しない
- improvements.md の過去エントリを編集・削除しない（append-only）
- soul.md, CLAUDE.md, settings.local.json は自動適用しない
- 秘密情報をログに書かない

## 実行手順

### 1. 提案スキャン

`docs/memory/heartbeat/improvements.md` を読み、`Status: proposed` の項目を抽出する。

- proposed が0件 → ステップ4（検証）へスキップ

### 2. リスク分類と適用判定

[リスク分類基準](./references/risk-classifier.md) に基づき、各提案の Risk-level を確認する。

Risk-level が未記入（旧フォーマット）の場合は、Fix の内容から判定する。

### 3a. 低リスク自動適用

Risk-level: low の proposed が存在する場合、**最も古い1件** を自動適用する:

1. Fix の内容に基づき、対象ファイルを変更する
2. `improvements.md` の該当項目の Status を `proposed` → `applied` に更新
3. `docs/memory/heartbeat/decisions.md` に追記:
   ```markdown
   ## YYYY-MM-DD -- 自動適用: {proposal title}
   - Why: 低リスク自動適用（Risk-level: low）
   - Expected impact: {improvements.md から転記}
   - Rollback: {improvements.md から転記}
   ```
4. 出力: `EVOLVE: auto-applied "{title}" (low-risk)`

### 3b. 高リスク人間キュー

Risk-level: high の proposed が存在する場合、一覧を表示してユーザーに判断を求める:

- **採用**: diff 案を提示 → ユーザー承認後に適用 → improvements.md を applied に → decisions.md に記録
- **却下**: improvements.md の Status を `rejected -- {理由}` に更新
- **保留**: 変更なし

### 4. Verified 検証

`Status: applied` のエントリを確認する。

各エントリについて:
1. `docs/memory/reflection/` の直近3セッション分の振り返りを読む
2. そのエントリの Symptom と同種の摩擦が再発していなければ:
   → `Status: applied` を `Status: verified -- YYYY-MM-DD` に更新
   → `decisions.md` に `verified: {title}` を記録
3. 再発している場合:
   → `failure-patterns.md` に記録し、新しい改善提案を生成

### 5. サイクル健全性チェック

`docs/memory/heartbeat/rubric-log.md` の直近5セッションのスコア推移を確認する。

**下降トレンド検出**: 直近3回のスコアが連続で前回以下の場合
→ `docs/memory/heartbeat/cycle-health.md` にアラート記録
→ 出力に `EVOLVE_ALERT` を含める

**適用後の悪化検出**: 改善を applied にした直後のセッションでスコアが2点以上低下した場合
→ [ロールバックプロトコル](./references/rollback-protocol.md) に従い対処を提案
→ `cycle-health.md` にロールバック候補を記録

### 6. 出力

- 自動適用した場合:
  ```
  EVOLVE: auto-applied "{title}" (low-risk)
  ```
- 手動レビュー実施:
  ```
  EVOLVE: reviewed N proposals (adopted: N, rejected: N, deferred: N)
  ```
- 検証のみ:
  ```
  EVOLVE: verified N improvements
  ```
- サイクル異常検出:
  ```
  EVOLVE_ALERT: rubric trend declining (N/10 → N/10 → N/10). Review recent changes.
  ```
- 何もなし:
  ```
  EVOLVE_OK
  ```

## 禁止事項

- 1回の実行で2件以上の自動適用
- 高リスク改善の無断適用
- improvements.md / decisions.md の過去エントリ削除
- soul.md, CLAUDE.md, identity.md, settings.local.json の自動変更
