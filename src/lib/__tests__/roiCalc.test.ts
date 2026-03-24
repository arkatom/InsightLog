import { describe, it, expect } from 'vitest';
import {
  hasEnoughData,
  calcWeeklyAiUsageRate,
  calcCategoryAiUsage,
  calcMostEffectiveCategory,
  calcEstimatedTimeSaved,
  calcRoiScore,
  getRoiLabel,
  calcRoiSummary,
} from '@/lib/roiCalc';
import type { Task } from '@/types/task';
import type { CategoryAiUsage } from '@/types/statistics';

// ---- helpers ----

function makeTask(overrides: Partial<Task> & { aiUsed: boolean }): Task {
  return {
    id: 'task-id',
    name: 'Test Task',
    category: ['dev'],
    aiToolsUsed: overrides.aiUsed ? ['Claude'] : [],
    duration: 30,
    reworkCount: 0,
    notes: '',
    createdAt: new Date('2026-03-20'),
    completedAt: new Date('2026-03-20'),
    ...overrides,
  };
}

/** 十分なデータセット: 5件、AI使用あり+なしが混在 */
function makeEnoughTasks(): Task[] {
  return [
    makeTask({ id: '1', aiUsed: true, duration: 20, reworkCount: 0 }),
    makeTask({ id: '2', aiUsed: true, duration: 25, reworkCount: 1 }),
    makeTask({ id: '3', aiUsed: true, duration: 30, reworkCount: 0 }),
    makeTask({ id: '4', aiUsed: false, duration: 40, reworkCount: 2 }),
    makeTask({ id: '5', aiUsed: false, duration: 35, reworkCount: 1 }),
  ];
}

// ============================================================
// hasEnoughData
// ============================================================
describe('hasEnoughData', () => {
  it('5件以上かつAI使用・未使用が両方あれば true', () => {
    expect(hasEnoughData(makeEnoughTasks())).toBe(true);
  });

  it('空配列は false', () => {
    expect(hasEnoughData([])).toBe(false);
  });

  it('4件以下は false', () => {
    const tasks = makeEnoughTasks().slice(0, 4);
    expect(hasEnoughData(tasks)).toBe(false);
  });

  it('全員AI使用でもAI未使用がいないと false', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true }),
      makeTask({ id: '2', aiUsed: true }),
      makeTask({ id: '3', aiUsed: true }),
      makeTask({ id: '4', aiUsed: true }),
      makeTask({ id: '5', aiUsed: true }),
    ];
    expect(hasEnoughData(tasks)).toBe(false);
  });

  it('全員AI未使用でもAI使用がいないと false', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: false }),
      makeTask({ id: '2', aiUsed: false }),
      makeTask({ id: '3', aiUsed: false }),
      makeTask({ id: '4', aiUsed: false }),
      makeTask({ id: '5', aiUsed: false }),
    ];
    expect(hasEnoughData(tasks)).toBe(false);
  });

  it('ちょうど5件でAI使用・未使用混在なら true', () => {
    expect(hasEnoughData(makeEnoughTasks())).toBe(true);
  });
});

// ============================================================
// calcWeeklyAiUsageRate
// ============================================================
describe('calcWeeklyAiUsageRate', () => {
  it('空配列は 0 を返す', () => {
    expect(calcWeeklyAiUsageRate([])).toBe(0);
  });

  it('全員AI使用なら 100', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true }),
      makeTask({ id: '2', aiUsed: true }),
    ];
    expect(calcWeeklyAiUsageRate(tasks)).toBe(100);
  });

  it('全員AI未使用なら 0', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: false }),
      makeTask({ id: '2', aiUsed: false }),
    ];
    expect(calcWeeklyAiUsageRate(tasks)).toBe(0);
  });

  it('3件中2件AI使用で 67%', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true }),
      makeTask({ id: '2', aiUsed: true }),
      makeTask({ id: '3', aiUsed: false }),
    ];
    expect(calcWeeklyAiUsageRate(tasks)).toBe(67);
  });

  it('4件中1件AI使用で 25%', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true }),
      makeTask({ id: '2', aiUsed: false }),
      makeTask({ id: '3', aiUsed: false }),
      makeTask({ id: '4', aiUsed: false }),
    ];
    expect(calcWeeklyAiUsageRate(tasks)).toBe(25);
  });
});

