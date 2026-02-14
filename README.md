# InsightLog

AI研修講座「AIエージェント時代の現実と成果の可視化」で使用する、タスク記録・効果測定アプリケーション。

## 概要

InsightLogは、AIツール（特にClaude Code）の効果を定量的に測定し、AI使用時と非使用時の生産性を比較するためのPWAアプリケーションです。

### 主な機能

- **タイマー機能**: ポモドーロ、フリータイマー、ストップウォッチの3モード
- **タスク記録**: AI利用フラグ、所要時間、手戻り回数、カテゴリ、振り返りメモ
- **統計・分析**: AI使用/不使用の比較、カテゴリ別分析（Phase 5で実装予定）
- **データ管理**: JSONエクスポート/インポート（Phase 6で実装予定）

### 技術スタック

- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.4
- Tailwind CSS 4.1.18
- Dexie.js（IndexedDB）
- Zustand（状態管理）

## セットアップ

### 前提条件

- Node.js 18以上
- npm 9以上

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで http://localhost:5173/ にアクセス（ポートは環境により異なる場合があります）。

### ビルド

```bash
npm run build
```

### プレビュー

```bash
npm run preview
```

## 使い方

### タイマーの使用

1. モードを選択（ポモドーロ、フリー、ストップウォッチ）
2. 「スタート」ボタンをクリック
3. タイマーが開始されます
4. 「一時停止」で停止、「リセット」で初期化

### タスクの記録

1. タスク名を入力
2. AI利用の有無をチェック
3. 所要時間を入力（分単位）
4. 手戻り回数を入力
5. カテゴリを選択（複数選択可能）
6. 振り返りメモを入力（任意）
7. 「タスクを記録」ボタンをクリック

### タスク一覧の表示

1. ヘッダーの「リスト」アイコンをクリック
2. 記録したタスクが一覧表示されます

## プロジェクト構造

```
src/
├── components/     # UIコンポーネント
│   ├── ui/         # 再利用可能な基本コンポーネント
│   ├── timer/      # タイマー関連
│   ├── task/       # タスク関連
│   └── layout/     # レイアウト
├── pages/          # ページ
├── hooks/          # カスタムフック
├── store/          # 状態管理（Zustand）
├── lib/            # ユーティリティ
├── types/          # 型定義
└── constants/      # 定数
```

詳細は [docs/_plans/insightlog/](../../docs/_plans/insightlog/) を参照してください。

## 開発状況

### 完了したフェーズ

- ✅ Phase 1: プロジェクトセットアップ
- ✅ Phase 2: データ基盤構築
- ✅ Phase 3: タイマー機能
- ✅ Phase 4: タスク記録機能

### 今後の予定

- Phase 5: 統計・分析機能
- Phase 6: 設定・データ管理
- Phase 7: PWA対応
- Phase 8: 通知機能
- Phase 9: UI/UX改善
- Phase 10: オンボーディング
- Phase 11: テスト・最適化
- Phase 12: デプロイ

## デプロイ

### Cloudflare Pages への自動デプロイ

このアプリケーションは、`apps/InsightLog/` 配下のファイルが `main` ブランチに push されると、GitHub Actions により自動的に Cloudflare Pages にデプロイされます。

#### 初回セットアップ

1. **Cloudflare アカウントでプロジェクトを作成**
   - [Cloudflare Dashboard](https://dash.cloudflare.com/) にログイン
   - Pages > Create a project を選択
   - プロジェクト名を `insightlog` に設定（任意）

2. **API Token の取得**
   - Cloudflare Dashboard > My Profile > API Tokens
   - "Create Token" をクリック
   - "Edit Cloudflare Workers" テンプレートを選択
   - Account Resources: Include > Your Account を選択
   - Zone Resources: Include > All zones を選択
   - トークンを生成してコピー

3. **Account ID の取得**
   - Cloudflare Dashboard > Workers & Pages
   - 右側のサイドバーに表示されている Account ID をコピー

4. **GitHub Secrets の設定**
   - リポジトリの Settings > Secrets and variables > Actions
   - 以下の2つの Secret を追加：
     - `CLOUDFLARE_API_TOKEN`: 手順2で取得したトークン
     - `CLOUDFLARE_ACCOUNT_ID`: 手順3で取得した Account ID

#### デプロイのトリガー

以下のいずれかが変更されると、自動デプロイが実行されます：

- `apps/InsightLog/**` 配下のファイル
- `package.json`（workspace 設定の変更）
- `.github/workflows/deploy-insightlog.yml`（ワークフロー自体の変更）

#### 手動デプロイ

ローカルから直接デプロイすることも可能です：

```bash
# Wrangler CLI をインストール
npm install -g wrangler

# ビルド
npm run build

# デプロイ
wrangler pages deploy dist --project-name=insightlog
```

## ライセンス

MIT License

## 問い合わせ

研修に関する問い合わせは、講師までお願いします。
