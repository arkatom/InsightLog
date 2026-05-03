# タスク記録フォームを簡単にする

## このファイルの位置づけ

第4回研修 Part 2 実習②「曖昧な要望を具体化する」で受講者が参照する Issue 例。

- **Before** = 受講者が「現場で受け取る曖昧な依頼」の典型例
- **After** = 受講者が Phase 1 の思考時間で書き起こす「具体化された Issue」の到達例

実習中は **Before だけを見せ**、After は受講者が Phase 1 を終えた後の答え合わせとして開く。

---

## Before — 曖昧な要望（受講者が受け取る依頼）

> タスクの記録をもっと簡単にしてください。毎回要素を選び直すのが面倒です。

これだけ。誰が、どの画面の、何を、どう変えたいかが決まっていない。Claude Code に渡しても「どのフィールドですか?」「全削除しますか?」と質問が返るか、想定外の改修が走る。

受講者は **この 1 文を Phase 1（思考時間 7 分）で具体化する**。

---

## After — 具体化された Issue（到達例）

### 背景

- InsightLog のタスク記録フォーム (`apps/InsightLog/src/components/task/TaskForm.tsx`) は AI 利用度の研修記録を目的としている
- 受講者・社内ユーザーが 1 日 5-10 件のタスクを記録するため、入力 1 件あたりの所要時間が体験品質を左右する
- 現状は **毎回 9 項目程度を選び直す**（タスク名・URL・AI ツール【複数選択】・作業時間・AI 未利用時推定・手戻り回数・カテゴリ【複数選択】・カスタムカテゴリ・振り返りメモ）必要がある

### 現状の問題

1. **再選択コスト**: 同じ作業日に類似タスクを記録する際、前回の **AI ツール** と **カテゴリ** の **チェックボックス選択セット** (両方とも複数選択 UI) を毎回付け直している
2. **離脱リスク**: 入力に時間がかかると記録自体を諦める受講者が出る（研修終盤で記録抜けが発生する原因）
3. **数値的目標**: 「入力時間を現状の半分以下にする」が真のゴール（KPI: 1 件あたり中央値 30 秒 → 15 秒）

### 期待する挙動

タスク記録の **AI ツール** と **カテゴリ** が **前回選択したチェックボックスのセットを初期値として保持** する。

- ブラウザを閉じても保持される（IndexedDB / Dexie.js に永続化）
- 受講者が明示的に変更すれば次回はそのセットが初期値になる
- フォームを開いた瞬間に「前回 = 今回」と見て確定できれば、追加クリックなしで保存可能

### スコープ

#### 対象

- `apps/InsightLog/src/components/task/TaskForm.tsx` (`selectedAITools` / `selectedCategories` の初期値を「前回保存値」から取得するロジック追加。`useSettings()` 経由)
- `apps/InsightLog/src/types/settings.ts` (`AppSettings` に `lastSelectedAITools: string[]` と `lastSelectedCategories: string[]` を追加、`DEFAULT_SETTINGS` も対応)
- `apps/InsightLog/src/hooks/useSettings.ts` (上記 2 フィールドを読み書きできるよう既存 `updateSettings(updates: Partial<AppSettings>)` を活用、新規メソッド追加は不要)
- `apps/InsightLog/src/lib/db.ts` (Dexie schema バージョン更新、追加フィールドのみ。既存ユーザーの `settings` レコードは保持)

#### 対象外

- 所要時間 / 振り返りメモ / 手戻り回数 / タスク名 / URL の初期値保持（**今回は対象外**、別 Issue で議論）
- フォーム項目の削減（「面倒さの原因」を「再選択」に絞ったため、項目自体は維持）
- UI の見た目の変更（既存の Tailwind クラス・チェックボックス UI は維持）

### Acceptance Criteria

- [ ] **AC1**: 新規記録時、AI ツールとカテゴリの **チェックボックスの選択状態** が「前回保存時に選択していたセット」と一致している
- [ ] **AC2**: ブラウザを完全に閉じてから再起動しても AC1 が維持される（IndexedDB に永続化）
- [ ] **AC3**: 初回起動時（過去ログがない場合）は両方とも **空配列** (未選択状態) で表示される。`DEFAULT_SETTINGS` の `lastSelectedAITools: []` / `lastSelectedCategories: []` がこれに対応
- [ ] **AC4**: 既存のユニットテスト（`src/tests/unit/`）が破壊されない
- [ ] **AC5**: 新規ロジックに対するユニットテストを 1 件以上追加する（例: 「保存後、`useSettings().settings.lastSelectedAITools` が更新される」）

### 補足（指示の質を上げる追加情報）

- **テストカバレッジ**: 既存を維持。新規追加コードもテスト必須
- **マイグレーション**: Dexie schema バージョン更新は追加のみ（既存ユーザーの `tasks` / `settings` データは保持）
- **既存パターン**: `useSettings()` の `updateSettings(updates: Partial<AppSettings>)` で既に部分更新できる。タスク保存時に `updateSettings({ lastSelectedAITools, lastSelectedCategories })` を呼ぶだけで済む
- **設計判断は CLAUDE.md 参照**: グローバル状態は Zustand、ファイル配置、import 順序は `apps/InsightLog/CLAUDE.md` のアーキテクチャ判断セクションに従う（ただし設定は既存の Dexie + `useSettings()` 経由なので Zustand は使わない）

### 動作確認手順

1. `cd apps/InsightLog && npm run dev` で開発サーバー起動
2. ブラウザで http://localhost:5173 を開き、タスクを 1 件記録（AI ツール: 「Claude」「Copilot」を選択、カテゴリ: 「実装」「調査」を選択）
3. ページをリロード、新規記録モーダルを開いて初期値が「Claude/Copilot」(AI ツール) と「実装/調査」(カテゴリ) のチェック状態になっていることを確認
4. ブラウザを完全に閉じてから再起動して AC2 を確認
5. 既存タスク一覧と既存 `settings`（タイマー設定など）が破壊されていないことを確認

---

## 受講者への学習ポイント

Before → After で起きた変化:

- **粒度**: 「簡単に」→ 「再選択を不要に（前回値を初期値に）」
- **対象**: 「フォーム」→ `TaskForm.tsx` + `useTasks.ts` + `db.ts` の 3 ファイル
- **完了の判定**: なし → AC1-AC5 のチェックリストで判定可能
- **副次配慮**: なし → カバレッジ維持・マイグレーション・既存テスト保護を明記

この 4 観点を意識すれば、現場の曖昧依頼を Claude Code に渡せる Issue に変換できる。

---

## 関連

- 実習手順: [`apps/InsightLog/docs/training/task-form-simplify.md`](../training/task-form-simplify.md)
- 既存類似 Issue 例: [`apps/InsightLog/docs/plans/必須フィールドにバリデーション表示を追加.issue.md`](./必須フィールドにバリデーション表示を追加.issue.md)
- 設計判断ガイド: `apps/InsightLog/CLAUDE.md` の「アーキテクチャ判断」セクション
