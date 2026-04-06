import type { Task } from '@/types/task';
import type { ROIMetrics, ROILabel, CategoryAIUsage } from '@/types/roi';

const DEFAULT_METRICS: ROIMetrics = {
  hasData: false,
  aiUsageRatePercent: 0,
  estimatedTimeSavedMinutes: 0,
  mostEffectiveCategory: null,
  roiScore: 0,
  roiLabel: 'N/A',
  categoryUsage: [],
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function getRoiLabel(score: number): ROILabel {
  if (score >= 70) return 'Excellent';
  if (score >= 40) return 'Good';
  if (score > 0) return 'Fair';
  return 'N/A';
}

export function calculateROIMetrics(tasks: Task[]): ROIMetrics {
  const allTasks = tasks;
  const aiTasks = allTasks.filter((t) => t.aiUsed);
  const nonAiTasks = allTasks.filter((t) => !t.aiUsed);

  const hasData = allTasks.length >= 5 && aiTasks.length > 0 && nonAiTasks.length > 0;
  if (!hasData) {
    return DEFAULT_METRICS;
  }

  // AI活用率
  const aiUsageRatePercent = Math.round((aiTasks.length / allTasks.length) * 100);

  // 平均所要時間
  const avgAi = average(aiTasks.map((t) => t.duration));
  const avgNonAi = average(nonAiTasks.map((t) => t.duration));

  // 推定時間削減
  const estimatedTimeSavedMinutes = Math.max(0, Math.round((avgNonAi - avgAi) * aiTasks.length));

  // カテゴリ別集計マップ
  interface CategoryStats {
    totalCount: number;
    aiCount: number;
  }
  const categoryMap = new Map<string, CategoryStats>();

  allTasks.forEach((task) => {
    task.category.forEach((cat) => {
      const existing = categoryMap.get(cat) ?? { totalCount: 0, aiCount: 0 };
      existing.totalCount += 1;
      if (task.aiUsed) {
        existing.aiCount += 1;
      }
      categoryMap.set(cat, existing);
    });
  });

  // 最も効果的なカテゴリ
  let mostEffectiveCategory: string | null = null;
  let maxRate = -1;
  categoryMap.forEach((stats, cat) => {
    const rate = stats.totalCount > 0 ? stats.aiCount / stats.totalCount : 0;
    if (rate > maxRate) {
      maxRate = rate;
      mostEffectiveCategory = cat;
    }
  });

  // ROIスコア
  let roiScore: number;
  let roiLabel: ROILabel;

  if (avgNonAi === 0) {
    roiScore = 0;
    roiLabel = 'N/A';
  } else {
    const timeReductionRate = ((avgNonAi - avgAi) / avgNonAi) * 100;
    roiScore = Math.round(Math.min(100, Math.max(0, timeReductionRate)));
    roiLabel = getRoiLabel(roiScore);
  }

  // カテゴリ別データ（棒グラフ用）
  const categoryUsage: CategoryAIUsage[] = Array.from(categoryMap.entries()).map(([category, stats]) => ({
    category,
    aiUsageRate: stats.totalCount > 0 ? Math.round((stats.aiCount / stats.totalCount) * 100) : 0,
    totalCount: stats.totalCount,
    aiCount: stats.aiCount,
  }));

  return {
    hasData: true,
    aiUsageRatePercent,
    estimatedTimeSavedMinutes,
    mostEffectiveCategory,
    roiScore,
    roiLabel,
    categoryUsage,
  };
}
