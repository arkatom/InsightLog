import { describe, it, expect } from 'vitest';
import { startOfWeek, subDays } from 'date-fns';
import { calcRoi } from '@/lib/roiCalc';
import type { Task } from '@/types/task';

// -------- ヘルパー --------

let _idCounter = 0;

function makeTask(overrides: Partial<Task>): Task {
  _idCounter += 1;
  return {
    id: `task-${_idCounter}`,
    name: `Task ${_idCounter}`,
    category: ['dev'],
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

/** 今週（月曜始まり）内の Date を返す */
function thisWeek(): Date {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  // 月曜日から今日の中間あたりを使う（安全に今週内）
  return new Date(monday.getTime() + 60 * 60 * 1000); // 月曜 01:00
}

/** 先週の Date を返す */
function lastWeek(): Date {
  return subDays(thisWeek(), 8);
}

// -------- テスト --------

describe('calcRoi', () => {
  // --- hasEnoughData ---

  describe('hasEnoughData', () => {
    it('タスクが空のとき false', () => {
      const result = calcRoi([]);
      expect(result.hasEnoughData).toBe(false);
    });

    it('AI使用タスクのみのとき false', () => {
      const tasks = [
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).hasEnoughData).toBe(false);
    });

    it('AI未使用タスクのみのとき false', () => {
      const tasks = [
        makeTask({ aiUsed: false, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).hasEnoughData).toBe(false);
    });

    it('AI使用・未使用が両方あるとき true', () => {
      const tasks = [
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).hasEnoughData).toBe(true);
    });

    it('completedAt が null のタスクは集計から除外される', () => {
      const tasks = [
        makeTask({ aiUsed: true, completedAt: null }),
        makeTask({ aiUsed: false, completedAt: null }),
      ];
      expect(calcRoi(tasks).hasEnoughData).toBe(false);
    });

    it('今週以外のタスクは集計から除外される', () => {
      const tasks = [
        makeTask({ aiUsed: true, completedAt: lastWeek() }),
        makeTask({ aiUsed: false, completedAt: lastWeek() }),
      ];
      expect(calcRoi(tasks).hasEnoughData).toBe(false);
    });
  });

  // --- aiUsageRate ---

  describe('aiUsageRate', () => {
    it('タスクが空のとき 0', () => {
      expect(calcRoi([]).aiUsageRate).toBe(0);
    });

    it('全タスクが AI 使用のとき 100', () => {
      const tasks = [
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).aiUsageRate).toBe(100);
    });

    it('全タスクが AI 未使用のとき 0', () => {
      const tasks = [
        makeTask({ aiUsed: false, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).aiUsageRate).toBe(0);
    });

    it('4タスク中3つ AI 使用のとき 75', () => {
      const tasks = [
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).aiUsageRate).toBe(75);
    });

    it('小数点は四捨五入される（1/3 ≈ 33）', () => {
      const tasks = [
        makeTask({ aiUsed: true, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).aiUsageRate).toBe(33);
    });
  });

  // --- estimatedTimeSaved ---

  describe('estimatedTimeSaved', () => {
    it('AI使用タスクの方が短いとき正の削減時間を返す', () => {
      // 非AI: 60分平均、AI: 30分平均、AI使用2件 → (60-30)*2 = 60分
      const tasks = [
        makeTask({ aiUsed: false, duration: 60, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, duration: 60, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 30, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 30, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).estimatedTimeSaved).toBe(60);
    });

    it('AI使用タスクの方が長いとき 0 を返す（負にならない）', () => {
      const tasks = [
        makeTask({ aiUsed: false, duration: 20, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 40, completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).estimatedTimeSaved).toBe(0);
    });

    it('データ不足のとき 0', () => {
      expect(calcRoi([]).estimatedTimeSaved).toBe(0);
    });
  });

  // --- roiScore と roiLabel ---

  describe('roiScore と roiLabel', () => {
    it('データ不足のとき score=0, label=N/A', () => {
      const result = calcRoi([]);
      expect(result.roiScore).toBe(0);
      expect(result.roiLabel).toBe('N/A');
    });

    it('80%以上削減のとき Excellent', () => {
      // 非AI:100分、AI:10分 → 削減率90%
      const tasks = [
        makeTask({ aiUsed: false, duration: 100, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 10, completedAt: thisWeek() }),
      ];
      const result = calcRoi(tasks);
      expect(result.roiScore).toBeGreaterThanOrEqual(80);
      expect(result.roiLabel).toBe('Excellent');
    });

    it('50%以上80%未満の削減率のとき Good', () => {
      // 非AI:100分、AI:40分 → 削減率60%
      const tasks = [
        makeTask({ aiUsed: false, duration: 100, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 40, completedAt: thisWeek() }),
      ];
      const result = calcRoi(tasks);
      expect(result.roiScore).toBeGreaterThanOrEqual(50);
      expect(result.roiScore).toBeLessThan(80);
      expect(result.roiLabel).toBe('Good');
    });

    it('1%以上50%未満の削減率のとき Fair', () => {
      // 非AI:100分、AI:70分 → 削減率30%
      const tasks = [
        makeTask({ aiUsed: false, duration: 100, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 70, completedAt: thisWeek() }),
      ];
      const result = calcRoi(tasks);
      expect(result.roiScore).toBeGreaterThanOrEqual(1);
      expect(result.roiScore).toBeLessThan(50);
      expect(result.roiLabel).toBe('Fair');
    });

    it('roiScore は 0〜100 にクランプされる', () => {
      // AI の方が速い（削減率が100を超えることはない）
      const tasks = [
        makeTask({ aiUsed: false, duration: 100, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 0, completedAt: thisWeek() }),
      ];
      const result = calcRoi(tasks);
      expect(result.roiScore).toBeLessThanOrEqual(100);
      expect(result.roiScore).toBeGreaterThanOrEqual(0);
    });

    it('非AI平均時間が0のとき score=0, label=N/A（ゼロ除算防止）', () => {
      const tasks = [
        makeTask({ aiUsed: false, duration: 0, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 0, completedAt: thisWeek() }),
      ];
      const result = calcRoi(tasks);
      expect(result.roiScore).toBe(0);
      expect(result.roiLabel).toBe('N/A');
    });
  });

  // --- topCategory ---

  describe('topCategory', () => {
    it('タスクが空のとき null', () => {
      expect(calcRoi([]).topCategory).toBeNull();
    });

    it('最も AI 使用率が高いカテゴリが選ばれる', () => {
      const tasks = [
        // dev: AI 2/2 = 100%
        makeTask({ aiUsed: true, category: ['dev'], completedAt: thisWeek() }),
        makeTask({ aiUsed: true, category: ['dev'], completedAt: thisWeek() }),
        // design: AI 0/2 = 0%
        makeTask({ aiUsed: false, category: ['design'], completedAt: thisWeek() }),
        makeTask({ aiUsed: false, category: ['design'], completedAt: thisWeek() }),
      ];
      // hasEnoughData を true にするため今週内ですでに両方ある
      expect(calcRoi(tasks).topCategory).toBe('dev');
    });

    it('AI使用率が同率のとき totalTasks が多い方が選ばれる（タイブレーク）', () => {
      const tasks = [
        // dev: AI 2/2 = 100%, totalTasks=2
        makeTask({ aiUsed: true, category: ['dev'], completedAt: thisWeek() }),
        makeTask({ aiUsed: true, category: ['dev'], completedAt: thisWeek() }),
        // design: AI 1/1 = 100%, totalTasks=1
        makeTask({ aiUsed: true, category: ['design'], completedAt: thisWeek() }),
        // hasEnoughData 用の非AIタスク
        makeTask({ aiUsed: false, category: ['other'], completedAt: thisWeek() }),
      ];
      expect(calcRoi(tasks).topCategory).toBe('dev');
    });
  });

  // --- categoryBreakdown ---

  describe('categoryBreakdown', () => {
    it('タスクが空のとき空配列', () => {
      expect(calcRoi([]).categoryBreakdown).toEqual([]);
    });

    it('カテゴリ別の集計が正しい', () => {
      const tasks = [
        makeTask({ aiUsed: true, category: ['dev'], duration: 30, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, category: ['dev'], duration: 60, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, category: ['design'], duration: 20, completedAt: thisWeek() }),
      ];
      const { categoryBreakdown } = calcRoi(tasks);

      const dev = categoryBreakdown.find((c) => c.category === 'dev');
      expect(dev).toBeDefined();
      expect(dev!.totalTasks).toBe(2);
      expect(dev!.aiTasks).toBe(1);
      expect(dev!.aiUsageRate).toBe(50);

      const design = categoryBreakdown.find((c) => c.category === 'design');
      expect(design).toBeDefined();
      expect(design!.totalTasks).toBe(1);
      expect(design!.aiTasks).toBe(1);
      expect(design!.aiUsageRate).toBe(100);
    });

    it('タスクが複数カテゴリを持つ場合、各カテゴリに個別にカウントされる', () => {
      const tasks = [
        makeTask({ aiUsed: true, category: ['dev', 'design'], completedAt: thisWeek() }),
        makeTask({ aiUsed: false, category: ['dev'], completedAt: thisWeek() }),
      ];
      const { categoryBreakdown } = calcRoi(tasks);

      const dev = categoryBreakdown.find((c) => c.category === 'dev');
      const design = categoryBreakdown.find((c) => c.category === 'design');

      expect(dev!.totalTasks).toBe(2);
      expect(design!.totalTasks).toBe(1);
    });
  });

  // --- 今週フィルタリング ---

  describe('今週フィルタリング', () => {
    it('先週のタスクは集計に含まれない', () => {
      const tasks = [
        makeTask({ aiUsed: true, duration: 10, completedAt: lastWeek() }),
        makeTask({ aiUsed: false, duration: 100, completedAt: lastWeek() }),
      ];
      const result = calcRoi(tasks);
      expect(result.hasEnoughData).toBe(false);
      expect(result.aiUsageRate).toBe(0);
    });

    it('今週タスクと先週タスクが混在するとき今週分のみ計算される', () => {
      const tasks = [
        // 今週: AI 使用 2 件、未使用 1 件
        makeTask({ aiUsed: true, duration: 20, completedAt: thisWeek() }),
        makeTask({ aiUsed: true, duration: 20, completedAt: thisWeek() }),
        makeTask({ aiUsed: false, duration: 60, completedAt: thisWeek() }),
        // 先週: 別のパターン（集計対象外）
        makeTask({ aiUsed: false, duration: 10, completedAt: lastWeek() }),
        makeTask({ aiUsed: false, duration: 10, completedAt: lastWeek() }),
      ];
      const result = calcRoi(tasks);
      // 今週 3 件中 2 件 AI 使用 = 67%
      expect(result.aiUsageRate).toBe(67);
      expect(result.hasEnoughData).toBe(true);
    });
  });
});
