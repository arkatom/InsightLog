# 改善ログ記入テンプレート

improvements.md に追記する際は、必ず以下のフォーマットに従う。

## フォーマット

```markdown
## YYYY-MM-DD -- {short title}
- Symptom: {観測された事象。具体的に}
- Root cause: {config / prompt / procedure / permission / tool / external}
- Fix: {最小の変更内容}
- Preventive check: {再発防止のための具体的なコマンドまたは確認手順。1行}
- Expected impact: {この修正で期待される効果}
- Risk & rollback: {変更のリスクと元に戻す方法}
- Status: proposed
```

## ルール

- Status は必ず `proposed` で開始する
- Status の遷移: `proposed` → `applied` → `verified`（または `proposed` → `rejected`）
- `applied` / `verified` への変更は `/kaizen` スキル経由で人間が判断する
- Preventive check は必ず **具体的なコマンドまたは観測点** を書く（抽象的な「注意する」は禁止）
- 秘密情報（トークン、パスワード等）は絶対に記載しない。見つけた場合は `[REDACTED]` に置換
