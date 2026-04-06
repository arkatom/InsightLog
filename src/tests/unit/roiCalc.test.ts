import { describe, it, expect } from 'vitest';
import { calculateROIMetrics } from '@/lib/roiCalc';
import type { Task } from '@/types/task';

function createTask(overrides: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    name: 'テストタスク',
    category: ['実装'],
    aiUsed: false,
    aiToolsUsed: [],
    duration: 30,
    reworkCount: 0,
    notes: '',
    createdAt: new Date(),
    completedAt: new Date(),
    ...overrides,
  };
}

describe('calculateROIMetrics', () => {
  describe('hasData: false を返す境界条件', () => {
    it('タスク0件 → hasData: false', () => {
      const result = calculateROIMetrics([]);
      expect(result.hasData).toBe(false);
    });

    it('タスク4件（AI2件 + 非AI2件）→ hasData: false（5件未満）', () => {
      const tasks = [
        createTask({ aiUsed: true }),
        createTask({ aiUsed: true }),
        createTask({ aiUsed: false }),
        createTask({ aiUsed: false }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.hasData).toBe(false);
    });

    it('タスク5件、AI利用0件 → hasData: false', () => {
      const tasks = Array.from({ length: 5 }, () => createTask({ aiUsed: false }));
      const result = calculateROIMetrics(tasks);
      expect(result.hasData).toBe(false);
    });

    it('タスク5件、非AI利用0件 → hasData: false', () => {
      const tasks = Array.from({ length: 5 }, () => createTask({ aiUsed: true }));
      const result = calculateROIMetrics(tasks);
      expect(result.hasData).toBe(false);
    });

    it('hasData: false の場合、デフォルト値を返す', () => {
      const result = calculateROIMetrics([]);
      expect(result).toEqual({
        hasData: false,
        aiUsageRatePercent: 0,
        estimatedTimeSavedMinutes: 0,
        mostEffectiveCategory: null,
        roiScore: 0,
        roiLabel: 'N/A',
        categoryUsage: [],
      });
    });
  });

  describe('正常ケース', () => {
    it('AI3件(avg30分) + 非AI2件(avg60分) → hasData: true', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: false, duration: 60 }),
        createTask({ aiUsed: false, duration: 60 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.hasData).toBe(true);
    });

    it('AI3件(avg30分) + 非AI2件(avg60分) → timeSaved: 90分', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: false, duration: 60 }),
        createTask({ aiUsed: false, duration: 60 }),
      ];
      const result = calculateROIMetrics(tasks);
      // (avgNonAi - avgAi) * aiTasks.length = (60 - 30) * 3 = 90
      expect(result.estimatedTimeSavedMinutes).toBe(90);
    });

    it('AI3件(avg30分) + 非AI2件(avg60分) → aiUsageRatePercent: 60%', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: false, duration: 60 }),
        createTask({ aiUsed: false, duration: 60 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.aiUsageRatePercent).toBe(60);
    });

    it('AI3件(avg30分) + 非AI2件(avg60分) → roiScore: 50, roiLabel: Good', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: false, duration: 60 }),
        createTask({ aiUsed: false, duration: 60 }),
      ];
      const result = calculateROIMetrics(tasks);
      // timeReductionRate = (60 - 30) / 60 * 100 = 50
      expect(result.roiScore).toBe(50);
      expect(result.roiLabel).toBe('Good');
    });
  });

  describe('AIの方が遅い場合', () => {
    it('AIの平均時間 > 非AIの平均時間 → timeSaved: 0', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: false, duration: 30 }),
        createTask({ aiUsed: false, duration: 30 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.estimatedTimeSavedMinutes).toBe(0);
    });

    it('AIの平均時間 > 非AIの平均時間 → roiScore: 0, roiLabel: N/A', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: false, duration: 30 }),
        createTask({ aiUsed: false, duration: 30 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.roiScore).toBe(0);
      expect(result.roiLabel).toBe('N/A');
    });
  });

  describe('ROIスコア境界値', () => {
    // roiScore = Math.round((avgNonAi - avgAi) / avgNonAi * 100)
    // score >= 70 → Excellent, score >= 40 → Good, score > 0 → Fair, else N/A

    it('roiScore: 70 → roiLabel: Excellent', () => {
      // avgNonAi=100, avgAi=30 → (100-30)/100*100 = 70
      const tasks = [
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: false, duration: 100 }),
        createTask({ aiUsed: false, duration: 100 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.roiScore).toBe(70);
      expect(result.roiLabel).toBe('Excellent');
    });

    it('roiScore: 69 → roiLabel: Good', () => {
      // avgNonAi=100, avgAi=31 → (100-31)/100*100 = 69
      const tasks = [
        createTask({ aiUsed: true, duration: 31 }),
        createTask({ aiUsed: true, duration: 31 }),
        createTask({ aiUsed: true, duration: 31 }),
        createTask({ aiUsed: false, duration: 100 }),
        createTask({ aiUsed: false, duration: 100 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.roiScore).toBe(69);
      expect(result.roiLabel).toBe('Good');
    });

    it('roiScore: 40 → roiLabel: Good', () => {
      // avgNonAi=100, avgAi=60 → (100-60)/100*100 = 40
      const tasks = [
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: true, duration: 60 }),
        createTask({ aiUsed: false, duration: 100 }),
        createTask({ aiUsed: false, duration: 100 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.roiScore).toBe(40);
      expect(result.roiLabel).toBe('Good');
    });

    it('roiScore: 39 → roiLabel: Fair', () => {
      // avgNonAi=100, avgAi=61 → (100-61)/100*100 = 39
      const tasks = [
        createTask({ aiUsed: true, duration: 61 }),
        createTask({ aiUsed: true, duration: 61 }),
        createTask({ aiUsed: true, duration: 61 }),
        createTask({ aiUsed: false, duration: 100 }),
        createTask({ aiUsed: false, duration: 100 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.roiScore).toBe(39);
      expect(result.roiLabel).toBe('Fair');
    });
  });

  describe('カテゴリ集計', () => {
    it('AI活用率が最高のカテゴリが mostEffectiveCategory に選ばれる', () => {
      // カテゴリ「設計」: AI2件/2件 = 100%, 「実装」: AI1件/2件 = 50%
      const tasks = [
        createTask({ aiUsed: true, category: ['設計'] }),
        createTask({ aiUsed: true, category: ['設計'] }),
        createTask({ aiUsed: true, category: ['実装'] }),
        createTask({ aiUsed: false, category: ['実装'] }),
        createTask({ aiUsed: false, category: ['実装'] }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.mostEffectiveCategory).toBe('設計');
    });

    it('複数カテゴリを持つタスクはカテゴリ別に展開される', () => {
      const tasks = [
        createTask({ aiUsed: true, category: ['実装', 'レビュー'], duration: 20 }),
        createTask({ aiUsed: true, category: ['実装'], duration: 20 }),
        createTask({ aiUsed: true, category: ['実装'], duration: 20 }),
        createTask({ aiUsed: false, category: ['実装'], duration: 60 }),
        createTask({ aiUsed: false, category: ['レビュー'], duration: 60 }),
      ];
      const result = calculateROIMetrics(tasks);
      const categories = result.categoryUsage.map((c) => c.category);
      expect(categories).toContain('実装');
      expect(categories).toContain('レビュー');
    });

    it('categoryUsage の aiUsageRate が正しく計算される', () => {
      // 「実装」: AI2件 / 計4件 = 50%
      const tasks = [
        createTask({ aiUsed: true, category: ['実装'], duration: 30 }),
        createTask({ aiUsed: true, category: ['実装'], duration: 30 }),
        createTask({ aiUsed: false, category: ['実装'], duration: 60 }),
        createTask({ aiUsed: false, category: ['実装'], duration: 60 }),
        createTask({ aiUsed: false, category: ['実装'], duration: 60 }),
      ];
      const result = calculateROIMetrics(tasks);
      const implUsage = result.categoryUsage.find((c) => c.category === '実装');
      expect(implUsage).toBeDefined();
      expect(implUsage!.aiUsageRate).toBe(40); // 2/5 = 40%
      expect(implUsage!.totalCount).toBe(5);
      expect(implUsage!.aiCount).toBe(2);
    });
  });

  describe('avgNonAi === 0 のエッジケース', () => {
    it('非AIタスクの duration が全て0 → roiScore: 0, roiLabel: N/A', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: true, duration: 30 }),
        createTask({ aiUsed: false, duration: 0 }),
        createTask({ aiUsed: false, duration: 0 }),
      ];
      const result = calculateROIMetrics(tasks);
      expect(result.roiScore).toBe(0);
      expect(result.roiLabel).toBe('N/A');
    });
  });
});
