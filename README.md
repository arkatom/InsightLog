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

## セットアップ（GitHub Codespaces / Dev Containers）

研修では GitHub Codespaces を使います。ブラウザだけで開発環境が立ち上がります。

### 1. 環境を起動する

**GitHub Codespaces（推奨）**

リポジトリページの **Code** ボタン → **Codespaces** タブ → **Create codespace on main** をクリック。
自動でコンテナがビルドされ、VS Code がブラウザ上で開きます。

**VS Code Dev Containers（ローカル）**

```bash
git clone https://github.com/arkatom/InsightLog.git
cd InsightLog
```

VS Code でフォルダを開き、左下の `><` アイコン → **Reopen in Container** を選択。

### 2. APIキーを設定する

ターミナルで以下を実行してください。

```bash
cp .env.example .env
```

`.env` ファイルを開き、配布されたAPIキーを記入します。

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxx
```

設定を環境変数として読み込みます。

```bash
export $(cat .env | xargs)
```

### 3. Claude Code の起動確認

```bash
claude
```

`claude` コマンドが起動すれば準備完了です。`/help` で使い方を確認できます。

### 4. 開発サーバーの起動

```bash
npm run dev
```

開発サーバー起動後、`http://localhost:5173/` にアクセスしてください（Codespaces ではポートが自動転送されます）。

---

## ローカル開発（Dev Containers を使わない場合）

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

## 使い方

### タスクの記録

1. タスク名を入力
2. AI利用の有無をチェック
3. 所要時間を入力（分単位）
4. 手戻り回数を入力
5. カテゴリを選択（複数選択可能）
6. 振り返りメモを入力（任意）
7. 「タスクを記録」ボタンをクリック

記録したタスクはヘッダーの「リスト」アイコンから一覧表示できます。

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
