---
description: "demo/feature_list.json のフェーズ定義を読み込み、Ship-from-Issue パイプラインを実行する。トップレベルが supervisor を兼ね、全 Sub-agent を直接起動する。"
---

# Ship-from-Issue パイプライン

**あなた自身が supervisor（パイプライン監督者）です。** Sub-agent に supervisor を委任してはいけません。

## 重要な制約

Claude Code の Agent ツールで起動されたサブエージェントは、さらに Agent ツールを使うことができない（ネスト不可）。
そのため、**あなた（トップレベル）が直接すべての Agent を起動する必要がある。**

## 実行手順

### 1. コンテキスト読み込み

```
Read: demo/feature_list.json
Read: CLAUDE.md
Read: demo/fallback/issue.md
```

GitHub Issue が設定されている場合:
```bash
[ -n "$ISSUE_NUMBER" ] && gh issue view "$ISSUE_NUMBER" --json title,body
```

### 2. ブランチ作成・開始記録

`feature_list.json` の `branch` フィールドでブランチを作成し、`claude-progress.txt` に開始記録を書く。

### 3. フェーズ実行

`feature_list.json` の `phases` を依存関係に従って実行する。
**各フェーズの実行方法は `.claude/agents/<agent名>.md` を読んで従う。**

ただし以下のルールを守る:

#### plan フェーズ（Agent Teams）

`.claude/agents/planner.md` を読み、Agent Teams 方式で実行する:

1. **あなた自身が PM** として Issue と CLAUDE.md を読む
2. **Agent ツールで Searcher を起動** → コードベース調査レポートを受け取る
3. **Agent ツールで Architect を起動** → Searcher の結果を渡して計画草案を受け取る
4. **Agent ツールで Devil を起動** → 計画草案を渡して批判を受け取る
5. Devil が差し戻したら Architect → Devil を再ループ（最大3回）
6. 承認済み計画を `demo/plan_output.md` に保存

#### implement / unit-test / e2e-plan / e2e-run / commit / pr フェーズ

各フェーズの `.claude/agents/<agent名>.md` を読み、**Agent ツールで1つずつ起動する。**
各 Agent には Issue の概要、feature_list.json、ブランチ名、完了時の feature_list.json 更新指示を渡す。

#### review フェーズ（Agent Teams）

`.claude/agents/reviewer.md` を読み、Agent Teams 方式で実行する:

1. **あなた自身が PM** として PR の差分と Issue の受け入れ条件を取得する
2. **Agent ツールで quality-reviewer / ux-reviewer / test-reviewer を並行起動**（各プロンプトに「日本語で記述」を含める）
3. 3つの結果を自分（PM）が統合レポートにまとめる
4. **Agent ツールで Devil を起動** → 統合レポートを渡して批判を受け取る
5. 最終レビューを `gh pr review` で GitHub に投稿（日本語）

### 4. 完了処理

全フェーズが done になったら:
- `feature_list.json` の `completed_at` を更新
- `claude-progress.txt` に完了記録
- PR の URL を出力

## Agent 起動時の共通ルール

- 各 Agent のプロンプトには Issue 概要・ブランチ名・feature_list.json の現在状態を含める
- Agent の出力は次の Agent のプロンプトに全文含める（要約・省略禁止）
- 並行起動可能なフェーズ（unit-test と e2e-plan 等）は同時に Agent を起動する
