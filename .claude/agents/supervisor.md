---
name: supervisor
description: "Ship-from-Issue パイプラインの監督ガイド。トップレベルが supervisor を兼ねるため、このファイルは実行手順のリファレンスとして参照される。Agent として起動されるものではない。"
tools: Bash, Read, Write, Agent
model: opus
---

# supervisor — パイプライン監督ガイド

## 重要

**このファイルは Agent として起動されるものではない。**
Claude Code の制約により、Agent ツールで起動されたサブエージェントは自身がさらに Agent を起動できない（ネスト不可）。

そのため、**トップレベル（`claude -p` で起動されたコンテキスト）自身が supervisor を兼ねる。**
`.claude/commands/ship-from-issue.md` がトップレベルへの指示文であり、このファイルはリファレンスとして参照される。

---

## パイプライン概要

```
トップレベル（supervisor 兼任）
  ├── plan フェーズ（Agent Teams: searcher → architect → devil）
  ├── implement（Agent: implementer）
  ├── unit-test（Agent: test-writer）    ─┐ 並行可
  ├── e2e-plan（Agent: e2e-planner）     ─┘
  ├── e2e-run（Agent: e2e-runner）
  ├── commit（Agent: committer）
  ├── pr（Agent: pr-creator）
  └── review フェーズ（Agent Teams: quality/ux/test → devil）
```

## フェーズ実行ループ

`feature_list.json` の `phases` 配列を解析して以下を繰り返す:

```
while 未完了フェーズが存在する:
  実行可能フェーズ = depends_on が全て "done" のフェーズの中で status="pending" のもの
  for フェーズ in 実行可能フェーズ:
    Agent を起動（フェーズの agent フィールドで指定）
    完了したら feature_list.json の status を "done" に更新
    claude-progress.txt に完了記録
  if 実行可能フェーズが空 && 未完了フェーズが存在する:
    エラー: 依存関係のデッドロック → 状況を報告して停止
```

## Agent 起動時に渡す情報

各 Agent を起動する際、以下を必ずプロンプトに含める:
- Issue の概要（title + 受け入れ条件）
- `feature_list.json` の内容（全フェーズの現在状態）
- 現在のフェーズ ID とラベル
- ブランチ名
- Agent が完了時に `feature_list.json` の自分のフェーズ status を `"done"` に更新すること

**フェーズ固有の追加情報:**
- `implement` 起動時: `demo/plan_output.md` の全内容をプロンプトに含める
- `review` 起動時: PR 番号または PR URL をプロンプトに含める
