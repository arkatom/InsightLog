import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * AI ROI ダッシュボード E2E テスト
 *
 * 受け入れ条件（Issue #3）:
 * ケース1: AI使用・未使用タスクが5件以上存在する場合 → 4カード + グラフが表示される
 * ケース2: データが0件 or AI使用/未使用どちらかのみ → 空状態メッセージが表示される
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCREENSHOTS_DIR = path.join(__dirname, '../demo/screenshots');

/**
 * DB をクリアしてからモックタスクを投入する。
 * useStatistics('week') が参照するため completedAt を今週内にする。
 * isThisWeek のデフォルト weekStartsOn=0（日曜始まり）に合わせて、
 * 今週の日曜日（週の開始日）のタイムスタンプを計算して全タスクを今週内の日時に設定する。
 * AI使用・未使用それぞれ複数件、複数カテゴリにわたるデータを入れる。
 */
async function seedMockTasks(page: import('@playwright/test').Page) {
  // 今週の開始日（日曜日）のタイムスタンプを計算してから渡す
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=日曜
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - dayOfWeek); // 今週の日曜日
  // 今週内の複数の日のタイムスタンプ（週の開始から0〜5時間ずらすだけ）
  const ts0 = weekStart.getTime() + 1 * 60 * 60 * 1000; // 週開始 + 1時間
  const ts1 = weekStart.getTime() + 2 * 60 * 60 * 1000;
  const ts2 = weekStart.getTime() + 3 * 60 * 60 * 1000;
  const ts3 = weekStart.getTime() + 4 * 60 * 60 * 1000;
  const ts4 = weekStart.getTime() + 5 * 60 * 60 * 1000;
  const ts5 = weekStart.getTime() + 6 * 60 * 60 * 1000;

  await page.evaluate(async (timestamps) => {
    const [ts0, ts1, ts2, ts3, ts4, ts5] = timestamps;

    // DB 削除して再オープン
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('InsightLogDB');
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });

    // Dexie を介さず直接 IndexedDB を操作
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('InsightLogDB', 3);
      req.onupgradeneeded = (ev) => {
        const d = (ev.target as IDBOpenDBRequest).result;
        if (!d.objectStoreNames.contains('tasks')) {
          d.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains('sessions')) {
          d.createObjectStore('sessions', { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains('settings')) {
          d.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains('reports')) {
          d.createObjectStore('reports', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    // Date オブジェクトで格納（IndexedDB は Date を保存できる）
    const tasks = [
      // AI使用タスク（今週）
      {
        id: 'mock-1',
        name: 'APIエンドポイント実装',
        taskUrl: '',
        category: ['実装'],
        aiUsed: true,
        aiToolsUsed: ['Claude'],
        duration: 20,
        reworkCount: 0,
        notes: 'Claudeで雛形生成',
        createdAt: new Date(ts0),
        completedAt: new Date(ts0),
      },
      {
        id: 'mock-2',
        name: 'ユニットテスト作成',
        taskUrl: '',
        category: ['実装'],
        aiUsed: true,
        aiToolsUsed: ['Claude', 'Copilot'],
        duration: 15,
        reworkCount: 0,
        notes: '',
        createdAt: new Date(ts1),
        completedAt: new Date(ts1),
      },
      {
        id: 'mock-3',
        name: 'DB設計レビュー',
        taskUrl: '',
        category: ['設計'],
        aiUsed: true,
        aiToolsUsed: ['ChatGPT'],
        duration: 25,
        reworkCount: 1,
        notes: 'ChatGPTでER図を整理',
        createdAt: new Date(ts2),
        completedAt: new Date(ts2),
      },
      // AI未使用タスク（今週）
      {
        id: 'mock-4',
        name: 'バグ調査',
        taskUrl: '',
        category: ['調査'],
        aiUsed: false,
        aiToolsUsed: [],
        duration: 60,
        reworkCount: 2,
        notes: '',
        createdAt: new Date(ts3),
        completedAt: new Date(ts3),
      },
      {
        id: 'mock-5',
        name: 'コードレビュー',
        taskUrl: '',
        category: ['レビュー'],
        aiUsed: false,
        aiToolsUsed: [],
        duration: 45,
        reworkCount: 1,
        notes: '',
        createdAt: new Date(ts4),
        completedAt: new Date(ts4),
      },
      {
        id: 'mock-6',
        name: 'ドキュメント更新',
        taskUrl: '',
        category: ['ドキュメント'],
        aiUsed: false,
        aiToolsUsed: [],
        duration: 50,
        reworkCount: 0,
        notes: '',
        createdAt: new Date(ts5),
        completedAt: new Date(ts5),
      },
    ];

    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    for (const task of tasks) {
      store.put(task);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, [ts0, ts1, ts2, ts3, ts4, ts5]);
}

test.describe('AI ROI ダッシュボード', () => {
  // ケース1: AI使用・未使用タスクが存在する場合
  test.describe('データあり（AI使用・未使用タスクが5件以上）', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await seedMockTasks(page);
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('ヘッダーに「AI ROI」ボタンが表示される', async ({ page }) => {
      // title 属性でボタンを特定（Header.tsx で title="AI ROI" が設定されている）
      const roiButton = page.getByTitle('AI ROI');
      await expect(roiButton).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '01_home_with_roi_button.png'),
      });
    });

    test('AI ROIボタンをクリックするとダッシュボードモーダルが開く', async ({ page }) => {
      const roiButton = page.getByTitle('AI ROI');
      await roiButton.click();

      // モーダルのタイトル「AI ROI ダッシュボード」が表示されることで判定
      const modalTitle = page.getByText('AI ROI ダッシュボード');
      await expect(modalTitle).toBeVisible({ timeout: 5000 });

      // アニメーション完了を待ってからスクリーンショット
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '02_roi_dashboard_open.png'),
      });
    });

    test('4カード（AI活用率・削減時間・カテゴリ・スコア）が表示される', async ({ page }) => {
      const roiButton = page.getByTitle('AI ROI');
      await roiButton.click();

      // モーダル表示を待つ
      await expect(page.getByText('AI ROI ダッシュボード')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // 4カードのラベルを確認（RoiDashboard.tsx の実装に合わせた正確なテキスト）
      await expect(page.getByText('今週のAI活用率')).toBeVisible();
      await expect(page.getByText('推定時間削減')).toBeVisible();
      await expect(page.getByText('最も効果的なカテゴリ')).toBeVisible();
      await expect(page.getByText('AI ROI スコア')).toBeVisible();

      // 空状態メッセージが表示されていないことを確認
      await expect(page.getByText('まだデータがありません。タスクを記録して始めましょう 🚀')).not.toBeVisible();

      // 4カードが表示されている状態でスクリーンショット（PRレビュワーへの証拠）
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '03_roi_dashboard_four_cards.png'),
      });
    });

    test('AI活用率の数値（0–100%）が表示される', async ({ page }) => {
      const roiButton = page.getByTitle('AI ROI');
      await roiButton.click();

      await expect(page.getByText('今週のAI活用率')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // AI活用率は 0〜100% の数値 + "%" で表示される
      // モックデータ: AI使用3件 / 合計6件 = 50%
      // RoiDashboard.tsx: bg-accent-50 の div が AI活用率カード
      const aiUsageRateCard = page.locator('div.bg-accent-50');
      await expect(aiUsageRateCard).toBeVisible();
      // 数値テキストが "%" を含むことを確認
      const rateText = await aiUsageRateCard.locator('p.text-3xl').textContent();
      expect(rateText).toMatch(/^\d+%$/);

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '04_roi_usage_rate.png'),
      });
    });

    test('カテゴリ別AI活用率の棒グラフが表示される', async ({ page }) => {
      const roiButton = page.getByTitle('AI ROI');
      await roiButton.click();

      await expect(page.getByText('AI ROI ダッシュボード')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // グラフのセクションタイトルを確認
      await expect(page.getByText('カテゴリ別AI活用率')).toBeVisible();

      // Recharts の SVG が描画されていることを確認
      const chart = page.locator('.recharts-responsive-container');
      await expect(chart).toBeVisible();

      // グラフが描画された状態でスクリーンショット
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '05_roi_category_chart.png'),
      });
    });

    test('ROIスコアのラベル（Excellent/Good/Fair/N/A）が表示される', async ({ page }) => {
      const roiButton = page.getByTitle('AI ROI');
      await roiButton.click();

      await expect(page.getByText('AI ROI スコア')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // スコアラベルのいずれかが表示されている
      const hasScoreLabel = await page.getByText(/^(Excellent|Good|Fair|N\/A)$/).isVisible();
      expect(hasScoreLabel).toBeTruthy();

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '06_roi_score_label.png'),
      });
    });

    test('モーダルをXボタンで閉じることができる', async ({ page }) => {
      const roiButton = page.getByTitle('AI ROI');
      await roiButton.click();

      await expect(page.getByText('AI ROI ダッシュボード')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // モーダルヘッダー内の閉じるボタン（X アイコンを持つボタン）
      // RoiDashboard.tsx: <button onClick={onClose} ...><X size={24} /></button>
      // モーダルタイトル行の隣にある唯一のボタン（ヘッダー内）
      const modalHeader = page.locator('div.border-b').filter({ hasText: 'AI ROI ダッシュボード' });
      const closeButton = modalHeader.getByRole('button');
      await closeButton.click();

      // モーダルが閉じることを確認
      await expect(page.getByText('AI ROI ダッシュボード')).not.toBeVisible({ timeout: 3000 });

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '07_modal_closed.png'),
      });
    });
  });

  // ケース2: データが不足している場合
  test.describe('データなし（タスク0件）', () => {
    test.beforeEach(async ({ page }) => {
      // IndexedDB をクリアして空状態を作る
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase('InsightLogDB');
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      });
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('データが0件の場合、空状態メッセージが表示される', async ({ page }) => {
      const roiButton = page.getByTitle('AI ROI');
      await roiButton.click();

      await expect(page.getByText('AI ROI ダッシュボード')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // 空状態メッセージ（RoiDashboard.tsx の実装通り）
      const emptyMessage = page.getByText('まだデータがありません。タスクを記録して始めましょう 🚀');
      await expect(emptyMessage).toBeVisible();

      // 4カードは表示されていないことを確認
      await expect(page.getByText('今週のAI活用率')).not.toBeVisible();

      // 空状態の証拠スクリーンショット
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '08_roi_empty_state.png'),
      });
    });
  });

  // ケース2: AI使用タスクのみ（未使用がない）の場合
  test.describe('データ不足（AI使用タスクのみ）', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // 今週の日曜日のタイムスタンプ
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(now.getDate() - dayOfWeek);
      const nowTs = weekStart.getTime() + 1 * 60 * 60 * 1000;

      // AI使用タスクのみ投入（未使用なし → isEmpty = true）
      await page.evaluate(async (ts) => {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase('InsightLogDB');
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });

        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('InsightLogDB', 3);
          req.onupgradeneeded = (ev) => {
            const d = (ev.target as IDBOpenDBRequest).result;
            if (!d.objectStoreNames.contains('tasks')) d.createObjectStore('tasks', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('sessions')) d.createObjectStore('sessions', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('reports')) d.createObjectStore('reports', { keyPath: 'id' });
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        const tasks = [
          {
            id: 'ai-only-1',
            name: 'AI使用タスク1',
            taskUrl: '',
            category: ['実装'],
            aiUsed: true,
            aiToolsUsed: ['Claude'],
            duration: 20,
            reworkCount: 0,
            notes: '',
            createdAt: new Date(ts),
            completedAt: new Date(ts),
          },
          {
            id: 'ai-only-2',
            name: 'AI使用タスク2',
            taskUrl: '',
            category: ['設計'],
            aiUsed: true,
            aiToolsUsed: ['ChatGPT'],
            duration: 30,
            reworkCount: 0,
            notes: '',
            createdAt: new Date(ts + 3600000),
            completedAt: new Date(ts + 3600000),
          },
        ];

        const tx = db.transaction('tasks', 'readwrite');
        const store = tx.objectStore('tasks');
        for (const task of tasks) store.put(task);
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      }, nowTs);

      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('AI使用タスクのみの場合（AI未使用が0件）、空状態メッセージが表示される', async ({ page }) => {
      const roiButton = page.getByTitle('AI ROI');
      await roiButton.click();

      await expect(page.getByText('AI ROI ダッシュボード')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);

      // isEmpty = true（aiNotUsed.count === 0）のため空状態メッセージが表示される
      const emptyMessage = page.getByText('まだデータがありません。タスクを記録して始めましょう 🚀');
      await expect(emptyMessage).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, '09_roi_ai_only_empty_state.png'),
      });
    });
  });
});
