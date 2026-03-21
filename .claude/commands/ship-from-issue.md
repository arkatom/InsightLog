---
description: "demo/feature_list.json のフェーズ定義を読み込み、supervisor エージェントを起動して Ship-from-Issue パイプラインを実行する。"
---

# Ship-from-Issue

`supervisor` エージェントを起動してください。

以下の情報を渡します:
- パイプライン定義: `demo/feature_list.json`
- Issue: `demo/fallback/issue.md`（GitHub Issue が設定されている場合は `$ISSUE_NUMBER` 参照）
- アプリルート: カレントディレクトリ

supervisor は `feature_list.json` の `phases` を読み、依存関係に従って各 Sub-agent を起動します。
完了したら PR の URL を出力してください。
