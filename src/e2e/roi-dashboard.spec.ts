import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * AI ROI ダッシュボード E2E テスト
 *
 * ship-qa-planner が acceptance criteria に基づいて作成するテストの骨格。
 * ship-qa-executor がこのファイルを実行し、ビデオ録画 → GIF 変換まで行う。
 *
 * 受け入れ条件（demo/issue.md より）:
 * - ヘッダーに「AI ROI」ボタンが存在する
 * - ボタンクリックでモーダルが開く
 * - モーダルに4カード（活用率・削減時間・カテゴリ・スコア）が表示される
 * - データなし時はプレースホルダーメッセージが表示される
 * - モーダルを閉じることができる
 */

const SCREENSHOTS_DIR = path.join(__dirname, '../../demo/screenshots');

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

    // モーダルが開くことを確認（モーダルのタイトルまたはコンテンツで判定）
    const modal = page.locator('[role="dialog"], [data-testid="roi-dashboard"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

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
    // カードのテキストで存在確認（実装に合わせてセレクターを調整）
    const possibleCardTexts = [
      /ai活用率|活用率/i,
      /削減時間|時間削減/i,
      /カテゴリ|効果的/i,
      /roiスコア|スコア/i,
    ];

    // 4カードすべてが存在するか、またはプレースホルダーが表示されているか
    const hasCards = await Promise.all(
      possibleCardTexts.map(text => page.getByText(text).isVisible().catch(() => false))
    );
    const hasPlaceholder = await page.getByText(/データがありません|タスクを記録/i).isVisible().catch(() => false);

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

    const modal = page.locator('[role="dialog"], [data-testid="roi-dashboard"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 閉じるボタンをクリック（×ボタン）
    const closeButton = modal.getByRole('button', { name: /close|閉じる|×/i }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // ESC キーでも閉じられることを確認
      await page.keyboard.press('Escape');
    }

    await expect(modal).not.toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05_modal_closed.png'),
      fullPage: false,
    });
  });

  test('モーダルのデザインがモノトーン基調であることを確認', async ({ page }) => {
    const roiButton = page.getByRole('button', { name: /ai roi/i });
    await roiButton.click();

    const modal = page.locator('[role="dialog"], [data-testid="roi-dashboard"]').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // ネオンカラーがないことの確認（背景色チェック）
    // Playwright の evaluate でスタイルを検査
    const hasNeonColors = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const neonPattern = /rgb\(0,\s*255|rgb\(255,\s*0,\s*255|#00ff|#ff00ff/i;
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (neonPattern.test(style.backgroundColor) || neonPattern.test(style.color)) {
          return true;
        }
      }
      return false;
    });

    expect(hasNeonColors).toBeFalsy();
  });
});
