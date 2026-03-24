import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '../demo/screenshots');

/**
 * AI ROI ダッシュボード E2E テスト
 *
 * 受け入れ条件:
 * ケース1: タスクデータが存在する場合
 *   - ヘッダーの「AI ROI」ボタンをクリックするとモーダルが開く
 *   - 4カード（AI活用率・削減時間・最も効果的なカテゴリ・ROIスコア）が表示される
 *   - カテゴリ別AI活用率の棒グラフが表示される
 * ケース2: データが不足している場合
 *   - 「まだデータがありません。タスクを記録して始めましょう」のメッセージが表示される
 */

/**
 * IndexedDB をクリアするヘルパー
 */
async function clearDatabase(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const deleteReq = indexedDB.deleteDatabase('InsightLogDB');
      deleteReq.onsuccess = () => resolve();
      deleteReq.onerror = () => resolve();
      deleteReq.onblocked = () => resolve();
    });
  });
}

/**
 * 今週の日付（テスト実行日基準）を生成するヘルパー
 * RoiDashboard は isThisWeek() でフィルタリングするため、
 * completedAt が今週内でないとデータが表示されない
 */
function getThisWeekDate(offsetDays: number): string {
  const now = new Date();
  // 今週の月曜日を基点に offsetDays 日後
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(10, 0, 0, 0);
  const target = new Date(monday);
  target.setDate(monday.getDate() + offsetDays);
  return target.toISOString();
}

/**
 * DB が準備されてからタスクを挿入するヘルパー
 * バージョン番号を指定せず現在のバージョンで開く
 */
