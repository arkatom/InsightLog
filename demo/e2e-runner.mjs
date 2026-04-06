/**
 * E2E テストランナー
 * playwright の低レベル API を使用（@playwright/test は使用禁止）
 */
import { chromium } from '/Volumes/OWCUS4EXP_1M2_4TB_SSD/ghq/github.com/arkatom/InsightLog/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';

const SCREENSHOTS_DIR = '/Volumes/OWCUS4EXP_1M2_4TB_SSD/ghq/github.com/arkatom/InsightLog/.claude/worktrees/demo-run/demo/screenshots';
const BASE_URL = 'http://localhost:5173';

const results = [];

function log(msg) {
  console.log(`[E2E] ${msg}`);
}

async function screenshot(page, filename) {
  const fullPath = `${SCREENSHOTS_DIR}/${filename}`;
  await page.screenshot({ path: fullPath, fullPage: false });
  log(`Screenshot saved: ${fullPath}`);
  return fullPath;
}

/**
 * ナビゲーションボタン（button.p-2）を nth で取得する
 * [0]=List, [1]=BarChart3(chart-column), [2]=TrendingUp, [3]=Settings
 */
function navBtn(page, index) {
  return page.locator('button.p-2').nth(index);
}

/**
 * モーダルの×ボタン（lucide-x SVGを持つボタン）をクリックしてモーダルを閉じる
 */
