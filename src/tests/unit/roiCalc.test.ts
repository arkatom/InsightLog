import { describe, it, expect } from 'vitest';
import {
  hasEnoughData,
  calcAiUsageRate,
  calcTimeSaved,
  calcMostEffectiveCategory,
  calcRoiScore,
  calcCategoryAiUsage,
} from '@/lib/roiCalc';
import type { Task } from '@/types/task';

// ヘルパー: テスト用タスクを作成
function createTask(overrides: Partial<Task> = {}): Task {
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

describe('roiCalc', () => {
  describe('hasEnoughData', () => {
    it('AI使用+未使用が合計5件以上でtrue', () => {
      const tasks = [
        createTask({ aiUsed: true }),
        createTask({ aiUsed: true }),
        createTask({ aiUsed: true }),
        createTask({ aiUsed: false }),
        createTask({ aiUsed: false }),
      ];
      expect(hasEnoughData(tasks)).toBe(true);
    });

    it('合計5件未満でfalse', () => {
      const tasks = [
        createTask({ aiUsed: true }),
        createTask({ aiUsed: false }),
      ];
      expect(hasEnoughData(tasks)).toBe(false);
    });

    it('AI使用タスクが0件でfalse', () => {
      const tasks = Array.from({ length: 5 }, () => createTask({ aiUsed: false }));
      expect(hasEnoughData(tasks)).toBe(false);
    });

    it('AI未使用タスクが0件でfalse', () => {
      const tasks = Array.from({ length: 5 }, () => createTask({ aiUsed: true }));
      expect(hasEnoughData(tasks)).toBe(false);
    });

    it('空配列でfalse', () => {
      expect(hasEnoughData([])).toBe(false);
    });
  });

  describe('calcAiUsageRate', () => {
    it('AI使用率を正しく計算する', () => {
      const tasks = [
        createTask({ aiUsed: true }),
        createTask({ aiUsed: true }),
        createTask({ aiUsed: false }),
        createTask({ aiUsed: false }),
      ];
      expect(calcAiUsageRate(tasks)).toBe(50);
    });

    it('全てAI使用で100%', () => {
      const tasks = [createTask({ aiUsed: true }), createTask({ aiUsed: true })];
      expect(calcAiUsageRate(tasks)).toBe(100);
    });

    it('AI未使用のみで0%', () => {
      const tasks = [createTask({ aiUsed: false })];
      expect(calcAiUsageRate(tasks)).toBe(0);
    });

    it('空配列で0%', () => {
      expect(calcAiUsageRate([])).toBe(0);
    });
  });

  describe('calcTimeSaved', () => {
    it('AI使用タスクが速い場合、削減時間を正しく計算する', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 20 }),
        createTask({ aiUsed: true, duration: 20 }),
        createTask({ aiUsed: false, duration: 40 }),
        createTask({ aiUsed: false, duration: 40 }),
      ];
      // nonAiAvg=40, aiAvg=20, diff=20, aiCount=2 => 40
      expect(calcTimeSaved(tasks)).toBe(40);
    });

    it('AI使用タスクが遅い場合は0を返す', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 50 }),
        createTask({ aiUsed: false, duration: 20 }),
      ];
      expect(calcTimeSaved(tasks)).toBe(0);
    });

    it('AI使用タスクが0件の場合は0を返す', () => {
      const tasks = [createTask({ aiUsed: false, duration: 30 })];
      expect(calcTimeSaved(tasks)).toBe(0);
    });

    it('AI未使用タスクが0件の場合は0を返す', () => {
      const tasks = [createTask({ aiUsed: true, duration: 30 })];
      expect(calcTimeSaved(tasks)).toBe(0);
    });
  });

  describe('calcMostEffectiveCategory', () => {
    it('AI活用率が最も高いカテゴリを返す', () => {
      const tasks = [
        createTask({ aiUsed: true, category: ['実装'] }),
        createTask({ aiUsed: true, category: ['実装'] }),
        createTask({ aiUsed: false, category: ['設計'] }),
        createTask({ aiUsed: false, category: ['設計'] }),
      ];
      expect(calcMostEffectiveCategory(tasks)).toBe('実装');
    });

    it('空配列でnullを返す', () => {
      expect(calcMostEffectiveCategory([])).toBeNull();
    });

    it('複数カテゴリを持つタスクを正しく処理する', () => {
      const tasks = [
        createTask({ aiUsed: true, category: ['実装', '設計'] }),
        createTask({ aiUsed: false, category: ['実装'] }),
      ];
      // 実装: 1/2=50%, 設計: 1/1=100%
      expect(calcMostEffectiveCategory(tasks)).toBe('設計');
    });
  });

  describe('calcRoiScore', () => {
    it('高い削減率でExcellentを返す', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 10 }),
        createTask({ aiUsed: false, duration: 100 }),
      ];
      const result = calcRoiScore(tasks);
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.label).toBe('Excellent');
    });

    it('中程度の削減率でGoodを返す', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 40 }),
        createTask({ aiUsed: false, duration: 100 }),
      ];
      const result = calcRoiScore(tasks);
      expect(result.score).toBe(60);
      expect(result.label).toBe('Good');
    });

    it('低い削減率でFairを返す', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 80 }),
        createTask({ aiUsed: false, duration: 100 }),
      ];
      const result = calcRoiScore(tasks);
      expect(result.score).toBe(20);
      expect(result.label).toBe('Fair');
    });

    it('AI使用タスクが0件でN/Aを返す', () => {
      const tasks = [createTask({ aiUsed: false })];
      const result = calcRoiScore(tasks);
      expect(result.score).toBe(0);
      expect(result.label).toBe('N/A');
    });

    it('AI未使用タスクが0件でN/Aを返す', () => {
      const tasks = [createTask({ aiUsed: true })];
      const result = calcRoiScore(tasks);
      expect(result.score).toBe(0);
      expect(result.label).toBe('N/A');
    });

    it('AIの方が遅い場合スコア0でN/Aを返す', () => {
      const tasks = [
        createTask({ aiUsed: true, duration: 100 }),
        createTask({ aiUsed: false, duration: 50 }),
      ];
      const result = calcRoiScore(tasks);
      expect(result.score).toBe(0);
      expect(result.label).toBe('N/A');
    });
  });

  describe('calcCategoryAiUsage', () => {
    it('カテゴリ別のAI活用率を正しく計算する', () => {
      const tasks = [
        createTask({ aiUsed: true, category: ['実装'] }),
        createTask({ aiUsed: false, category: ['実装'] }),
        createTask({ aiUsed: true, category: ['設計'] }),
      ];
      const result = calcCategoryAiUsage(tasks);

      expect(result).toHaveLength(2);
      // rate降順でソートされる
      const design = result.find((r) => r.category === '設計');
      const impl = result.find((r) => r.category === '実装');

      expect(design?.rate).toBe(100);
      expect(design?.aiCount).toBe(1);
      expect(design?.totalCount).toBe(1);

      expect(impl?.rate).toBe(50);
      expect(impl?.aiCount).toBe(1);
      expect(impl?.totalCount).toBe(2);
    });

    it('空配列で空の結果を返す', () => {
      expect(calcCategoryAiUsage([])).toEqual([]);
    });

    it('結果がrate降順でソートされる', () => {
      const tasks = [
        createTask({ aiUsed: true, category: ['実装'] }),
        createTask({ aiUsed: false, category: ['実装'] }),
        createTask({ aiUsed: true, category: ['設計'] }),
      ];
      const result = calcCategoryAiUsage(tasks);
      expect(result[0].category).toBe('設計'); // 100%
      expect(result[1].category).toBe('実装'); // 50%
    });
  });
});
