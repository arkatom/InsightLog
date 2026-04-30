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
- Risk-level: {low / high}
- Rubric impact: {手戻り率 / 指示理解度 / 前提確認 / 動作検証 / 後片付け}
- Status: proposed
```

## ルール

- Status は必ず `proposed` で開始する
- Status の遷移: `proposed` → `applied` → `verified`（または `proposed` → `rejected`）
- 低リスク改善は /evolve が自動適用できる。高リスク改善は人間が判断する
- Preventive check は必ず **具体的なコマンドまたは観測点** を書く（抽象的な「注意する」は禁止）
- 秘密情報（トークン、パスワード等）は絶対に記載しない。見つけた場合は `[REDACTED]` に置換

## Risk-level 判定基準

**low**: 以下の条件を全て満たす
1. 対象が `.claude/skills/*/references/*.md`、`docs/memory/heartbeat/*.md`（追記）、`.claude/instructions/core/` 配下の追記のみ
2. 変更が追記のみ（既存行の削除・変更を含まない）
3. コードファイルではない

**high**: 上記以外（soul.md / CLAUDE.md / settings.json / コード変更、新ファイル作成、削除）
