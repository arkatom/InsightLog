# InsightLog

ポモドーロタイマー付きタスク振り返りアプリ。AI活用度の記録・分析機能を持つ。

## 必須読み込み

- [SOUL憲法](.claude/instructions/core/soul.md)

## Identity

- [Identity Map](.claude/instructions/core/identity.md) -- 自己定義と改善対象の全体地図

## テックスタック

- React 19 + TypeScript（Vite 7）
- Tailwind CSS 4 + Lucide React（アイコン）
- Zustand（状態管理）+ Dexie.js（IndexedDB）
- Recharts（統計グラフ）+ date-fns
- Vitest + React Testing Library（ユニットテスト）
- Playwright MCP サーバー（E2Eテスト・スクリーンショット撮影）
- PWA対応（vite-plugin-pwa）

## 開発コマンド

- `npm run dev` — 開発サーバー起動
- `npm run build` — 本番ビルド（tsc + vite build）
- `npm run test` — Vitest ユニットテスト実行
- E2Eテストは Playwright MCP サーバー経由で実行（`npx playwright test` は使用禁止）
- `npm run lint` — ESLint

## ディレクトリ構成

- `src/components/ui/` — 再利用可能な基本コンポーネント（Button, Card, Input, Modal, Badge）
- `src/components/timer/` — タイマー関連UI
- `src/components/task/` — タスク記録関連UI（TaskForm, TaskList, TaskItem）
- `src/components/statistics/` — 統計・分析UI
- `src/hooks/` — カスタムフック（useTimer, useTasks, useSessions 等）
- `src/store/` — Zustand ストア（timerStore）
- `src/lib/` — ユーティリティ（db, time, export, uuid, roiCalc 等）
- `src/types/` — 型定義
- `src/constants/` — 定数（timer, categories, aiTools）
- `src/e2e/` — E2Eテスト計画（Playwright MCP 実行用）
- `demo/` — デモ実行ハーネス（run.sh, issue.md, feature_list.json）
- `.claude/agents/` — Ship-from-Issue 汎用 Sub-agent 定義
- `.claude/commands/` — スラッシュコマンド（/ship-from-issue, /cleanup, /show-log）
- `.claude/skills/` — スキル定義（team, planner-team, reviewer-team, reflection, heartbeat, kaizen）
- `.claude/instructions/core/` — 絶対厳守事項（base.md）、SOUL憲法（soul.md）
- `docs/memory/` — スキル出力（heartbeat/改善ログ、reflection/振り返り）

## アーキテクチャ判断

書式・型・lint ルールはすべてツール側で管理する（`.prettierrc`, `tsconfig.json`, `eslint.config.js` を参照）。
ここには **ツールでは検出できない設計判断** だけを記載する。

### コンポーネント設計
- **再利用可能な基本UI**: `src/components/ui/` 配下に配置（既存の Button / Card / Input / Modal / Badge の命名に揃える）
- **機能固有UI**: `src/components/{feature}/` 配下に配置（task, timer, statistics 等）
- **関数コンポーネントのみ使用**。class コンポーネントは禁止
- Props は `interface` で定義

### 状態管理
- **グローバル状態は Zustand のみ**。React Context の直接利用は禁止
- ストアは `src/store/{feature}Store.ts` に配置
- ローカル状態は `useState` / `useReducer` でOK

### import 順序
- 外部ライブラリ → `@/` 配下 → 相対パスの順
- パスエイリアス `@/` → `src/` を使う（相対パス `../../../` は避ける）

### データベース操作
- IndexedDB へのアクセスは必ず `src/lib/db.ts` の Dexie インスタンス経由
- 直接 `indexedDB.open()` を呼ぶのは禁止

### テスト
- **ユニットテスト**: Vitest + React Testing Library。`src/tests/unit/` 配下に配置
- **E2Eテスト**: Playwright MCP サーバー経由で実行。`npx playwright test` の直接実行は禁止
- 新機能追加時は対応するユニットテストを必ず書く

## データベース

Dexie.js（IndexedDB ラッパー）で3テーブル管理:

- `tasks` — タスク記録（AI利用フラグ、カテゴリ、所要時間等）
- `sessions` — ポモドーロセッション
- `settings` — アプリ設定

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
