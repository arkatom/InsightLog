# 記事項目テンプレート

各記事を出力するときの埋め込み枠。Claude はこのテンプレートに沿って、各セクション内の記事を整形する。

## 記事 1 件あたりのフォーマット

```markdown
- **{タイトル}**（{published_at}）
  - {1 行サマリー（日本語）}
  - 出典: {URL}
  - liked_count: {N}（Zenn の場合のみ）
```

## 埋め込み例

- **Claude Code を並列で回すようになるまでの話**（2026-05-04）
  - 受託開発の現場で Claude Code を複数セッション並列運用する実体験を共有
  - 出典: https://zenn.dev/sonicgarden/articles/claude-code-parallel-sessions-journey
  - liked_count: 89

## ルール

- **タイトル**: 原文のまま (翻訳しない)
- **published_at**: `YYYY-MM-DD` 形式に丸める
- **1 行サマリー**: 日本語、80 字以内、「〜について解説」「〜を実例付きで紹介」など読み手が判断できる動詞で締める
- **出典**: 完全な URL (短縮 URL 不可)
- **liked_count**: Zenn 取得項目のみ。Claude Code changelog では省略
