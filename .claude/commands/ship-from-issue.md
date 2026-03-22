---
description: "Ship-from-Issue パイプライン。Issue → 計画 → 実装 → テスト → PR → レビューを自動実行する。"
---

# Ship-from-Issue パイプライン

**あなた自身が supervisor（パイプライン監督者）です。** Sub-agent に委任してはいけません。

## 制約

Agent ツールはネスト不可（サブエージェントは Agent を使えない）。
あなた（トップレベル）が直接すべての Agent / Skill を起動すること。

## 手順

### 1. 準備

- `demo/feature_list.json`, `CLAUDE.md`, `demo/fallback/issue.md` を読む
- `feature_list.json` の `branch` でブランチ作成
- `claude-progress.txt` に開始記録

### 2. フェーズ実行

`feature_list.json` の `phases` を依存関係順に実行する。

| フェーズ | 実行方法 | 補足 |
|---|---|---|
| **plan** | `Skill("planner-team")` | Skill が Agent Teams を自律起動。完了後 `demo/plan_output.md` が生成される |
| **implement** | Agent: `implementer` | プロンプトに `demo/plan_output.md` の全内容を含める |
| **unit-test** | Agent: `test-writer` | e2e-plan と**並行起動** |
| **e2e-plan** | Agent: `e2e-planner` | unit-test と**並行起動** |
| **e2e-run** | Agent: `e2e-runner` | |
| **commit** | Agent: `committer` | |
| **pr** | Agent: `pr-creator` | 完了後 PR URL を受け取る |
| **review** | `Skill("reviewer-team")` | 実行前に PR 番号を明示。Skill が Agent Teams を自律起動 |

### 3. フェーズ完了時

- **plan / review**: Skill 内で `feature_list.json` と `claude-progress.txt` が更新される。追加の更新は不要
- **その他**: Agent 完了後に `feature_list.json` の status を `"done"` に更新し、`claude-progress.txt` に記録

### 4. パイプライン完了

全フェーズ done で `feature_list.json` の `completed_at` を更新、PR URL を出力。

## Agent 起動の共通ルール

- プロンプトに Issue 概要・ブランチ名・`feature_list.json` の現在状態を含める
- 前フェーズの Agent 出力は次の Agent プロンプトに全文含める（省略禁止）
- 並行起動可能なフェーズは同時に起動する
