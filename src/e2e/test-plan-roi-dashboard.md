# E2E テスト計画: AI ROI ダッシュボード機能（Issue #8）

## 前提条件

- 開発サーバー: http://localhost:5173
- スクリーンショット保存先: demo/screenshots/
- テスト実行日: 2026-04-06（今週 = 2026-03-30〜2026-04-05 または 2026-04-06）
- `useROIMetrics` は `date-fns` の `isThisWeek` でフィルタリングするため、今週の `completedAt` を持つタスクが必要

## hasData が true になる条件（実装確認済み）

`src/lib/roiCalc.ts` より:
- `allTasks.length >= 5`（今週のタスクが5件以上）
- `aiTasks.length > 0`（AI使用タスクが1件以上）
- `nonAiTasks.length > 0`（AI未使用タスクが1件以上）

上記すべてを満たさない場合、`hasData: false` となり空状態メッセージが表示される。

---

## テストケース

### TC-01: データなし状態でモーダルを開く（空メッセージの確認）

**Given:** IndexedDB が空、またはタスクが0件
**When:** ヘッダーの TrendingUp アイコン（AI ROI ボタン）をクリックする
**Then:** モーダルが開き「まだデータがありません。タスクを記録して始めましょう 🚀」が表示される

**MCP 実行ステップ:**

1. `browser_navigate` → `http://localhost:5173`
2. IndexedDB をクリアする:
   ```javascript
   // browser_evaluate で実行
   indexedDB.deleteDatabase('InsightLogDB');
   ```
3. `browser_navigate` → `http://localhost:5173`（リロードして空 DB で起動）
4. `browser_snapshot` → アクセシビリティツリーでヘッダーボタンの ref を確認
5. `browser_click` → TrendingUp アイコンボタン（ヘッダー右側、BarChart3 の右隣）
6. `browser_wait_for` → text="AI活用ROIダッシュボード"（モーダルタイトル）
7. `browser_take_screenshot` → filename="demo/screenshots/01_roi_modal_empty.png"

**検証:** モーダルタイトル「AI活用ROIダッシュボード」と「まだデータがありません。タスクを記録して始めましょう 🚀」が表示されていること

---

### TC-02: サンプルデータ投入（統計モーダル経由）

**Given:** IndexedDB が空
**When:** 統計モーダルの「サンプルデータで試す」ボタンをクリックする
**Then:** 約90件のサンプルデータが投入される

**背景:** サンプルデータには今日基準で daysAgo=0〜3 のタスクが含まれており、今週の `completedAt` を持つタスクが存在する。
AI 使用タスク（`aiUsed: true`）と未使用タスク（`aiUsed: false`）の両方が含まれるため、ROI の `hasData` 条件を満たす。

**MCP 実行ステップ:**

1. `browser_navigate` → `http://localhost:5173`（TC-01 から継続）
2. `browser_snapshot` → ヘッダーの BarChart3 ボタン ref を確認
3. `browser_click` → BarChart3 アイコンボタン（統計モーダルを開く）
4. `browser_wait_for` → text="統計・分析"
5. `browser_wait_for` → text="サンプルデータで試す"（データなしメッセージとボタンが表示されるまで待機）
6. `browser_click` → 「サンプルデータで試す」ボタン
7. `browser_wait_for` → text="サンプルデータを読み込みました"（トーストメッセージ）
8. `browser_take_screenshot` → filename="demo/screenshots/02_sample_data_loaded.png"
9. `browser_snapshot` → 閉じるボタンの ref を確認
10. `browser_click` → 統計モーダルの閉じるボタン（×）

**検証:** トーストに「サンプルデータを読み込みました（約90件）」と表示されること

---

### TC-03: データあり状態で AI ROI ダッシュボードを開く（4カードの確認）

**Given:** TC-02 でサンプルデータが投入されており、今週のタスクが5件以上存在する
**When:** ヘッダーの TrendingUp アイコン（AI ROI ボタン）をクリックする
**Then:** モーダルが開き、4枚のサマリーカードが表示される

**MCP 実行ステップ:**

