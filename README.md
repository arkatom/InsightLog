# InsightLog

AI利用タスク記録・効果測定アプリケーション。

## 概要

InsightLogは、日々のタスクにおけるAIツールの利用状況を記録し、AI使用時と非使用時の生産性を定量的に比較できるPWAアプリケーションです。データはすべてブラウザ内（IndexedDB）に保存され、サーバーへの送信は行いません。

## 機能

- **タスク記録** — AI利用フラグ、所要時間、手戻り回数、カテゴリ、振り返りメモを記録
- **統計・分析** — AI使用/不使用の比較、カテゴリ別の傾向分析
- **タイマー** — ポモドーロ、フリータイマー、ストップウォッチの3モード
- **データエクスポート** — JSON形式でのエクスポート/インポート
- **PWA対応** — オフラインでも動作、ホーム画面に追加可能

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | React 19 + TypeScript |
| ビルド | Vite 7 |
| スタイリング | Tailwind CSS 4 |
| 状態管理 | Zustand |
| データベース | Dexie.js（IndexedDB） |
| グラフ | Recharts |
| テスト | Vitest + React Testing Library |

## セットアップ

```bash
# インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト
npm run test
```

開発サーバー起動後、`http://localhost:5173/` にアクセスしてください。

## プロジェクト構造

```
src/
├── components/
│   ├── ui/           # 基本コンポーネント（Button, Card, Input, Modal, Badge）
│   ├── timer/        # タイマー関連
│   ├── task/         # タスク記録関連
│   ├── statistics/   # 統計・分析
│   └── layout/       # レイアウト
├── pages/            # ページコンポーネント
├── hooks/            # カスタムフック
├── store/            # Zustand ストア
├── lib/              # ユーティリティ
├── types/            # 型定義
└── constants/        # 定数
```

## デプロイ

Cloudflare Pages への自動デプロイに対応しています。`main` ブランチへの push で GitHub Actions が実行されます。

### 手動デプロイ

```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name=insightlog
```

### GitHub Actions を使う場合

リポジトリの Secrets に以下を設定してください。

| Secret | 説明 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

## ライセンス

MIT License