// ============================================================
// calcCategoryAiUsage
// ============================================================
describe('calcCategoryAiUsage', () => {
  it('空配列は空配列を返す', () => {
    expect(calcCategoryAiUsage([])).toEqual([]);
  });

  it('単一カテゴリのカウントが正しい', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, category: ['dev'] }),
      makeTask({ id: '2', aiUsed: false, category: ['dev'] }),
    ];
    const result = calcCategoryAiUsage(tasks);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      category: 'dev',
      taskCount: 2,
      aiTaskCount: 1,
      aiUsageRate: 50,
    });
  });

  it('複数カテゴリに属するタスクは各カテゴリに分配カウントされる', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, category: ['dev', 'design'] }),
      makeTask({ id: '2', aiUsed: false, category: ['dev'] }),
    ];
    const result = calcCategoryAiUsage(tasks);
    const devEntry = result.find((r) => r.category === 'dev');
    const designEntry = result.find((r) => r.category === 'design');

    expect(devEntry).toBeDefined();
    expect(devEntry!.taskCount).toBe(2);
    expect(devEntry!.aiTaskCount).toBe(1);
    expect(devEntry!.aiUsageRate).toBe(50);

    expect(designEntry).toBeDefined();
    expect(designEntry!.taskCount).toBe(1);
    expect(designEntry!.aiTaskCount).toBe(1);
    expect(designEntry!.aiUsageRate).toBe(100);
  });

  it('全タスクがAI使用なら aiUsageRate は 100', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, category: ['qa'] }),
      makeTask({ id: '2', aiUsed: true, category: ['qa'] }),
    ];
    const result = calcCategoryAiUsage(tasks);
    expect(result[0].aiUsageRate).toBe(100);
  });

  it('全タスクがAI未使用なら aiUsageRate は 0', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: false, category: ['qa'] }),
      makeTask({ id: '2', aiUsed: false, category: ['qa'] }),
    ];
    const result = calcCategoryAiUsage(tasks);
    expect(result[0].aiUsageRate).toBe(0);
  });
});

// ============================================================
// calcMostEffectiveCategory
// ============================================================
describe('calcMostEffectiveCategory', () => {
  it('空配列は null を返す', () => {
    expect(calcMostEffectiveCategory([])).toBeNull();
  });

  it('最高AI活用率のカテゴリを返す', () => {
    const usages: CategoryAiUsage[] = [
      { category: 'dev', aiUsageRate: 50, taskCount: 4, aiTaskCount: 2 },
      { category: 'design', aiUsageRate: 100, taskCount: 2, aiTaskCount: 2 },
      { category: 'qa', aiUsageRate: 25, taskCount: 4, aiTaskCount: 1 },
    ];
    expect(calcMostEffectiveCategory(usages)).toBe('design');
  });

  it('同率の場合は taskCount が多い方を返す', () => {
    const usages: CategoryAiUsage[] = [
      { category: 'dev', aiUsageRate: 100, taskCount: 3, aiTaskCount: 3 },
      { category: 'design', aiUsageRate: 100, taskCount: 5, aiTaskCount: 5 },
    ];
    expect(calcMostEffectiveCategory(usages)).toBe('design');
  });

  it('単一エントリはそのカテゴリを返す', () => {
    const usages: CategoryAiUsage[] = [
      { category: 'dev', aiUsageRate: 75, taskCount: 4, aiTaskCount: 3 },
    ];
    expect(calcMostEffectiveCategory(usages)).toBe('dev');
  });
});

