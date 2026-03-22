import { useMemo } from 'react';
import { isThisWeek } from 'date-fns';
import { useTasks } from './useTasks';
import {
  hasEnoughData,
  calcAiUsageRate,
  calcTimeSaved,
  calcMostEffectiveCategory,
  calcRoiScore,
  calcCategoryAiUsage,
} from '@/lib/roiCalc';
import type { CategoryAiUsage, RoiScore } from '@/lib/roiCalc';

export interface RoiDashboardData {
  hasData: boolean;
  aiUsageRate: number;
  timeSaved: number;
  mostEffectiveCategory: string | null;
  roiScore: RoiScore;
  categoryData: CategoryAiUsage[];
}

/**
 * ROIダッシュボード用のカスタムフック
 * 今週のタスクデータを元にKPIを計算する
 */
export function useRoiDashboard(): RoiDashboardData {
  const { tasks } = useTasks();

  return useMemo<RoiDashboardData>(() => {
    // 今週のタスクをフィルタ
    const weekTasks = tasks.filter((task) => {
      if (!task.completedAt) return false;
      return isThisWeek(task.completedAt);
    });

    if (!hasEnoughData(weekTasks)) {
      return {
        hasData: false,
        aiUsageRate: 0,
        timeSaved: 0,
        mostEffectiveCategory: null,
        roiScore: { score: 0, label: 'N/A' },
        categoryData: [],
      };
    }

    return {
      hasData: true,
      aiUsageRate: calcAiUsageRate(weekTasks),
      timeSaved: calcTimeSaved(weekTasks),
      mostEffectiveCategory: calcMostEffectiveCategory(weekTasks),
      roiScore: calcRoiScore(weekTasks),
      categoryData: calcCategoryAiUsage(weekTasks),
    };
  }, [tasks]);
}
