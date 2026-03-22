import { describe, it, expect } from 'vitest';
import { calcCategoryAiUsage, calcRoiSummary } from '@/lib/roiCalc';
import type { AIComparisonStats, CategoryStats } from '@/types/statistics';

// ヘルパー: AIComparisonStats を生成
function makeAiComparison(
  aiCount: number,
  aiAvgDuration: number,
  nonAiCount: number,
  nonAiAvgDuration: number
): AIComparisonStats {
  return {
    aiUsed: {
      count: aiCount,
      averageDuration: aiAvgDuration,
      averageRework: 0,
      totalDuration: aiCount * aiAvgDuration,
    },
    aiNotUsed: {
      count: nonAiCount,
      averageDuration: nonAiAvgDuration,
      averageRework: 0,
      totalDuration: nonAiCount * nonAiAvgDuration,
    },
  };
}

// ヘルパー: CategoryStats を生成
function makeCategory(category: string, count: number, aiUsageRate: number): CategoryStats {
  return {
    category,
    count,
    totalDuration: count * 30,
    aiUsageRate,
  };
}

// ---------- calcCategoryAiUsage ----------

describe('calcCategoryAiUsage', () => {
  it('CategoryStats 配列を CategoryAiUsage 配列に変換する', () => {
    const input: CategoryStats[] = [
      makeCategory('開発', 10, 80),
      makeCategory('設計', 5, 60),
    ];
    const result = calcCategoryAiUsage(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ category: '開発', aiUsageRate: 80, totalTasks: 10 });
    expect(result[1]).toEqual({ category: '設計', aiUsageRate: 60, totalTasks: 5 });
  });

  it('空配列を渡すと空配列を返す', () => {
    expect(calcCategoryAiUsage([])).toEqual([]);
  });

  it('単一要素でも正しく変換する', () => {
    const result = calcCategoryAiUsage([makeCategory('テスト', 3, 33)]);
    expect(result).toHaveLength(1);
    expect(result[0].totalTasks).toBe(3);
    expect(result[0].aiUsageRate).toBe(33);
  });
});

// ---------- calcRoiSummary — 空状態 ----------

describe('calcRoiSummary — 空状態 (isEmpty=true)', () => {
  it('タスクが0件のとき isEmpty=true を返す', () => {
    const aiComp = makeAiComparison(0, 0, 0, 0);
    const result = calcRoiSummary(aiComp, []);
    expect(result.isEmpty).toBe(true);
    expect(result.roiScoreLabel).toBe('N/A');
    expect(result.roiScore).toBe(0);
    expect(result.estimatedTimeSaved).toBe(0);
    expect(result.mostEffectiveCategory).toBeNull();
  });

  it('AI使用タスクが0件のとき isEmpty=true を返す', () => {
    const aiComp = makeAiComparison(0, 0, 5, 30);
    const result = calcRoiSummary(aiComp, [makeCategory('開発', 5, 0)]);
    expect(result.isEmpty).toBe(true);
    expect(result.aiUsageRate).toBe(0);
  });

  it('AI未使用タスクが0件のとき isEmpty=true を返す', () => {
    const aiComp = makeAiComparison(5, 20, 0, 0);
    const result = calcRoiSummary(aiComp, [makeCategory('開発', 5, 100)]);
    expect(result.isEmpty).toBe(true);
    expect(result.aiUsageRate).toBe(100);
  });

  it('空状態でも aiUsageRate が正しく計算される', () => {
    // AI 3件, 非AI 7件 → 全10件, AI使用は3件 → 30%
    const aiComp = makeAiComparison(3, 25, 7, 40);
    // aiUsed のみ、nonAiUsed もある → isEmpty=false
    // ここでは nonAiCount=0 のケースで確認
    const aiCompOnlyAi = makeAiComparison(5, 25, 0, 0);
    const result = calcRoiSummary(aiCompOnlyAi, []);
    expect(result.isEmpty).toBe(true);
    expect(result.aiUsageRate).toBe(100);
  });
});

// ---------- calcRoiSummary — 正常系 ----------

describe('calcRoiSummary — 正常系', () => {
  it('基本的な ROI 計算が正しい', () => {
    // AI平均20分, 非AI平均40分, AI10件
    const aiComp = makeAiComparison(10, 20, 10, 40);
    const cats = [makeCategory('開発', 10, 80), makeCategory('設計', 10, 20)];
    const result = calcRoiSummary(aiComp, cats);

    expect(result.isEmpty).toBe(false);
    // aiUsageRate: 10 / 20 * 100 = 50
    expect(result.aiUsageRate).toBe(50);
    // estimatedTimeSaved: (40 - 20) * 10 = 200
    expect(result.estimatedTimeSaved).toBe(200);
    // timeSavingsRate: (40 - 20) / 40 * 100 = 50
    expect(result.timeSavingsRate).toBe(50);
    // categoryCoverage: 両カテゴリとも aiUsageRate > 0 → 2/2 * 100 = 100
    expect(result.categoryCoverage).toBe(100);
    // roiScore: 50 * 0.7 + 100 * 0.3 = 35 + 30 = 65
    expect(result.roiScore).toBe(65);
    expect(result.roiScoreLabel).toBe('Good');
  });

  it('AI が非AIより時間がかかる場合 estimatedTimeSaved は 0 にクランプ', () => {
    // AI平均60分, 非AI平均30分（AIの方が遅い）
    const aiComp = makeAiComparison(5, 60, 5, 30);
    const result = calcRoiSummary(aiComp, [makeCategory('開発', 5, 100)]);
    expect(result.estimatedTimeSaved).toBe(0);
    expect(result.timeSavingsRate).toBe(0);
  });

  it('timeSavingsRate は 100 を超えない（clamp）', () => {
    // avgWithoutAi が非常に大きい場合でも 100 を超えない
    const aiComp = makeAiComparison(5, 0, 5, 100);
    const result = calcRoiSummary(aiComp, [makeCategory('開発', 5, 100)]);
    expect(result.timeSavingsRate).toBeLessThanOrEqual(100);
  });

  it('roiScore は 0 以上 100 以下にクランプ', () => {
    const aiComp = makeAiComparison(10, 0, 10, 100);
    const cats = [makeCategory('a', 5, 100), makeCategory('b', 5, 100)];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.roiScore).toBeGreaterThanOrEqual(0);
    expect(result.roiScore).toBeLessThanOrEqual(100);
  });
});