// ============================================================
// calcEstimatedTimeSaved
// ============================================================
describe('calcEstimatedTimeSaved', () => {
  it('AIタスクが0件なら 0 を返す', () => {
    const tasks = [makeTask({ id: '1', aiUsed: false, duration: 40 })];
    expect(calcEstimatedTimeSaved(tasks)).toBe(0);
  });

  it('空配列は 0 を返す', () => {
    expect(calcEstimatedTimeSaved([])).toBe(0);
  });

  // フォールバック段階1: timeMinutesNoAi 直接差分
  it('段階1: timeMinutesNoAi がある場合は直接差分を返す', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 20, timeMinutesNoAi: 40 }),
      makeTask({ id: '2', aiUsed: true, duration: 25, timeMinutesNoAi: 35 }),
      makeTask({ id: '3', aiUsed: false, duration: 45 }),
    ];
    // saved = (40-20) + (35-25) = 20 + 10 = 30
    expect(calcEstimatedTimeSaved(tasks)).toBe(30);
  });

  it('段階1: timeMinutesNoAi <= duration の場合はマイナスを0として無視', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 30, timeMinutesNoAi: 20 }), // negative diff -> 0
      makeTask({ id: '2', aiUsed: true, duration: 20, timeMinutesNoAi: 40 }), // diff = 20
    ];
    expect(calcEstimatedTimeSaved(tasks)).toBe(20);
  });

  // フォールバック段階2: カテゴリ別平均差分
  it('段階2: timeMinutesNoAi なし、カテゴリ共通なら差分で計算', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 20, category: ['dev'] }),
      makeTask({ id: '2', aiUsed: true, duration: 30, category: ['dev'] }),
      makeTask({ id: '3', aiUsed: false, duration: 50, category: ['dev'] }),
    ];
    // dev: nonAiAvg=50, aiAvg=(20+30)/2=25, diff=25 per task, 2 AI tasks -> 50
    expect(calcEstimatedTimeSaved(tasks)).toBe(50);
  });

  it('段階2: AI短縮効果なし（AIの方が長い）なら 0 を返す', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 60, category: ['dev'] }),
      makeTask({ id: '2', aiUsed: false, duration: 20, category: ['dev'] }),
    ];
    // nonAiAvg=20, aiAvg=60 -> diff is negative -> 0
    expect(calcEstimatedTimeSaved(tasks)).toBe(0);
  });

  // フォールバック段階3: 全体平均差分
  it('段階3: カテゴリが異なる場合は全体平均差分', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 20, category: ['dev'] }),
      makeTask({ id: '2', aiUsed: false, duration: 50, category: ['design'] }),
    ];
    // nonAiAvg=50, aiAvg=20, diff=30, 1 AI task -> 30
    expect(calcEstimatedTimeSaved(tasks)).toBe(30);
  });
});

// ============================================================
// calcRoiScore
// ============================================================
describe('calcRoiScore', () => {
  it('活用率0・削減0・rework同等で低いスコア', () => {
    const tasks = makeEnoughTasks();
    const score = calcRoiScore(0, 0, tasks);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('スコアは常に 0-100 の範囲内', () => {
    const tasks = makeEnoughTasks();
    const score = calcRoiScore(100, 9999, tasks);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('AIタスクの duration が 0 のときゼロ除算しない', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 0, reworkCount: 0 }),
      makeTask({ id: '2', aiUsed: false, duration: 30, reworkCount: 0 }),
    ];
    expect(() => calcRoiScore(50, 0, tasks)).not.toThrow();
  });

  it('どちらも reworkCount=0 のとき qualityScore は 0.5 扱い', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 20, reworkCount: 0 }),
      makeTask({ id: '2', aiUsed: false, duration: 30, reworkCount: 0 }),
    ];
    // usageScore=0.5, timeSavedScore depends on inputs, qualityScore=0.5
    const score = calcRoiScore(50, 10, tasks);
    expect(score).toBeGreaterThan(0);
  });

  it('高い活用率・大きな時間削減・品質改善で高スコア', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 10, reworkCount: 0 }),
      makeTask({ id: '2', aiUsed: true, duration: 10, reworkCount: 0 }),
      makeTask({ id: '3', aiUsed: true, duration: 10, reworkCount: 0 }),
      makeTask({ id: '4', aiUsed: false, duration: 50, reworkCount: 5 }),
      makeTask({ id: '5', aiUsed: false, duration: 50, reworkCount: 5 }),
    ];
    const score = calcRoiScore(60, 120, tasks);
    expect(score).toBeGreaterThan(50);
  });
});