1. `browser_snapshot` → ヘッダーの TrendingUp ボタン ref を確認
2. `browser_click` → TrendingUp アイコンボタン（AI ROI ダッシュボードを開く）
3. `browser_wait_for` → text="AI活用ROIダッシュボード"
4. `browser_wait_for` → text="今週のAI活用率"（サマリーカードの描画待機）
5. `browser_take_screenshot` → filename="demo/screenshots/03_roi_dashboard_summary_cards.png"

**検証:** 以下が表示されていること
- モーダルタイトル「AI活用ROIダッシュボード」
- 「対象期間: 今週」テキスト
- カード「今週のAI活用率」とパーセンテージ値（例: 75%）
- カード「推定時間削減」と分数値（例: 120分）
- カード「最も効果的なカテゴリ」とカテゴリ名（例: 実装）
- カード「AI ROI スコア」とスコア数値 + Badge（Excellent/Good/Fair）

---

### TC-04: カテゴリ別 AI 活用率グラフの確認

**Given:** TC-03 でモーダルが開いている
**When:** モーダル内を下にスクロールしてグラフ部分を確認する
**Then:** 「カテゴリ別AI活用率」の棒グラフが表示される

**MCP 実行ステップ:**

1. （TC-03 の続き、モーダルが開いている状態）
2. `browser_wait_for` → text="カテゴリ別AI活用率"（グラフ描画待機）
3. `browser_take_screenshot` → filename="demo/screenshots/04_roi_category_chart.png"

**検証:** 「カテゴリ別AI活用率」見出しと、カテゴリ名（実装・設計・ドキュメント等）を X 軸に持つ棒グラフが表示されていること

---

### TC-05: モーダル全体のスクロールビュー（4カード + グラフ一覧）

**Given:** TC-03 でモーダルが開いている
**When:** モーダルをスクロールしてすべてのコンテンツを確認する
**Then:** サマリーカード4枚とカテゴリグラフが同一モーダル内に表示される

**MCP 実行ステップ:**

1. （モーダルが開いている状態）
2. `browser_snapshot` → モーダル内コンテンツ構造を確認
3. `browser_take_screenshot` → filename="demo/screenshots/05_roi_dashboard_full_view.png"
4. `browser_snapshot` → 閉じるボタン ref を確認
5. `browser_click` → モーダルの閉じるボタン（×）
6. `browser_wait_for` → モーダルが閉じる（「AI活用ROIダッシュボード」テキストが消える）
7. `browser_take_screenshot` → filename="demo/screenshots/06_home_after_modal_close.png"

**検証:**
- モーダル内に4カード + グラフが含まれること
- モーダルを閉じるとホーム画面に戻ること

---

### TC-06: データ不足状態の再確認（browser_evaluate による直接投入）

**Given:** IndexedDB に今週のタスクが存在しない、または4件以下（hasData=false の条件）
**When:** AI ROI モーダルを開く
**Then:** 空状態メッセージが表示される

**背景:** このケースは TC-01 でも確認済みだが、より精確な条件確認のために `browser_evaluate` で今週外のタスクのみを投入して検証する。

**MCP 実行ステップ:**

1. IndexedDB を削除して空にする:
   ```javascript
   // browser_evaluate で実行
   indexedDB.deleteDatabase('InsightLogDB');
   ```
2. `browser_navigate` → `http://localhost:5173`
3. 今週外のタスクのみを投入（hasData=false になる条件）:
   ```javascript
   // browser_evaluate で実行（先週のタスクのみ、今週のタスクなし）
   const { db } = await import('/src/lib/db.ts');
   const lastWeekDate = new Date();
   lastWeekDate.setDate(lastWeekDate.getDate() - 10); // 10日前（先々週）
   await db.tasks.bulkAdd([
     {
       id: crypto.randomUUID(),
       name: '先週のタスクA',
       category: ['実装'],
       aiUsed: true,
       aiToolsUsed: ['Claude'],
       duration: 30,
       reworkCount: 0,
       notes: '',
       createdAt: lastWeekDate,
       completedAt: lastWeekDate,
     },
     {
       id: crypto.randomUUID(),
       name: '先週のタスクB',
       category: ['設計'],
       aiUsed: false,
       aiToolsUsed: [],
       duration: 60,
       reworkCount: 1,
       notes: '',
       createdAt: lastWeekDate,
       completedAt: lastWeekDate,
     },
   ]);
   ```