// ---------- calcRoiSummary — roiScoreLabel 閾値 ----------

describe('calcRoiSummary — roiScoreLabel 閾値', () => {
  // timeSavingsRate と categoryCoverage を制御して roiScore を操作する
  // roiScore = timeSavingsRate * 0.7 + categoryCoverage * 0.3

  it('roiScore >= 80 のとき Excellent', () => {
    // timeSavingsRate=100, categoryCoverage=100 → roiScore=100
    const aiComp = makeAiComparison(10, 0, 10, 100);
    const cats = [makeCategory('開発', 10, 100)];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.roiScore).toBeGreaterThanOrEqual(80);
    expect(result.roiScoreLabel).toBe('Excellent');
  });

  it('roiScore >= 50 かつ < 80 のとき Good', () => {
    // timeSavingsRate ≈ 50, categoryCoverage=100 → 50*0.7+100*0.3=35+30=65
    const aiComp = makeAiComparison(10, 20, 10, 40);
    const cats = [makeCategory('開発', 10, 80), makeCategory('設計', 10, 20)];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.roiScore).toBeGreaterThanOrEqual(50);
    expect(result.roiScore).toBeLessThan(80);
    expect(result.roiScoreLabel).toBe('Good');
  });

  it('roiScore >= 1 かつ < 50 のとき Fair', () => {
    // timeSavingsRate=10, categoryCoverage=0 → 10*0.7+0*0.3=7
    const aiComp = makeAiComparison(10, 27, 10, 30);
    const cats = [makeCategory('開発', 10, 0)]; // aiUsageRate=0 なのでカバレッジなし
    const result = calcRoiSummary(aiComp, cats);
    expect(result.roiScore).toBeGreaterThanOrEqual(1);
    expect(result.roiScore).toBeLessThan(50);
    expect(result.roiScoreLabel).toBe('Fair');
  });

  it('roiScore が 0 のとき N/A', () => {
    // AI平均 = 非AI平均 → timeSavingsRate=0, categoryCoverage=0 → roiScore=0
    const aiComp = makeAiComparison(5, 30, 5, 30);
    const cats = [makeCategory('開発', 5, 0)];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.roiScore).toBe(0);
    expect(result.roiScoreLabel).toBe('N/A');
  });
});

// ---------- calcRoiSummary — mostEffectiveCategory ----------

describe('calcRoiSummary — mostEffectiveCategory', () => {
  it('aiUsageRate が最大のカテゴリを返す', () => {
    const aiComp = makeAiComparison(10, 20, 10, 40);
    const cats = [
      makeCategory('設計', 5, 40),
      makeCategory('開発', 5, 80),
      makeCategory('テスト', 5, 20),
    ];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.mostEffectiveCategory).toBe('開発');
  });

  it('aiUsageRate が同率のとき AI使用タスク数が多い方を返す', () => {
    const aiComp = makeAiComparison(10, 20, 10, 40);
    const cats = [
      makeCategory('設計', 10, 80), // aiCount = round(10 * 80 / 100) = 8
      makeCategory('開発', 5, 80),  // aiCount = round(5 * 80 / 100) = 4
    ];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.mostEffectiveCategory).toBe('設計');
  });

  it('カテゴリが1件のとき、そのカテゴリを返す', () => {
    const aiComp = makeAiComparison(5, 20, 5, 40);
    const cats = [makeCategory('開発', 5, 60)];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.mostEffectiveCategory).toBe('開発');
  });

  it('全カテゴリの aiUsageRate が 0 のとき先頭カテゴリを返す', () => {
    const aiComp = makeAiComparison(5, 20, 5, 40);
    const cats = [makeCategory('A', 5, 0), makeCategory('B', 5, 0)];
    const result = calcRoiSummary(aiComp, cats);
    // どちらも同率0、同率タスク数 → ソートが安定なら最初のもの
    expect(['A', 'B']).toContain(result.mostEffectiveCategory);
  });
});

// ---------- calcRoiSummary — categoryCoverage ----------

describe('calcRoiSummary — categoryCoverage', () => {
  it('全カテゴリが AI 使用のとき 100 を返す', () => {
    const aiComp = makeAiComparison(5, 20, 5, 40);
    const cats = [makeCategory('A', 3, 50), makeCategory('B', 3, 75)];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.categoryCoverage).toBe(100);
  });

  it('AI 使用カテゴリが半数のとき 50 を返す', () => {
    const aiComp = makeAiComparison(5, 20, 5, 40);
    const cats = [makeCategory('A', 3, 50), makeCategory('B', 3, 0)];
    const result = calcRoiSummary(aiComp, cats);
    expect(result.categoryCoverage).toBe(50);
  });

  it('カテゴリが空のとき categoryCoverage は 0', () => {
    // カテゴリなしかつ AI/非AI 両方あれば isEmpty=false になり得るが
    // 通常運用上ありえないが境界値として検証
    const aiComp = makeAiComparison(5, 20, 5, 40);
    const result = calcRoiSummary(aiComp, []);
    expect(result.categoryCoverage).toBe(0);
  });
});