// ============================================================
// getRoiLabel
// ============================================================
describe('getRoiLabel', () => {
  it('データ不十分なら N/A', () => {
    expect(getRoiLabel(90, false)).toBe('N/A');
  });

  it('スコア >= 70 なら Excellent', () => {
    expect(getRoiLabel(70, true)).toBe('Excellent');
    expect(getRoiLabel(100, true)).toBe('Excellent');
  });

  it('スコア 40-69 なら Good', () => {
    expect(getRoiLabel(40, true)).toBe('Good');
    expect(getRoiLabel(69, true)).toBe('Good');
  });

  it('スコア < 40 なら Fair', () => {
    expect(getRoiLabel(0, true)).toBe('Fair');
    expect(getRoiLabel(39, true)).toBe('Fair');
  });
});

// ============================================================
// calcRoiSummary (エントリポイント)
// ============================================================
describe('calcRoiSummary', () => {
  it('空配列は hasEnoughData=false のサマリーを返す', () => {
    const result = calcRoiSummary([]);
    expect(result.hasEnoughData).toBe(false);
    expect(result.roiLabel).toBe('N/A');
    expect(result.roiScore).toBe(0);
    expect(result.estimatedTimeSaved).toBe(0);
    expect(result.mostEffectiveCategory).toBeNull();
  });

  it('データ不十分なら hasEnoughData=false でも weeklyAiUsageRate は計算される', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true }),
      makeTask({ id: '2', aiUsed: true }),
    ];
    const result = calcRoiSummary(tasks);
    expect(result.hasEnoughData).toBe(false);
    expect(result.weeklyAiUsageRate).toBe(100);
  });

  it('十分なデータがある場合は hasEnoughData=true で全フィールドが計算される', () => {
    const tasks = makeEnoughTasks();
    const result = calcRoiSummary(tasks);
    expect(result.hasEnoughData).toBe(true);
    expect(result.roiLabel).not.toBe('N/A');
    expect(result.weeklyAiUsageRate).toBe(60); // 3/5 = 60%
    expect(result.mostEffectiveCategory).toBe('dev');
  });

  it('roiScore は 0-100 の範囲内', () => {
    const result = calcRoiSummary(makeEnoughTasks());
    expect(result.roiScore).toBeGreaterThanOrEqual(0);
    expect(result.roiScore).toBeLessThanOrEqual(100);
  });

  it('timeMinutesNoAi ありタスクが含まれる場合に estimatedTimeSaved が正の値', () => {
    const tasks = [
      makeTask({ id: '1', aiUsed: true, duration: 20, timeMinutesNoAi: 40 }),
      makeTask({ id: '2', aiUsed: true, duration: 15, timeMinutesNoAi: 35 }),
      makeTask({ id: '3', aiUsed: true, duration: 25 }),
      makeTask({ id: '4', aiUsed: false, duration: 40 }),
      makeTask({ id: '5', aiUsed: false, duration: 45 }),
    ];
    const result = calcRoiSummary(tasks);
    expect(result.hasEnoughData).toBe(true);
    // saved = (40-20) + (35-15) = 40
    expect(result.estimatedTimeSaved).toBe(40);
  });
});
