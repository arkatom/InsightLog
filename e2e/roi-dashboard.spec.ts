import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * AI ROI ダッシュボード E2E テスト
 *
 * 受け入れ条件:
 * - ヘッダーに「AI ROI」ボタンが存在し、クリックでモーダルが開く
 * - データあり: 4カード（今週のAI活用率・推定時間削減・最も効果的なカテゴリ・AI ROI スコア）と棒グラフが表示される
 * - データなし: 「まだデータがありません。タスクを記録して始めましょう 🚀」メッセージが表示される
 * - モーダルを閉じることができる
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.join(__dirname, '../demo/screenshots');

/**
 * 今週（月曜始まり）の特定オフセット日の ISO 文字列を返す。
 * page.evaluate に渡すために Node.js 側で計算する。
 */
function thisWeekIso(dayOffset = 0): string {
  const now = new Date();
  const day = now.getDay(); // 0=日, 1=月, ..., 6=土
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const date = new Date(now);
  date.setDate(now.getDate() + mondayOffset + dayOffset);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

/** IndexedDB をクリアして空の状態にする */
async function clearDatabase(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('InsightLogDB');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
}

/**
 * 今週のタスクをモックデータとして IndexedDB に直接投入する。
 *
 * hasEnoughData = true にするには aiUsed=true と aiUsed=false の両方が必要。
 * ROI スコアを高くするため、AI 使用タスクは短時間（25〜30分）、未使用タスクは長時間（60〜90分）にする。
 * カテゴリを「実装」「ドキュメント」「設計」「レビュー」「調査」に分散させ棒グラフに複数バーを出す。
 */
async function seedTasksWithData(page: Page): Promise<void> {
  // Node.js 側で日付文字列を生成してから evaluate に渡す
  const mockTasks = [
    // AI使用タスク: 短時間
    {
      id: 'e2e-task-1',
      name: 'API設計をClaude支援で実装',
      taskUrl: '',
      category: ['実装'],
      aiUsed: true,
      aiToolsUsed: ['Claude'],
      duration: 25,
      reworkCount: 0,
      notes: 'AIで素早く完了',
      createdAt: thisWeekIso(0),
      completedAt: thisWeekIso(0),
    },
    {
      id: 'e2e-task-2',
      name: 'ユニットテストをCopilot支援で作成',
      taskUrl: '',
      category: ['実装'],
      aiUsed: true,
      aiToolsUsed: ['GitHub Copilot'],
      duration: 30,
      reworkCount: 0,
      notes: 'テストコード自動生成',
      createdAt: thisWeekIso(1),
      completedAt: thisWeekIso(1),
    },
    {
      id: 'e2e-task-3',
      name: 'ドキュメントをAI支援で作成',
      taskUrl: '',
      category: ['ドキュメント'],
      aiUsed: true,
      aiToolsUsed: ['Claude'],
      duration: 20,
      reworkCount: 0,
      notes: 'ドキュメント自動生成活用',
      createdAt: thisWeekIso(2),
      completedAt: thisWeekIso(2),
    },
    // AI未使用タスク: 長時間
    {
      id: 'e2e-task-4',
      name: 'システム設計レビュー（手動）',
      taskUrl: '',
      category: ['設計'],
      aiUsed: false,
      aiToolsUsed: [],
      duration: 90,
      reworkCount: 1,
      notes: '手動でじっくりレビュー',
      createdAt: thisWeekIso(0),
      completedAt: thisWeekIso(0),
    },
    {
      id: 'e2e-task-5',
      name: 'コードレビュー（手動）',
      taskUrl: '',
      category: ['レビュー'],
      aiUsed: false,
      aiToolsUsed: [],
      duration: 60,
      reworkCount: 2,
      notes: '手動でコードを読み込んでレビュー',
      createdAt: thisWeekIso(1),
      completedAt: thisWeekIso(1),
    },
    {
      id: 'e2e-task-6',
      name: '技術調査（手動）',
      taskUrl: '',
      category: ['調査'],
      aiUsed: false,
      aiToolsUsed: [],
      duration: 75,
      reworkCount: 0,
      notes: '技術調査を手動で実施',
      createdAt: thisWeekIso(2),
      completedAt: thisWeekIso(2),
    },
  ];

  await page.evaluate((tasks) => {
    return new Promise<void>((resolve, reject) => {
      // バージョン指定なしで開くことで、現在の DB バージョンに合わせて接続する
      // （clearDatabase + reload 後に Dexie が最新バージョンで DB を再作成しているため）
      const request = indexedDB.open('InsightLogDB');

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const stores = ['tasks', 'sessions', 'settings', 'reports'];
        for (const storeName of stores) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');

        for (const task of tasks) {
          // ISO 文字列を Date オブジェクトに変換（Dexie は Date を期待する）
          store.put({
            ...task,
            createdAt: new Date(task.createdAt),
            completedAt: task.completedAt ? new Date(task.completedAt) : null,
          });
        }

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }, mockTasks);
}

test.describe('AI ROI ダッシュボード', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ケース1: データあり
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('データあり: ヘッダーのAI ROIボタンをクリックするとダッシュボードが開き4カードが表示される', async ({ page }) => {
    // ━━━ Arrange: DBクリア → モックデータ投入 → リロード ━━━
    await clearDatabase(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    await seedTasksWithData(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ━━━ スクリーンショット1: ホーム画面（ヘッダーにAI ROIボタンが見える状態） ━━━
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_home_with_roi_button.png') });

    // ━━━ Act: ヘッダーの「AI ROI」ボタン（title属性）をクリック ━━━
    const roiButton = page.locator('button[title="AI ROI"]');
    await expect(roiButton).toBeVisible();
    await roiButton.click();

    // 遅延ロード（lazy import + Suspense）と CSS トランジションを待つ
    await page.waitForTimeout(700);

    // ━━━ Assert: モーダルのタイトルが表示されている ━━━
    await expect(page.getByText('AI ROI ダッシュボード')).toBeVisible({ timeout: 5000 });

    // ━━━ Assert: 4カードのラベルが表示されている ━━━
    await expect(page.getByText('今週のAI活用率')).toBeVisible();
    await expect(page.getByText('推定時間削減')).toBeVisible();
    await expect(page.getByText('最も効果的なカテゴリ')).toBeVisible();
    await expect(page.getByText('AI ROI スコア')).toBeVisible();

    // ━━━ スクリーンショット2: モーダルが開いた状態（4カードとデータが表示） ━━━
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_roi_dashboard_with_data.png') });
  });

  test('データあり: カテゴリ別AI活用率の棒グラフ（Recharts）が描画される', async ({ page }) => {
    // ━━━ Arrange: モックデータを投入 ━━━
    await clearDatabase(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    await seedTasksWithData(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ━━━ Act: モーダルを開く ━━━
    await page.locator('button[title="AI ROI"]').click();
    await page.waitForTimeout(700);

    // ━━━ Assert: 「カテゴリ別 AI 活用率」セクションが表示されている ━━━
    await expect(page.getByText('カテゴリ別 AI 活用率')).toBeVisible({ timeout: 5000 });

    // Recharts ResponsiveContainer が SVG を描画していることを確認
    const barChartSvg = page.locator('.recharts-responsive-container svg');
    await expect(barChartSvg).toBeVisible({ timeout: 3000 });

    // ━━━ スクリーンショット3: 棒グラフが描画された状態 ━━━
    // モーダルをスクロールしてグラフが見えるようにする
    await page.locator('.recharts-responsive-container').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_roi_category_chart.png') });
  });

  test('データあり: AI ROI スコアカードに評価ラベル（Excellent/Good/Fair）が表示される', async ({ page }) => {
    // ━━━ Arrange: AI使用タスクが短く未使用タスクが長い → 高スコアになるモックデータ ━━━
    await clearDatabase(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    await seedTasksWithData(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ━━━ Act: モーダルを開く ━━━
    await page.locator('button[title="AI ROI"]').click();
    await page.waitForTimeout(700);

    // ━━━ Assert: Excellent/Good/Fair/N/A のいずれかのラベルが表示されている ━━━
    const roiLabelLocator = page.locator('span').filter({
      hasText: /^(Excellent|Good|Fair|N\/A)$/,
    });
    await expect(roiLabelLocator).toBeVisible({ timeout: 5000 });

    // ━━━ スクリーンショット4: ROIスコアと評価ラベルが見えるダッシュボード ━━━
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_roi_score_with_label.png') });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ケース2: データ不足（データなし）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('データなし: 「まだデータがありません。タスクを記録して始めましょう」メッセージが表示される', async ({ page }) => {
    // ━━━ Arrange: DBを空にする ━━━
    await clearDatabase(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    // ━━━ Act: AI ROI ボタンをクリック ━━━
    const roiButton = page.locator('button[title="AI ROI"]');
    await expect(roiButton).toBeVisible();
    await roiButton.click();
    await page.waitForTimeout(700);

    // ━━━ Assert: プレースホルダーメッセージが表示される ━━━
    await expect(
      page.getByText('まだデータがありません。タスクを記録して始めましょう 🚀')
    ).toBeVisible({ timeout: 5000 });

    // 4カードは表示されていないことを確認
    await expect(page.getByText('今週のAI活用率')).not.toBeVisible();

    // ━━━ スクリーンショット5: データなし時のモーダル（プレースホルダー表示） ━━━
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_roi_dashboard_empty.png') });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // モーダルの開閉動作
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('モーダルの×ボタンでダッシュボードを閉じることができる', async ({ page }) => {
    // ━━━ Act: モーダルを開く ━━━
    await page.locator('button[title="AI ROI"]').click();
    await page.waitForTimeout(700);

    // モーダルタイトルが表示されていることを確認
    const modalTitle = page.getByText('AI ROI ダッシュボード');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // ━━━ Act: × アイコンボタンをクリックして閉じる ━━━
    // RoiDashboard.tsx のヘッダー右端にある <button onClick={onClose}>
    // モーダルのオーバーレイ（.fixed.inset-0）内の最後のボタンが×ボタン
    const modalOverlay = page.locator('.fixed.inset-0');
    const closeButton = modalOverlay.locator('button').last();
    await closeButton.click();
    await page.waitForTimeout(400);

    // ━━━ Assert: モーダルが閉じていること ━━━
    await expect(modalTitle).not.toBeVisible();

    // ━━━ スクリーンショット6: モーダルが閉じた後のホーム画面 ━━━
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_modal_closed.png') });
  });
});
