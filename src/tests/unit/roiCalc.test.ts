import { describe, it, expect } from 'vitest';
import { calcRoi } from '@/lib/roiCalc';
import type { Task } from '@/types/task';

/** ヘルパー: 今週の日付でタスクを生成 */
function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    name: 'テストタスク',
    category: ['実装'],
    aiUsed: false,
    aiToolsUsed: [],
    duration: 60,
    reworkCount: 0,
    notes: '',
    createdAt: now,
    completedAt: now,
    ...overrides,
  };
}

/** ヘルパー: 先月の日付を返す */
function lastMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d;
}

describe('calcRoi', () => {
  it('タスクが0件の場合、hasEnoughData が false', () => {
    const result = calcRoi([]);
    expect(result.hasEnoughData).toBe(false);
    expect(result.roiLabel).toBe('N/A');
  });

  it('今週のタスクが5件未満の場合、hasEnoughData が false', () => {
    const tasks = [
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 30 }),
      makeTask({ aiUsed: false, duration: 60 }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Copilot'], duration: 20 }),
    ];
    const result = calcRoi(tasks);
    expect(result.hasEnoughData).toBe(false);
  });

  it('AI使用タスクのみの場合、hasEnoughData が false', () => {
    const tasks = Array.from({ length: 6 }, () =>
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 30 })
    );
    const result = calcRoi(tasks);
    expect(result.hasEnoughData).toBe(false);
  });

  it('非AIタスクのみの場合、hasEnoughData が false', () => {
    const tasks = Array.from({ length: 6 }, () =>
      makeTask({ aiUsed: false, duration: 60 })
    );
    const result = calcRoi(tasks);
    expect(result.hasEnoughData).toBe(false);
  });

  it('先月のタスクは計算対象外', () => {
    const old = lastMonth();
    const tasks = [
      ...Array.from({ length: 3 }, () =>
        makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 30, completedAt: old, createdAt: old })
      ),
      ...Array.from({ length: 3 }, () =>
        makeTask({ aiUsed: false, duration: 60, completedAt: old, createdAt: old })
      ),
    ];
    const result = calcRoi(tasks);
    expect(result.hasEnoughData).toBe(false);
  });

  it('十分なデータがある場合、正しく計算される', () => {
    const tasks = [
      // AI使用タスク (平均 30分)
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 20, category: ['実装'] }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Copilot'], duration: 30, category: ['実装'] }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 40, category: ['設計'] }),
      // 非AIタスク (平均 80分)
      makeTask({ aiUsed: false, duration: 70, category: ['実装'] }),
      makeTask({ aiUsed: false, duration: 90, category: ['調査'] }),
    ];

    const result = calcRoi(tasks);

    expect(result.hasEnoughData).toBe(true);

    // AI活用率: 3/5 = 60%
    expect(result.aiUsageRate).toBe(60);

    // 推定時間削減: (80 - 30) * 3 = 150分
    expect(result.estimatedTimeSaved).toBe(150);

    // ROIスコア: (80 - 30) / 80 * 100 = 62.5 -> 63 (rounded)
    expect(result.roiScore).toBe(63);

    // ラベル: 63 >= 60 -> Excellent
    expect(result.roiLabel).toBe('Excellent');

    // カテゴリブレイクダウン
    expect(result.categoryBreakdown.length).toBeGreaterThan(0);

    // 最も効果的なカテゴリ
    expect(result.mostEffectiveCategory).toBeTruthy();
  });

  it('ROIスコアが30-59の場合、ラベルが Good', () => {
    const tasks = [
      // AI (平均 50分)
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 50 }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 50 }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 50 }),
      // 非AI (平均 80分) -> 削減率 37.5%
      makeTask({ aiUsed: false, duration: 80 }),
      makeTask({ aiUsed: false, duration: 80 }),
    ];

    const result = calcRoi(tasks);
    expect(result.roiLabel).toBe('Good');
  });

  it('ROIスコアが0-29の場合、ラベルが Fair', () => {
    const tasks = [
      // AI (平均 70分)
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 70 }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 70 }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 70 }),
      // 非AI (平均 80分) -> 削減率 12.5%
      makeTask({ aiUsed: false, duration: 80 }),
      makeTask({ aiUsed: false, duration: 80 }),
    ];

    const result = calcRoi(tasks);
    expect(result.roiLabel).toBe('Fair');
  });

  it('AIタスクが非AIタスクより遅い場合、推定時間削減は0', () => {
    const tasks = [
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 100 }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 100 }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 100 }),
      makeTask({ aiUsed: false, duration: 30 }),
      makeTask({ aiUsed: false, duration: 30 }),
    ];

    const result = calcRoi(tasks);
    expect(result.estimatedTimeSaved).toBe(0);
    expect(result.roiScore).toBe(0);
    expect(result.roiLabel).toBe('Fair');
  });

  it('カテゴリ別ブレイクダウンが正しく計算される', () => {
    const tasks = [
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 30, category: ['実装'] }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 30, category: ['実装'] }),
      makeTask({ aiUsed: false, duration: 60, category: ['実装'] }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 20, category: ['設計'] }),
      makeTask({ aiUsed: false, duration: 60, category: ['調査'] }),
    ];

    const result = calcRoi(tasks);

    const implCat = result.categoryBreakdown.find((c) => c.category === '実装');
    expect(implCat).toBeDefined();
    expect(implCat!.aiRate).toBe(67); // 2/3 = 66.7 -> 67

    const designCat = result.categoryBreakdown.find((c) => c.category === '設計');
    expect(designCat).toBeDefined();
    expect(designCat!.aiRate).toBe(100); // 1/1

    const researchCat = result.categoryBreakdown.find((c) => c.category === '調査');
    expect(researchCat).toBeDefined();
    expect(researchCat!.aiRate).toBe(0); // 0/1
  });

  it('最も効果的なカテゴリがAI活用率最大のカテゴリである', () => {
    const tasks = [
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 30, category: ['設計'] }),
      makeTask({ aiUsed: false, duration: 60, category: ['実装'] }),
      makeTask({ aiUsed: false, duration: 50, category: ['実装'] }),
      makeTask({ aiUsed: true, aiToolsUsed: ['Claude'], duration: 20, category: ['実装'] }),
      makeTask({ aiUsed: false, duration: 80, category: ['調査'] }),
    ];

    const result = calcRoi(tasks);
    // 設計: 100%, 実装: 33%, 調査: 0%
    expect(result.mostEffectiveCategory).toBe('設計');
  });
});
