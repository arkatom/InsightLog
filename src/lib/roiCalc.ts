import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import type { Task } from '@/types/task';

export type RoiLabel = 'Excellent' | 'Good' | 'Fair' | 'N/A';

export interface CategoryAiUsage {
  category: string;
  totalTasks: number;
  aiTasks: number;
  aiUsageRate: number; // 0-100 (%)
}

export interface RoiResult {
  hasEnoughData: boolean;
  aiUsageRate: number; // 0-100 (%)
  roiScore: number; // 0-100
  roiLabel: RoiLabel;
  estimatedTimeSaved: number; // 分（今週合計）
  topCategory: string | null;
  categoryBreakdown: CategoryAiUsage[];
}

function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function getRoiLabel(score: number, hasData: boolean): RoiLabel {
  if (!hasData) return 'N/A';
  if (score >= 80) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 1) return 'Fair';
  return 'N/A';
}

/**
 * 今週（月曜始まり）のタスクを対象に ROI を計算する純粋関数
 */
export function calcRoi(tasks: Task[]): RoiResult {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekTasks = tasks.filter((task) => {
    if (!task.completedAt) return false;
    return isWithinInterval(task.completedAt, { start: weekStart, end: weekEnd });
  });

  const totalTasks = weekTasks.length;
  const aiTasks = weekTasks.filter((t) => t.aiUsed);
  const nonAiTasks = weekTasks.filter((t) => !t.aiUsed);
  const aiUsedCount = aiTasks.length;
  const aiNotUsedCount = nonAiTasks.length;

  const hasEnoughData = totalTasks > 0 && aiUsedCount > 0 && aiNotUsedCount > 0;

  const aiUsageRate = totalTasks > 0 ? Math.round((aiUsedCount / totalTasks) * 100) : 0;

  // カテゴリ別集計
  const categoryMap = new Map<string, { totalTasks: number; aiTasks: number }>();
  weekTasks.forEach((task) => {
    task.category.forEach((cat) => {
      const current = categoryMap.get(cat) ?? { totalTasks: 0, aiTasks: 0 };
      categoryMap.set(cat, {
        totalTasks: current.totalTasks + 1,
        aiTasks: current.aiTasks + (task.aiUsed ? 1 : 0),
      });
    });
  });

  const categoryBreakdown: CategoryAiUsage[] = Array.from(categoryMap.entries()).map(
    ([category, data]) => ({
      category,
      totalTasks: data.totalTasks,
      aiTasks: data.aiTasks,
      aiUsageRate: Math.round((data.aiTasks / data.totalTasks) * 100),
    })
  );

  // 最も効果的なカテゴリ（aiUsageRate 最高、同率ならタスク数多い方）
  let topCategory: string | null = null;
  if (categoryBreakdown.length > 0) {
    const sorted = [...categoryBreakdown].sort((a, b) => {
      if (b.aiUsageRate !== a.aiUsageRate) return b.aiUsageRate - a.aiUsageRate;
      return b.totalTasks - a.totalTasks;
    });
    topCategory = sorted[0].category;
  }

  if (!hasEnoughData) {
    return {
      hasEnoughData,
      aiUsageRate,
      roiScore: 0,
      roiLabel: 'N/A',
      estimatedTimeSaved: 0,
      topCategory,
      categoryBreakdown,
    };
  }

  const avgDurationNoAi = mean(nonAiTasks.map((t) => t.duration));
  const avgDurationWithAi = mean(aiTasks.map((t) => t.duration));

  const timeSavedPerTask = avgDurationNoAi - avgDurationWithAi;
  const estimatedTimeSaved = Math.max(0, Math.round(timeSavedPerTask * aiUsedCount));

  let roiScore = 0;
  if (avgDurationNoAi === 0) {
    roiScore = 0;
  } else {
    const timeSavingRate = ((avgDurationNoAi - avgDurationWithAi) / avgDurationNoAi) * 100;
    roiScore = clamp(0, 100, Math.round(timeSavingRate));
  }

  const roiLabel = avgDurationNoAi === 0 ? 'N/A' : getRoiLabel(roiScore, true);

  return {
    hasEnoughData,
    aiUsageRate,
    roiScore,
    roiLabel,
    estimatedTimeSaved,
    topCategory,
    categoryBreakdown,
  };
}
