---
description: "demo/feature_list.json のフェーズ定義を読み込み、Ship-from-Issue パイプラインを実行する。トップレベルが supervisor を兼ね、Skill と Agent を使い分けて全フェーズを実行する。"
---

# Ship-from-Issue パイプライン

**あなた自身が supervisor（パイプライン監督者）です。** Sub-agent に supervisor を委任してはいけません。

## 重要な制約

Claude Code の Agent ツールで起動されたサブエージェントは、さらに Agent ツールを使うことができない（ネスト不可）。
そのため、**あなた（トップレベル）が直接すべての Agent / Skill を起動する必要がある。**

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

#### plan フェーズ → `Skill("planner-team")` を実行

Skill ツールで `planner-team` スキルを実行する。
スキルの指示に従い、Agent Teams（Searcher → Architect → Devil）を起動して計画を策定する。
完了後、`demo/plan_output.md` が生成されていることを確認する。

#### implement フェーズ → Agent 起動

`.claude/agents/implementer.md` を読み、Agent ツールで implementer を起動する。
プロンプトに `demo/plan_output.md` の全内容を含める。

#### unit-test / e2e-plan フェーズ → Agent 並行起動

`.claude/agents/test-writer.md` と `.claude/agents/e2e-planner.md` を読み、
2つの Agent を**並行で**起動する。

#### e2e-run フェーズ → Agent 起動

`.claude/agents/e2e-runner.md` を読み、Agent ツールで e2e-runner を起動する。

#### commit フェーズ → Agent 起動

`.claude/agents/committer.md` を読み、Agent ツールで committer を起動する。

#### pr フェーズ → Agent 起動

`.claude/agents/pr-creator.md` を読み、Agent ツールで pr-creator を起動する。
完了後、PR の URL を受け取る。

#### review フェーズ → `Skill("reviewer-team")` を実行

Skill ツールで `reviewer-team` スキルを実行する。
スキルの指示に従い、Agent Teams（quality/ux/test → Devil）を起動してレビューする。
PR 番号をスキルに渡すため、Skill 実行前に PR 番号を明示する。

### 4. 各フェーズ完了時の処理

各フェーズが完了したら:
- `feature_list.json` の該当フェーズの `status` を `"done"` に更新する
- `claude-progress.txt` に完了記録を追記する

### 5. パイプライン完了

全フェーズが done になったら:
- `feature_list.json` の `completed_at` を更新
- `claude-progress.txt` に完了記録
- PR の URL を出力

## Agent 起動時の共通ルール

- 各 Agent のプロンプトには Issue 概要・ブランチ名・feature_list.json の現在状態を含める
- Agent の出力は次の Agent のプロンプトに全文含める（要約・省略禁止）
- 並行起動可能なフェーズ（unit-test と e2e-plan 等）は同時に Agent を起動する
