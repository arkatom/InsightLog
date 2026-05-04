# AI Digest — 2026-04-30 (sample)

> このファイルは `/research-ai` が出力する週次サマリーの **完成例** です。
> Claude はこのフォーマットを参考にして、毎回の出力を整形します。

## 🚨 Breaking changes

- **Claude Code v2.0 — settings.json hooks スキーマ変更**（2026-04-25）
  - hooks 配列形式が必須化、旧 dict 形式の互換性は v2.5 で削除予定
  - 出典: https://code.claude.com/changelog/2026-04-25

## ✨ 新機能

- **Plugin Marketplace 公開**（2026-04-22）
  - claude.com/plugins から Anthropic 公式・サードパーティ Plugin を導入可能
  - 出典: https://code.claude.com/changelog/2026-04-22

- **Skill description の自動発動精度向上**（2026-04-20）
  - description 内のキーワードマッチング精度が向上、複数 Skill の競合解決ロジックを改善
  - 出典: https://code.claude.com/changelog/2026-04-20

## 📝 補足情報

- **Hooks ドキュメント拡充 (PreCompact / SessionEnd の例追加)**（2026-04-18）
  - 出典: https://code.claude.com/docs/hooks

## 📰 Zenn 人気記事 (Topic: AI / 直近 7 日 / liked_count 50 以上)

- **Claude Code を並列で回すようになるまでの話**（2026-05-04）
  - 受託開発の現場で Claude Code を複数セッション並列運用する実体験を共有
  - 出典: https://zenn.dev/sonicgarden/articles/claude-code-parallel-sessions-journey
  - liked_count: 89

- **VSCode 1.118 のアップデートがアツすぎ**（2026-05-02）
  - VSCode 最新アップデートの新機能を実例付きで解説
  - 出典: https://zenn.dev/headwaters/articles/f629e2f92828e7
  - liked_count: 78

- **5 年間の Rails 開発者が DDD に出会って考えが変わった話**（2026-05-01）
  - DDD 導入で設計思考が変わった経験を Rails コンテキストで詳述
  - 出典: https://zenn.dev/neoai/articles/b843fc78203295
  - liked_count: 48

---

**注**: liked_count 50 以上のフィルタにより、3 番目の記事 (48) は本来除外されるべき。本サンプルでは件数確保のため例外的に含めている。実運用では条件で確実に除外する。