4. `browser_navigate` → `http://localhost:5173`（リロード）
5. `browser_snapshot` → TrendingUp ボタン ref を確認
6. `browser_click` → TrendingUp アイコンボタン
7. `browser_wait_for` → text="AI活用ROIダッシュボード"
8. `browser_take_screenshot` → filename="demo/screenshots/07_roi_modal_no_this_week_data.png"

**検証:** 「まだデータがありません。タスクを記録して始めましょう 🚀」が表示されること（今週外のデータは ROI 計算に使われない）

---

### TC-07: 今週のデータが5件未満の場合（hasData=false の境界値確認）

**Given:** 今週のタスクが4件存在するが5件未満（hasData の最低件数条件を満たさない）
**When:** AI ROI モーダルを開く
**Then:** 空状態メッセージが表示される

**MCP 実行ステップ:**

1. IndexedDB を削除して空にする:
   ```javascript
   // browser_evaluate で実行
   indexedDB.deleteDatabase('InsightLogDB');
   ```
2. `browser_navigate` → `http://localhost:5173`
3. 今週の日付で4件のタスクを投入（AI使用・未使用の両方あるが合計4件）:
   ```javascript
   // browser_evaluate で実行
   const { db } = await import('/src/lib/db.ts');
   const thisWeek = new Date(); // 今週の日付（今日）
   const tasks = [
     { id: crypto.randomUUID(), name: 'タスク1（AI使用）', category: ['実装'], aiUsed: true, aiToolsUsed: ['Claude'], duration: 30, reworkCount: 0, notes: '', createdAt: thisWeek, completedAt: thisWeek },
     { id: crypto.randomUUID(), name: 'タスク2（AI使用）', category: ['設計'], aiUsed: true, aiToolsUsed: ['Claude'], duration: 45, reworkCount: 0, notes: '', createdAt: thisWeek, completedAt: thisWeek },
     { id: crypto.randomUUID(), name: 'タスク3（AI使用）', category: ['実装'], aiUsed: true, aiToolsUsed: ['Claude'], duration: 25, reworkCount: 1, notes: '', createdAt: thisWeek, completedAt: thisWeek },
     { id: crypto.randomUUID(), name: 'タスク4（AI未使用）', category: ['調査'], aiUsed: false, aiToolsUsed: [], duration: 60, reworkCount: 0, notes: '', createdAt: thisWeek, completedAt: thisWeek },
   ];
   await db.tasks.bulkAdd(tasks);
   ```
4. `browser_navigate` → `http://localhost:5173`（リロード）
5. `browser_snapshot` → TrendingUp ボタン ref を確認
6. `browser_click` → TrendingUp アイコンボタン
7. `browser_wait_for` → text="AI活用ROIダッシュボード"
8. `browser_take_screenshot` → filename="demo/screenshots/08_roi_modal_insufficient_data.png"

**検証:** 合計4件（5件未満）のため「まだデータがありません。タスクを記録して始めましょう 🚀」が表示されること

---

### TC-08: 今週のデータが5件以上（hasData=true の境界値確認）

**Given:** 今週のタスクがAI使用・未使用含めて5件存在する
**When:** AI ROI モーダルを開く
**Then:** 4枚のサマリーカードとグラフが表示される

**MCP 実行ステップ:**

1. IndexedDB を削除して空にする:
   ```javascript
   // browser_evaluate で実行
   indexedDB.deleteDatabase('InsightLogDB');
   ```
