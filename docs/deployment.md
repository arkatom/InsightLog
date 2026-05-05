# Deployment

Cloudflare Pages への自動デプロイに対応しています。`main` ブランチへの push で GitHub Actions が実行されます。

## 手動デプロイ

```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name=insightlog
```

## GitHub Actions を使う場合

リポジトリの Secrets に以下を設定してください。

| Secret | 説明 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
