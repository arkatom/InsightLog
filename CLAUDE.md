# InsightLog

ポモドーロタイマー付きタスク振り返りアプリ。AI活用度の記録・分析機能を持つ。

## テックスタック

- React 19 + TypeScript（Vite 7）
- Tailwind CSS 4 + Lucide React（アイコン）
- Zustand（状態管理）+ Dexie.js（IndexedDB）
- Recharts（統計グラフ）+ date-fns
- Vitest + React Testing Library（ユニットテスト）
- Playwright（E2Eテスト・ビデオ録画）
- PWA対応（vite-plugin-pwa）

## 開発コマンド

- `npm run dev` — 開発サーバー起動
- `npm run build` — 本番ビルド（tsc + vite build）
- `npm run test` — Vitest ユニットテスト実行
- `npm run test:e2e` — Playwright E2Eテスト実行（ビデオ録画付き）
- `npm run lint` — ESLint

## ディレクトリ構成

- `src/components/ui/` — 再利用可能な基本コンポーネント（Button, Card, Input, Modal, Badge）
- `src/components/timer/` — タイマー関連UI
- `src/components/task/` — タスク記録関連UI（TaskForm, TaskList, TaskItem）
- `src/components/statistics/` — 統計・分析UI
- `src/components/report/` — レポートUI（ReportModal, RoiDashboard 等）
- `src/hooks/` — カスタムフック（useTimer, useTasks, useSessions 等）
- `src/store/` — Zustand ストア（timerStore）
- `src/lib/` — ユーティリティ（db, time, export, uuid 等）
- `src/types/` — 型定義
- `src/constants/` — 定数（timer, categories, aiTools）
- `src/lib/` — ユーティリティ（db, time, export, uuid, roiCalc 等）
- `e2e/` — Playwright E2Eテスト
- `demo/` — デモ実行ハーネス（run.sh, issue.md, feature_list.json）
- `.claude/agents/` — Ship-from-Issue 汎用 Sub-agent 定義（supervisor / implementer / test-writer / e2e-planner / e2e-runner / committer / pr-creator / pr-reviewer）
- `.claude/commands/` — スラッシュコマンド（/ship-from-issue, /cleanup, /show-log）

## コード規約

- パスエイリアス: `@/` → `src/`
- Prettier: シングルクォート、セミコロンあり、100文字幅
- 厳密TypeScript（strict: true）

## データベース

Dexie.js（IndexedDB ラッパー）で3テーブル管理:

- `tasks` — タスク記録（AI利用フラグ、カテゴリ、所要時間等）
- `sessions` — ポモドーロセッション
- `settings` — アプリ設定