2. `browser_navigate` → `http://localhost:5173`
3. 今週の日付で5件のタスクを投入（AI使用3件、未使用2件）:
   ```javascript
   // browser_evaluate で実行
   const { db } = await import('/src/lib/db.ts');
   const today = new Date();
   const tasks = [
     { id: crypto.randomUUID(), name: 'AI活用タスクA', category: ['実装'], aiUsed: true, aiToolsUsed: ['Claude'], duration: 20, reworkCount: 0, notes: 'Claudeで効率化', createdAt: today, completedAt: today },
     { id: crypto.randomUUID(), name: 'AI活用タスクB', category: ['設計'], aiUsed: true, aiToolsUsed: ['Claude'], duration: 30, reworkCount: 0, notes: '', createdAt: today, completedAt: today },
     { id: crypto.randomUUID(), name: 'AI活用タスクC', category: ['実装'], aiUsed: true, aiToolsUsed: ['ChatGPT'], duration: 25, reworkCount: 1, notes: '', createdAt: today, completedAt: today },
     { id: crypto.randomUUID(), name: '手動タスクA', category: ['実装'], aiUsed: false, aiToolsUsed: [], duration: 90, reworkCount: 2, notes: '手作業で時間がかかった', createdAt: today, completedAt: today },
     { id: crypto.randomUUID(), name: '手動タスクB', category: ['ドキュメント'], aiUsed: false, aiToolsUsed: [], duration: 75, reworkCount: 1, notes: '', createdAt: today, completedAt: today },
   ];
   await db.tasks.bulkAdd(tasks);
   ```
4. `browser_navigate` → `http://localhost:5173`（リロード）
5. `browser_snapshot` → TrendingUp ボタン ref を確認
6. `browser_click` → TrendingUp アイコンボタン
7. `browser_wait_for` → text="今週のAI活用率"（サマリーカード描画完了）
8. `browser_take_screenshot` → filename="demo/screenshots/09_roi_dashboard_5tasks.png"

**検証:**
- AI使用3件/合計5件 → 「今週のAI活用率」が 60%
- AI平均 (20+30+25)/3 = 25分、非AI平均 (90+75)/2 = 82.5分 → 「推定時間削減」が正の値
- ROI スコアが正の値になること
- カテゴリ「実装」（AI使用2件・合計3件）または「設計」（AI使用1件・合計1件）が最も効果的なカテゴリに表示されること

---

## スクリーンショット一覧（予定）

| ファイル名 | 内容 | 対応受け入れ条件 |
|---|---|---|
| `demo/screenshots/01_roi_modal_empty.png` | データなし時のモーダル（空メッセージ確認） | ケース2 |
| `demo/screenshots/02_sample_data_loaded.png` | サンプルデータ投入完了（統計モーダル画面） | 前提確認 |
| `demo/screenshots/03_roi_dashboard_summary_cards.png` | 4枚のサマリーカード表示（データあり） | ケース1（4カード） |
| `demo/screenshots/04_roi_category_chart.png` | カテゴリ別AI活用率グラフ | ケース1（棒グラフ） |
| `demo/screenshots/05_roi_dashboard_full_view.png` | ROI ダッシュボード全体 | ケース1（総合） |
| `demo/screenshots/06_home_after_modal_close.png` | モーダルを閉じた後のホーム画面 | 動作確認 |
| `demo/screenshots/07_roi_modal_no_this_week_data.png` | 今週外データのみ → 空メッセージ | ケース2（境界値） |
| `demo/screenshots/08_roi_modal_insufficient_data.png` | 今週4件（5件未満）→ 空メッセージ | ケース2（境界値） |
| `demo/screenshots/09_roi_dashboard_5tasks.png` | 今週5件（最小データ）→ ROI表示 | ケース1（境界値） |

合計 9 枚

---

## ヘッダーボタン配置（左から右の順）

1. List アイコン（タスク一覧）
2. BarChart3 アイコン（統計・分析）
3. **TrendingUp アイコン（AI ROI ← 今回追加）**
4. Settings アイコン（設定）

`browser_snapshot` でアクセシビリティツリーを取得し、TrendingUp ボタンの `ref` を確認してから `browser_click` を実行すること。

---

## 注意事項

1. `useROIMetrics` は `isThisWeek(completedAt)` でフィルタリングするため、`completedAt` が今週内のタスクのみが集計対象になる。
2. `browser_evaluate` で DB にデータを投入した後は必ず `browser_navigate` でリロードして React の状態を更新すること。
3. Recharts グラフはアニメーションを持つため、`browser_wait_for` で描画完了を待機してからスクリーンショットを撮ること。
4. ROIDashboardModal は `lazy()` で遅延ロードされるため、ボタンクリック後に `browser_wait_for` でモーダルタイトルが表示されるまで待機すること。