async function insertTasks(page: import('@playwright/test').Page, tasks: object[]) {
  await page.evaluate((taskList) => {
    return new Promise<void>((resolve, reject) => {
      // バージョン指定なし = 現在のDBバージョンで開く
      const request = indexedDB.open('InsightLogDB');

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');

        (taskList as Record<string, unknown>[]).forEach((task) => store.put(task));

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, tasks);
}

test.describe('AI ROI ダッシュボード', () => {
  test.beforeEach(async ({ page }) => {
    // テストごとに DB をクリアしてクリーンな状態から開始
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await clearDatabase(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ケース1: データあり状態
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('ヘッダーに「AI ROI」ボタンが表示される', async ({ page }) => {
    // AI ROI ボタンが存在することを確認
    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await expect(roiButton).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_home_with_roi_button.png'),
    });
  });

  test('タスクデータが5件以上ある場合、4カードとグラフが表示される', async ({ page }) => {
    // ━━━ Arrange: 今週のモックデータを投入 ━━━
    // AI使用・未使用が混在する8件のタスクを投入（5件以上 & 両方存在が必須条件）
    const tasks = [
      // AI使用タスク: 開発カテゴリ（時間短縮が顕著）
      {
        id: 'task-001',
        name: 'APIエンドポイント実装',
        taskUrl: '',
        category: ['開発'],
        aiUsed: true,
        aiToolsUsed: ['Claude'],
        duration: 30,
        timeMinutesNoAi: 60,
        reworkCount: 0,
        notes: 'Claude でコード生成',
        createdAt: getThisWeekDate(0),
        completedAt: getThisWeekDate(0),
      },
      {
        id: 'task-002',
        name: 'ユニットテスト作成',
        taskUrl: '',
        category: ['開発', 'テスト'],
        aiUsed: true,
        aiToolsUsed: ['Copilot'],
        duration: 20,
        timeMinutesNoAi: 45,
        reworkCount: 1,
        notes: 'Copilot でテストコード生成',
        createdAt: getThisWeekDate(0),
        completedAt: getThisWeekDate(0),
      },
      {
        id: 'task-003',
        name: 'ドキュメント作成',
        taskUrl: '',
        category: ['ドキュメント'],
        aiUsed: true,
        aiToolsUsed: ['Claude'],
        duration: 15,
        timeMinutesNoAi: 40,
        reworkCount: 0,
        notes: 'API仕様書を Claude で下書き',
        createdAt: getThisWeekDate(1),
        completedAt: getThisWeekDate(1),
      },
      {
        id: 'task-004',
        name: 'コードレビュー対応',
        taskUrl: '',
        category: ['開発'],
        aiUsed: true,
        aiToolsUsed: ['Claude'],
        duration: 25,
        timeMinutesNoAi: undefined,
        reworkCount: 0,
        notes: 'レビュー指摘をAIで整理',
        createdAt: getThisWeekDate(1),
        completedAt: getThisWeekDate(1),
      },
      // AI未使用タスク: 比較対象
      {
        id: 'task-005',
        name: 'バグ調査',
        taskUrl: '',
        category: ['開発'],
        aiUsed: false,
        aiToolsUsed: [],
        duration: 60,
        timeMinutesNoAi: undefined,
        reworkCount: 2,
        notes: '手動でログ確認',
        createdAt: getThisWeekDate(2),
        completedAt: getThisWeekDate(2),
      },
      {
        id: 'task-006',
        name: 'デプロイ作業',
        taskUrl: '',
        category: ['インフラ'],
        aiUsed: false,
        aiToolsUsed: [],
        duration: 45,
        timeMinutesNoAi: undefined,
        reworkCount: 1,
        notes: 'マニュアルでデプロイ',
        createdAt: getThisWeekDate(2),
        completedAt: getThisWeekDate(2),
      },
      {
        id: 'task-007',
        name: '会議資料作成',
        taskUrl: '',
        category: ['ドキュメント'],
        aiUsed: false,
        aiToolsUsed: [],
        duration: 50,
        timeMinutesNoAi: undefined,
        reworkCount: 0,
        notes: '手動でスライド作成',
        createdAt: getThisWeekDate(3),
        completedAt: getThisWeekDate(3),
      },
      {
        id: 'task-008',
        name: 'テスト実行・修正',
        taskUrl: '',
        category: ['テスト'],
        aiUsed: false,
        aiToolsUsed: [],
        duration: 35,
        timeMinutesNoAi: undefined,
        reworkCount: 3,
        notes: '手動テスト',
        createdAt: getThisWeekDate(3),
        completedAt: getThisWeekDate(3),
      },
    ];

    await insertTasks(page, tasks);

    // ページをリロードしてデータを反映
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Act: AI ROI ボタンをクリック
    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await expect(roiButton).toBeVisible();
    await roiButton.click();

    // モーダルが開くまで待つ
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(500); // アニメーション完了を待つ

    // ━━━ スクリーンショット: モーダルが開いた直後の状態 ━━━
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_roi_dashboard_with_data.png'),
    });

    // Assert: 4カードが表示されていること
    await expect(page.getByText('今週のAI活用率')).toBeVisible();
    await expect(page.getByText('推定時間削減')).toBeVisible();
    await expect(page.getByText('最も効果的なカテゴリ')).toBeVisible();
    await expect(page.getByText('AI ROIスコア')).toBeVisible();

    // Assert: カテゴリ別AI活用率グラフの見出しが表示されていること
    await expect(page.getByText('カテゴリ別AI活用率')).toBeVisible();

    // Assert: パーセント表示・分表示が含まれていること
    const modalContent = page.locator('[role="dialog"]');
    await expect(modalContent.getByText(/%/).first()).toBeVisible();
    await expect(modalContent.getByText(/分/).first()).toBeVisible();
  });

  test('データあり時、ROIスコアと評価ラベルが表示される', async ({ page }) => {
    // ━━━ Arrange: Excellent 評価になるデータを投入（AI活用率高・削減時間大） ━━━
    const tasks = [
      {
        id: 'roi-001', name: '機能A実装', taskUrl: '', category: ['開発'],
        aiUsed: true, aiToolsUsed: ['Claude'], duration: 20, timeMinutesNoAi: 90,
        reworkCount: 0, notes: '', createdAt: getThisWeekDate(0), completedAt: getThisWeekDate(0),
      },
      {
        id: 'roi-002', name: '機能B実装', taskUrl: '', category: ['開発'],
        aiUsed: true, aiToolsUsed: ['Claude'], duration: 25, timeMinutesNoAi: 80,
        reworkCount: 0, notes: '', createdAt: getThisWeekDate(0), completedAt: getThisWeekDate(0),
      },
      {
        id: 'roi-003', name: 'テスト自動化', taskUrl: '', category: ['テスト'],
        aiUsed: true, aiToolsUsed: ['Copilot'], duration: 30, timeMinutesNoAi: 90,
        reworkCount: 0, notes: '', createdAt: getThisWeekDate(1), completedAt: getThisWeekDate(1),
      },
      {
        id: 'roi-004', name: 'ドキュメント', taskUrl: '', category: ['ドキュメント'],
        aiUsed: true, aiToolsUsed: ['Claude'], duration: 15, timeMinutesNoAi: 60,
        reworkCount: 0, notes: '', createdAt: getThisWeekDate(1), completedAt: getThisWeekDate(1),
      },
      {
        id: 'roi-005', name: '手動デプロイ', taskUrl: '', category: ['インフラ'],
        aiUsed: false, aiToolsUsed: [], duration: 60,
        reworkCount: 2, notes: '', createdAt: getThisWeekDate(2), completedAt: getThisWeekDate(2),
      },
    ];

    await insertTasks(page, tasks);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Act: モーダルを開く
    await page.getByRole('button', { name: /ai roi/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(500);

    // ━━━ スクリーンショット: ROIスコアカードが見える状態 ━━━
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_roi_score_and_label.png'),
    });

    // Assert: ROIスコアが表示されている
    await expect(page.getByText('AI ROIスコア')).toBeVisible();

    // Assert: 評価ラベル（Excellent / Good / Fair）のどれかが表示されている
    const modal = page.locator('[role="dialog"]');
    const hasLabel = await modal.getByText(/Excellent|Good|Fair/).isVisible().catch(() => false);
    expect(hasLabel).toBeTruthy();
  });

  test('カテゴリ別AI活用率グラフがデータあり時に描画される', async ({ page }) => {
    // ━━━ Arrange: 複数カテゴリにまたがるデータを投入 ━━━
    const tasks = [
      { id: 'cat-001', name: '開発タスクA', taskUrl: '', category: ['開発'], aiUsed: true, aiToolsUsed: ['Claude'], duration: 30, reworkCount: 0, notes: '', createdAt: getThisWeekDate(0), completedAt: getThisWeekDate(0) },
      { id: 'cat-002', name: '開発タスクB', taskUrl: '', category: ['開発'], aiUsed: true, aiToolsUsed: ['Copilot'], duration: 25, reworkCount: 0, notes: '', createdAt: getThisWeekDate(0), completedAt: getThisWeekDate(0) },
      { id: 'cat-003', name: 'テストタスク', taskUrl: '', category: ['テスト'], aiUsed: true, aiToolsUsed: ['Claude'], duration: 20, reworkCount: 1, notes: '', createdAt: getThisWeekDate(1), completedAt: getThisWeekDate(1) },
      { id: 'cat-004', name: 'ドキュメントA', taskUrl: '', category: ['ドキュメント'], aiUsed: false, aiToolsUsed: [], duration: 40, reworkCount: 0, notes: '', createdAt: getThisWeekDate(1), completedAt: getThisWeekDate(1) },
      { id: 'cat-005', name: '開発タスクC（手動）', taskUrl: '', category: ['開発'], aiUsed: false, aiToolsUsed: [], duration: 60, reworkCount: 2, notes: '', createdAt: getThisWeekDate(2), completedAt: getThisWeekDate(2) },
      { id: 'cat-006', name: 'インフラ作業', taskUrl: '', category: ['インフラ'], aiUsed: false, aiToolsUsed: [], duration: 50, reworkCount: 1, notes: '', createdAt: getThisWeekDate(2), completedAt: getThisWeekDate(2) },
    ];

    await insertTasks(page, tasks);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Act: モーダルを開く
    await page.getByRole('button', { name: /ai roi/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    // Recharts の描画完了を待つ
    await page.waitForTimeout(800);

    // ━━━ スクリーンショット: カテゴリ別棒グラフが描画された状態 ━━━
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_roi_category_chart.png'),
    });

    // Assert: カテゴリ別AI活用率の見出しが表示されている
    await expect(page.getByText('カテゴリ別AI活用率')).toBeVisible();

    // Assert: SVGグラフ要素（Recharts）が描画されている
    const chart = page.locator('[role="dialog"] svg');
    await expect(chart.first()).toBeVisible();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ケース2: データ不足状態
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('タスクが0件の場合、プレースホルダーメッセージが表示される', async ({ page }) => {
    // Arrange: DB は beforeEach でクリア済み（0件状態）

    // Act: モーダルを開く
    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await expect(roiButton).toBeVisible();
    await roiButton.click();

    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(500);

    // ━━━ スクリーンショット: 空状態のメッセージが表示された状態 ━━━
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_roi_empty_state.png'),
    });

    // Assert: プレースホルダーメッセージが表示されていること
    await expect(
      page.getByText(/まだデータがありません。タスクを記録して始めましょう/i)
    ).toBeVisible({ timeout: 5000 });

    // Assert: 4カードが表示されていないこと
    await expect(page.getByText('今週のAI活用率')).not.toBeVisible();
  });

  test('AI使用タスクのみ存在する場合（未使用タスクなし）、プレースホルダーが表示される', async ({ page }) => {
    // Arrange: AI使用タスクのみ5件（未使用タスクが0件 → 条件不足）
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      id: `ai-only-${i}`,
      name: `AIタスク${i + 1}`,
      taskUrl: '',
      category: ['開発'],
      aiUsed: true,
      aiToolsUsed: ['Claude'],
      duration: 30,
      reworkCount: 0,
      notes: '',
      createdAt: getThisWeekDate(i % 3),
      completedAt: getThisWeekDate(i % 3),
    }));

    await insertTasks(page, tasks);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Act: モーダルを開く
    await page.getByRole('button', { name: /ai roi/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(500);

    // ━━━ スクリーンショット: データ不足状態 ━━━
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06_roi_insufficient_data.png'),
    });

    // Assert: プレースホルダーメッセージが表示されていること
    await expect(
      page.getByText(/まだデータがありません。タスクを記録して始めましょう/i)
    ).toBeVisible({ timeout: 5000 });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // モーダルの開閉動作
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('モーダルを閉じることができる', async ({ page }) => {
    // Act: モーダルを開く
    await page.getByRole('button', { name: /ai roi/i }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 閉じるボタンをクリック（Modal コンポーネントの × ボタン）
    const closeButton = modal.getByRole('button').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // ━━━ スクリーンショット: モーダルが閉じてホームに戻った状態 ━━━
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07_modal_closed.png'),
    });

    // Assert: ホーム画面に戻り、AI ROI ボタンが再び見えること
    await expect(page.getByRole('button', { name: /ai roi/i })).toBeVisible();
  });
});
