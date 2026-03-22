import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * AI ROI ダッシュボード E2E テスト
 *
 * 受け入れ条件:
 * - ヘッダーに「AI ROI」ボタンが存在する
 * - ボタンクリックでモーダルが開く
 * - データなし時はプレースホルダーメッセージが表示される
 * - データあり時は4カード（活用率・削減時間・カテゴリ・スコア）が表示される
 * - カテゴリ別AI活用率の棒グラフが表示される
 * - モーダルを閉じることができる
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.join(__dirname, '../demo/screenshots');

/**
 * アプリが開いた後、Dexie経由でサンプルデータを投入する
 */
async function seedTestData(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    return new Promise<void>((resolve, reject) => {
      // Dexie が既にDBを開いているため、既存の接続経由でデータを追加する
      // indexedDB.open で既存バージョンに合わせる
      const request = indexedDB.open('InsightLogDB');
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');

        const now = new Date();
        const tasks = [
          {
            id: 'test-1',
            name: 'AI実装タスク1',
            category: ['実装'],
            aiUsed: true,
            aiToolsUsed: ['Claude'],
            duration: 20,
            reworkCount: 0,
            notes: '',
            createdAt: now,
            completedAt: now,
          },
          {
            id: 'test-2',
            name: 'AI設計タスク',
            category: ['設計'],
            aiUsed: true,
            aiToolsUsed: ['Claude'],
            duration: 30,
            reworkCount: 0,
            notes: '',
            createdAt: now,
            completedAt: now,
          },
          {
            id: 'test-3',
            name: 'AI実装タスク2',
            category: ['実装'],
            aiUsed: true,
            aiToolsUsed: ['Copilot'],
            duration: 40,
            reworkCount: 0,
            notes: '',
            createdAt: now,
            completedAt: now,
          },
          {
            id: 'test-4',
            name: '手動実装タスク1',
            category: ['実装'],
            aiUsed: false,
            aiToolsUsed: [],
            duration: 70,
            reworkCount: 2,
            notes: '',
            createdAt: now,
            completedAt: now,
          },
          {
            id: 'test-5',
            name: '手動調査タスク',
            category: ['調査'],
            aiUsed: false,
            aiToolsUsed: [],
            duration: 80,
            reworkCount: 1,
            notes: '',
            createdAt: now,
            completedAt: now,
          },
          {
            id: 'test-6',
            name: '手動実装タスク2',
            category: ['実装'],
            aiUsed: false,
            aiToolsUsed: [],
            duration: 90,
            reworkCount: 3,
            notes: '',
            createdAt: now,
            completedAt: now,
          },
        ];

        for (const task of tasks) {
          store.put(task);
        }

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(new Error('Failed to seed test data'));
        };
      };
      request.onerror = () => reject(new Error('Failed to open DB'));
    });
  });
}

test.describe('AI ROI ダッシュボード', () => {
  test('ヘッダーに「AI ROI」ボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await expect(roiButton).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_home_with_roi_button.png'),
      fullPage: false,
    });
  });

  test('データがない場合はプレースホルダーメッセージが表示される', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const deleteReq = indexedDB.deleteDatabase('InsightLogDB');
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => resolve();
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    const placeholder = page.getByText(/まだデータがありません/i);
    await expect(placeholder).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_roi_dashboard_empty.png'),
      fullPage: false,
    });
  });

  test('データがある場合、モーダルに4カードが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await seedTestData(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    const modal = page.locator('[data-testid="roi-dashboard"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await expect(page.getByText(/今週のAI活用率/)).toBeVisible();
    await expect(page.getByText(/推定時間削減/)).toBeVisible();
    await expect(page.getByText(/最も効果的なカテゴリ/)).toBeVisible();
    await expect(page.getByText(/AI ROIスコア/)).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_roi_dashboard_cards.png'),
      fullPage: false,
    });
  });

  test('カテゴリ別AI活用率のグラフが表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await seedTestData(page);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    const modal = page.locator('[data-testid="roi-dashboard"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    await expect(page.getByText(/カテゴリ別 AI 活用率/)).toBeVisible();

    const chart = modal.locator('.recharts-responsive-container');
    await expect(chart).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_roi_dashboard_chart.png'),
      fullPage: false,
    });
  });

  test('モーダルを閉じることができる', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    const modal = page.locator('[data-testid="roi-dashboard"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();

    await expect(modal).not.toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_modal_closed.png'),
      fullPage: false,
    });
  });
});
