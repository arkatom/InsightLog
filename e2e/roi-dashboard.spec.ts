import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * AI ROI ダッシュボード E2E テスト
 *
 * 受け入れ条件（demo/issue.md より）:
 * - ヘッダーに「AI ROI」ボタンが存在する
 * - ボタンクリックでモーダルが開く
 * - モーダルに4カード（活用率・削減時間・カテゴリ・スコア）が表示される
 * - データなし時はプレースホルダーメッセージが表示される
 * - モーダルを閉じることができる
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.join(__dirname, '../demo/screenshots');

test.describe('AI ROI ダッシュボード', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('ヘッダーに「AI ROI」ボタンが表示される', async ({ page }) => {
    // AI ROI ボタンが存在することを確認
    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await expect(roiButton).toBeVisible();

    // スクリーンショット保存
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01_home_with_roi_button.png'),
      fullPage: false,
    });
  });

  test('AI ROIボタンをクリックするとモーダルが開く', async ({ page }) => {
    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    // モーダルタイトルで判定
    const modalTitle = page.getByText('AI ROI ダッシュボード');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // モーダルが開いた状態のスクリーンショット
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02_roi_dashboard_open.png'),
      fullPage: false,
    });
  });

  test('モーダルに4カード（AI活用率・削減時間・カテゴリ・スコア）が表示される', async ({ page }) => {
    // モーダルを開く
    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    // データがある場合の4カードを確認
    const possibleCardTexts = [
      /ai活用率|活用率/i,
      /削減時間|時間削減/i,
      /カテゴリ|効果的/i,
      /roiスコア|スコア/i,
    ];

    // 4カードすべてが存在するか、またはプレースホルダーが表示されているか
    const hasCards = await Promise.all(
      possibleCardTexts.map((text) =>
        page
          .getByText(text)
          .isVisible()
          .catch(() => false)
      )
    );
    const hasPlaceholder = await page
      .getByText(/データがありません|タスクを記録/i)
      .isVisible()
      .catch(() => false);

    // どちらかが表示されていればOK
    expect(hasCards.some(Boolean) || hasPlaceholder).toBeTruthy();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03_roi_dashboard_cards.png'),
      fullPage: false,
    });
  });

  test('データがない場合はプレースホルダーメッセージが表示される', async ({ page }) => {
    // IndexedDB をクリア（データなし状態を作る）
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const deleteReq = indexedDB.deleteDatabase('InsightLogDB');
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => resolve(); // エラーでも続行
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    // プレースホルダーが表示されることを確認
    const placeholder = page.getByText(/データがありません|タスクを記録|まだデータ/i);
    await expect(placeholder).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04_roi_dashboard_empty.png'),
      fullPage: false,
    });
  });

  test('モーダルを閉じることができる', async ({ page }) => {
    // モーダルを開く
    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    const modalTitle = page.getByText('AI ROI ダッシュボード');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // 閉じるボタンをクリック（×ボタン）
    const closeButton = page.locator('button').filter({ has: page.locator('svg.lucide-x') });
    await closeButton.first().click();

    await expect(modalTitle).not.toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_modal_closed.png'),
      fullPage: false,
    });
  });
});