async function closeModal(page) {
  const xBtn = page.locator('button:has(svg.lucide-x)').first();
  const xBtnVisible = await xBtn.isVisible().catch(() => false);
  if (xBtnVisible) {
    await xBtn.click();
    log('×ボタン（lucide-x）でモーダルを閉じました');
  } else {
    await page.mouse.click(10, 10);
    log('オーバーレイ外クリックでモーダルを閉じました');
  }
  await page.waitForTimeout(500);
  await page.locator('div.fixed.inset-0').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * 今週の ROI データを確実に表示させるため、IndexedDB に直接モックデータを投入する
 * 条件: allTasks >= 5, aiTasks >= 1, nonAiTasks >= 1
 */
async function injectThisWeekMockData(page) {
  await page.evaluate(() => {
    return new Promise(async (resolve, reject) => {
      try {
        // IndexedDB を直接操作
        const dbReq = indexedDB.open('InsightLogDB');
        dbReq.onsuccess = (event) => {
          const db = event.target.result;
          const tx = db.transaction('tasks', 'readwrite');
          const store = tx.objectStore('tasks');

          const now = Date.now();
          const todayBase = now - (now % 86400000); // 今日の始まり(UTC)
          const oneHour = 3600000;

          // 今日（月曜）: AI使用タスク3件 + 非AI2件 = 合計5件以上
          const tasks = [
            {
              id: 'mock-roi-1',
              name: '要件定義（AI支援）',
              category: ['設計'],
              aiUsed: true,
              aiToolsUsed: ['Claude'],
              duration: 30,
              timeMinutesNoAi: 60,
              reworkCount: 0,
              notes: 'ROIテスト用モックデータ',
              createdAt: new Date(todayBase + 9 * oneHour),
              completedAt: new Date(todayBase + 9 * oneHour),
              isSample: true,
            },
            {
              id: 'mock-roi-2',
              name: 'コードレビュー（AI支援）',
              category: ['レビュー'],
              aiUsed: true,
              aiToolsUsed: ['Claude'],
              duration: 20,
              timeMinutesNoAi: 45,
              reworkCount: 0,
              notes: 'ROIテスト用モックデータ',
              createdAt: new Date(todayBase + 10 * oneHour),
              completedAt: new Date(todayBase + 10 * oneHour),
              isSample: true,
            },
            {
              id: 'mock-roi-3',
              name: 'バグ修正（AI支援）',
              category: ['実装'],
              aiUsed: true,
              aiToolsUsed: ['Claude'],
              duration: 15,
              timeMinutesNoAi: 50,
              reworkCount: 0,
              notes: 'ROIテスト用モックデータ',
              createdAt: new Date(todayBase + 11 * oneHour),
              completedAt: new Date(todayBase + 11 * oneHour),
              isSample: true,
            },
            {
              id: 'mock-roi-4',
              name: '手動テスト（非AI）',
              category: ['実装'],
              aiUsed: false,
              aiToolsUsed: [],
              duration: 60,
              timeMinutesNoAi: undefined,
              reworkCount: 1,
              notes: 'ROIテスト用モックデータ',
              createdAt: new Date(todayBase + 13 * oneHour),
              completedAt: new Date(todayBase + 13 * oneHour),
              isSample: true,
            },
            {
              id: 'mock-roi-5',
              name: 'ドキュメント作成（非AI）',
              category: ['ドキュメント'],
              aiUsed: false,
              aiToolsUsed: [],
              duration: 75,
              timeMinutesNoAi: undefined,
              reworkCount: 0,
              notes: 'ROIテスト用モックデータ',
              createdAt: new Date(todayBase + 14 * oneHour),
              completedAt: new Date(todayBase + 14 * oneHour),
              isSample: true,
            },
            {
              id: 'mock-roi-6',
              name: '設計ドキュメント（AI支援）',
              category: ['設計'],
              aiUsed: true,
              aiToolsUsed: ['Claude'],
              duration: 25,
              timeMinutesNoAi: 70,
              reworkCount: 0,
              notes: 'ROIテスト用モックデータ',
              createdAt: new Date(todayBase + 15 * oneHour),
              completedAt: new Date(todayBase + 15 * oneHour),
              isSample: true,
            },
          ];

          let addCount = 0;
          for (const task of tasks) {
            const req = store.put(task);
            req.onsuccess = () => {
              addCount++;
              if (addCount === tasks.length) {
                resolve(addCount);
              }
            };
            req.onerror = (e) => reject(e.target.error);
          }
        };
        dbReq.onerror = (e) => reject(e.target.error);
      } catch (err) {
        reject(err);
      }
    });
  });
  log('今週のモックデータをIndexedDBに直接投入しました');
}

async function runTests() {
  log('ブラウザを起動します...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // ============================================================
    // TC-01: データなし状態でモーダルを開く
    // ============================================================
    log('=== TC-01: データなし状態でモーダルを開く ===');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    log('アプリにナビゲートしました');

    // IndexedDB をクリアして空状態にする
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.deleteDatabase('InsightLogDB');
        req.onsuccess = resolve;
        req.onerror = resolve;
        req.onblocked = resolve;
      });
    });
    log('IndexedDB をクリアしました');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // ナビゲーションボタンの確認
    const navBtnCount = await page.locator('button.p-2').count();
    log(`ナビゲーションボタン数: ${navBtnCount}`);

    // ボタン[2] = TrendingUp (ROIダッシュボード)
    log('TrendingUp ボタン（インデックス2）をクリックします');
    await navBtn(page, 2).click();
    await page.waitForTimeout(2500);

    const modalVisible1 = await page.locator('text=AI活用ROIダッシュボード').isVisible().catch(() => false);
    log(`モーダル表示: ${modalVisible1}`);

    await screenshot(page, '01_roi_modal_empty.png');

    const hasTitle1 = await page.locator('text=AI活用ROIダッシュボード').isVisible().catch(() => false);
    const hasEmptyMsg = await page.locator('text=まだデータがありません').isVisible().catch(() => false);
    log(`TC-01 検証: タイトル=${hasTitle1}, 空メッセージ=${hasEmptyMsg}`);
    results.push({
      tc: 'TC-01',
      name: 'データなし状態でモーダルを開く',
      pass: hasTitle1 && hasEmptyMsg,
      details: `タイトル表示: ${hasTitle1}, 空メッセージ表示: ${hasEmptyMsg}`,
    });

    // ============================================================
    // TC-02: サンプルデータ投入
    // ============================================================
    log('=== TC-02: サンプルデータ投入 ===');

    // ROIダッシュボードモーダルを閉じる
    await closeModal(page);

    // BarChart3 ボタン（インデックス1）をクリック
    log('BarChart3 ボタン（インデックス1）をクリックします');
    await navBtn(page, 1).click();
    await page.waitForTimeout(2000);

    // 「サンプルデータで試す」ボタンを探してクリック
    let sampleDataClicked = false;
    const btnCount2 = await page.locator('button').count();
    for (let i = 0; i < btnCount2; i++) {
      const text = await page.locator('button').nth(i).innerText().catch(() => '');
      if (text.includes('サンプル') || text.includes('試す')) {
        await page.locator('button').nth(i).click();
        sampleDataClicked = true;
        log(`  → ボタン[${i}] "${text.trim()}" をクリックしました`);
        await page.waitForTimeout(2000);
        break;
      }
    }

    await screenshot(page, '02_sample_data_loaded.png');

    results.push({
      tc: 'TC-02',
      name: 'サンプルデータ投入',
      pass: sampleDataClicked,
      details: `サンプルデータボタンクリック: ${sampleDataClicked}`,
    });

    // 統計モーダルを閉じる
    await closeModal(page);

    // ============================================================
    // TC-02b: 今週のデータを直接投入（ROI表示のため）
    // ============================================================
    log('=== TC-02b: 今週のモックデータをIndexedDBに直接投入 ===');
    await injectThisWeekMockData(page);

    // ページをリロードしてデータを反映
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    log('ページをリロードしてデータを反映しました');

    // ============================================================
    // TC-03: データあり状態で AI ROI ダッシュボードを開く
    // ============================================================
    log('=== TC-03: データあり状態でROIダッシュボードを開く ===');

    log('TrendingUp ボタン（インデックス2）をクリックします');
    await navBtn(page, 2).click();
    await page.waitForTimeout(3000);

    const modalTitle3 = await page.locator('text=AI活用ROIダッシュボード').isVisible().catch(() => false);
    const aiUsageCard = await page.locator('text=今週のAI活用率').isVisible().catch(() => false);
    const timeSavingCard = await page.locator('text=推定時間削減').isVisible().catch(() => false);
    const bestCategoryCard = await page.locator('text=最も効果的なカテゴリ').isVisible().catch(() => false);
    const roiScoreCard = await page.locator('text=AI ROI スコア').isVisible().catch(() => false);
    log(`モーダルタイトル: ${modalTitle3}`);
    log(`カード表示: AI活用率=${aiUsageCard}, 時間削減=${timeSavingCard}, カテゴリ=${bestCategoryCard}, ROIスコア=${roiScoreCard}`);

    // モーダル内のテキストを全て取得
    const modalText = await page.locator('div.fixed').first().innerText().catch(() => '');
    log(`モーダル内テキスト: ${modalText.substring(0, 500)}`);

    await screenshot(page, '03_roi_dashboard_summary_cards.png');

    results.push({
      tc: 'TC-03',
      name: 'データあり状態でROIダッシュボードを開く',
      pass: modalTitle3 && (aiUsageCard || timeSavingCard || roiScoreCard),
      details: `タイトル=${modalTitle3}, AI活用率=${aiUsageCard}, 時間削減=${timeSavingCard}, カテゴリ=${bestCategoryCard}, ROIスコア=${roiScoreCard}`,
    });

    // ============================================================
    // TC-04: カテゴリ別AI活用率グラフの確認
    // ============================================================
    log('=== TC-04: カテゴリ別AI活用率グラフの確認 ===');

    const chartTitle = await page.locator('text=カテゴリ別AI活用率').isVisible().catch(() => false);
    const rechartsCount = await page.locator('svg.recharts-surface').count().catch(() => 0);
    log(`カテゴリ別グラフタイトル: ${chartTitle}, Recharts SVG数: ${rechartsCount}`);

    await screenshot(page, '04_roi_category_chart.png');

    results.push({
      tc: 'TC-04',
      name: 'カテゴリ別AI活用率グラフの確認',
      pass: chartTitle,
      details: `グラフタイトル: ${chartTitle}, Recharts SVG数: ${rechartsCount}`,
    });

    // ============================================================
    // TC-05: モーダルを閉じる確認
    // ============================================================
    log('=== TC-05: モーダルを閉じる確認 ===');

    const beforeClose = await page.locator('text=AI活用ROIダッシュボード').isVisible().catch(() => false);
    log(`閉じる前のモーダル状態: ${beforeClose}`);

    await closeModal(page);

    const modalClosed = !(await page.locator('text=AI活用ROIダッシュボード').isVisible().catch(() => false));
    log(`モーダルが閉じた: ${modalClosed}`);

    await screenshot(page, '05_home_after_modal_close.png');

    results.push({
      tc: 'TC-05',
      name: 'モーダルを閉じる確認',
      pass: modalClosed,
      details: `閉じる前=${beforeClose}, モーダルが閉じた: ${modalClosed}`,
    });

  } finally {
    await browser.close();
    log('ブラウザを閉じました');
  }

  writeFileSync(
    '/Volumes/OWCUS4EXP_1M2_4TB_SSD/ghq/github.com/arkatom/InsightLog/.claude/worktrees/demo-run/demo/e2e-results.json',
    JSON.stringify(results, null, 2)
  );
  log('\n=== テスト結果サマリー ===');
  const allPass = results.every(r => r.pass);
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    log(`  ${status} ${r.tc}: ${r.name}`);
    log(`    詳細: ${r.details}`);
  }
  log(`\n全テスト結果: ${allPass ? 'ALL PASS' : 'SOME FAIL'}`);
}

runTests().catch((err) => {
  console.error('E2E テストエラー:', err);
  process.exit(1);
});
