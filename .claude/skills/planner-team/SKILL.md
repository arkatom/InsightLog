---
name: planner-team
description: 実装計画策定専門チーム。PM / Searcher / Architect / Devil の 4 ロールで Devil's Advocate サイクルを実行し、承認済み計画を保存する。各ロール定義は roles/ に段階的開示。
---

# 計画チーム（planner-team）

段階的開示構造で構築された計画策定スキル。`SKILL.md` 本体はワークフロー概要のみを保持し、各ロールの詳細責務は `roles/*.md` に分離して **必要な時だけ読み込む**。

## ロール構成（全員起動）

| ロール | 担当 | 詳細 |
|--------|------|------|
| 👑 **PM** | タスク理解・進行管理・Agent 起動・最終計画統合 | [roles/pm.md](roles/pm.md) |
| 🔎 **Searcher** | コードベース調査（Read / Glob / Grep、推測禁止・根拠付き報告） | [roles/searcher.md](roles/searcher.md) |
| 🏗️ **Architect** | 調査結果を踏まえた実装計画草案の作成（公式仕様引用プロトコル必須） | [roles/architect.md](roles/architect.md) |
| 😈 **Devil** | 受け入れ条件・既存パターン・型安全性・公式仕様準拠の観点からの批判的検証 | [roles/devil.md](roles/devil.md) |

## ワークフロー（4 Phase、再帰的）

### Phase 1: 調査

- **PM** が Issue（GitHub Issue or ローカル仕様ファイル）と `CLAUDE.md` を読み、受け入れ条件を把握
- **Searcher** が Agent 起動され、実装に必要な情報を 5 軸（実装候補ファイル / 参照すべき既存実装 / 使用すべき型・定数 / 実装上の注意点 / 未決事項）で調査。公式仕様が絡む場合は `docs/official_docs/` の該当行を引用

### Phase 2: 計画草案

- **Architect** が Agent 起動され、Searcher レポートを踏まえて計画草案を作成
- **公式仕様引用プロトコル必須**: 公式仕様が絡む判断には「ファイルパス + 行番号 + 原文」の 3 点セットを草案本文に transcribe（FP-020 対策）

### Phase 3: Devil's Advocate サイクル（最大 3 回）

```
[😈 Devil] 計画草案を 4 軸で批判
    ├─ 重大な問題あり → [🏗️ Architect] 計画修正 → [😈 Devil] 再検証
    └─ 軽微な懸念のみ → 注記して完了

停止条件: Devil 承認 or 3 ラウンド到達
```

- **Devil は公式仕様未確認のまま懸念提示禁止**: `docs/official_docs/` を Grep/Read で実確認してから根拠付き指摘

### Phase 4: 出力

- **PM** が承認済みの計画を `plan_output.md`（呼び出し元が指定した場合はそのパス）に保存
- `feature_list.json` があれば `"plan"` フェーズの status を `"done"` に更新
- `claude-progress.txt` に完了メモを追記
- ユーザーへ保存先パスを報告

## 実行ルール（全ロール共通）

- **Agent Teams 必須**: Searcher / Architect / Devil は必ず Agent ツールで別プロセス起動。PM が各ロールを演じない
- **再帰的検証**: 重大な問題が解消するまで Devil → Architect → Devil のループ（最大 3 回）
- **根拠必須**: すべての指摘・判断は Issue の受け入れ条件、コードパス、公式ドキュメントに基づく
- **公式仕様 transcribe 必須**（FP-020）: 参照で済ませず、ファイル + 行 + 原文を草案本文に書く
- **停止条件**: Devil が「重大な問題なし」と判定し、`plan_output.md` が保存された時のみ完了

## 段階的開示（Progressive Disclosure）の意図

公式 [skills.md](../../../../docs/official_docs/cc/skills.md) L235-243 に基づき、本スキルは:

- `SKILL.md` 本体 = ワークフロー概要 + ロール一覧のみ
- `roles/*.md` = 各ロールの詳細責務（公式仕様引用プロトコル、失敗事例、避けるべき内部発話等）

→ PM が各ロールを Agent 起動する際に `roles/{name}.md` を Agent prompt で参照させれば、**必要な時だけ詳細が context に載る**。短い `SKILL.md` で発見性を保ちつつ、深い責務定義を別ファイルに逃がす構造。

Agent Teams を起動してください。
