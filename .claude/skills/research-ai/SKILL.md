---
name: research-ai
description: AI 関連の最新情報を RSS フィードから自動収集し、重要度で選別して Markdown サマリーを返す。Claude Code の changelog を追う、週次の AI アップデートをキャッチアップしたい、全件読むのはつらいときに使う。
allowed-tools: WebFetch(domain:code.claude.com)
---

# research-ai

AI 関連の最新情報を RSS フィードから取得し、重要度で選別して Markdown サマリーを返す。

## 手順

1. `references/feeds.md` を読み、登録されている RSS URL をすべて取得する
2. 各 RSS を `WebFetch` で取得し、entry（記事）を抽出する
3. 各 entry を以下の 4 段階で選別する
   - **🚨 Breaking change**: 既存動作を変える変更。必ずサマリーに出す
   - **✨ 新機能**: 新しい機能・能力の追加
   - **📝 補足情報**: 既存機能の改善・バグ修正・ドキュメント更新
   - **除外**: 重複・宣伝・サマリーに不要なもの
4. 出力は以下の Markdown 形式。Breaking → 新機能 → 補足 の順

## 出力形式

```markdown
# AI Digest — YYYY-MM-DD

## 🚨 Breaking changes
- **<タイトル>**（<日付>）
  - <1 行サマリー（日本語）>
  - 出典: <URL>

## ✨ 新機能
- **<タイトル>**（<日付>）
  - <1 行サマリー>
  - 出典: <URL>

## 📝 補足情報
- **<タイトル>** — <1 行サマリー>（出典: <URL>）
```

- サマリーは日本語、1 entry につき 1〜2 行
- 同じ媒体で 4 件以上あるときは Breaking/新機能を優先し、補足は上位 3 件まで
- 選別で迷ったら、受講者が「これは知っておくべき」と感じる方を残す

## 実行時の注意

- 取得失敗時はそのフィードだけ skip し、残りで出力を完成させる
- 日付は RSS の `<pubDate>` を ISO 形式（YYYY-MM-DD）に揃える

## Additional resources

- 対象の RSS 媒体を追加・変更するときは [references/feeds.md](references/feeds.md) に 1 行追記するだけ
- 選別基準をプロジェクト固有に調整したい場合は `references/selection-criteria.md` を追加して参照させる
