import type { AIComparisonStats, CategoryStats, RoiSummary, CategoryAiUsage } from '@/types/statistics';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * カテゴリ別AI活用率を計算する
 */
export function calcCategoryAiUsage(categories: CategoryStats[]): CategoryAiUsage[] {
  return categories.map((cat) => ({
    category: cat.category,
    aiUsageRate: cat.aiUsageRate,
    totalTasks: cat.count,
  }));
}

/**
 * ROI サマリーを計算する純粋関数
 */
export function calcRoiSummary(
  aiComparison: AIComparisonStats,
  categories: CategoryStats[]
): RoiSummary {
  const aiTaskCount = aiComparison.aiUsed.count;
  const nonAiTaskCount = aiComparison.aiNotUsed.count;
  const totalTasks = aiTaskCount + nonAiTaskCount;

  // 空状態判定
  const isEmpty = totalTasks === 0 || aiTaskCount === 0 || nonAiTaskCount === 0;

  if (isEmpty) {
    return {
      aiUsageRate: totalTasks > 0 ? Math.round((aiTaskCount / totalTasks) * 100) : 0,
      estimatedTimeSaved: 0,
      mostEffectiveCategory: null,
      roiScore: 0,
      roiScoreLabel: 'N/A',
      timeSavingsRate: 0,
      categoryCoverage: 0,
      isEmpty: true,
    };
  }

  const avgTimeWithAi = aiComparison.aiUsed.averageDuration;
  const avgTimeWithoutAi = aiComparison.aiNotUsed.averageDuration;

  // 今週のAI活用率
  const aiUsageRate = Math.round((aiTaskCount / totalTasks) * 100);

  // 推定時間削減（負値は0にクランプ）
  const estimatedTimeSaved = Math.max(0, (avgTimeWithoutAi - avgTimeWithAi) * aiTaskCount);

  // 時間短縮割合
  const timeSavingsRate =
    avgTimeWithoutAi > 0
      ? clamp(((avgTimeWithoutAi - avgTimeWithAi) / avgTimeWithoutAi) * 100, 0, 100)
      : 0;

  // カテゴリカバレッジ
  const totalCategories = categories.length;
  const aiCoveredCategories = categories.filter((cat) => {
    // aiUsageRate > 0 なら AI使用タスクが1件以上ある
    return cat.aiUsageRate > 0;
  }).length;
  const categoryCoverage =
    totalCategories > 0 ? (aiCoveredCategories / totalCategories) * 100 : 0;

  // ROIスコア
  const roiScore = clamp(timeSavingsRate * 0.7 + categoryCoverage * 0.3, 0, 100);

  // ROIスコアラベル
  let roiScoreLabel: RoiSummary['roiScoreLabel'];
  if (roiScore >= 80) {
    roiScoreLabel = 'Excellent';
  } else if (roiScore >= 50) {
    roiScoreLabel = 'Good';
  } else if (roiScore >= 1) {
    roiScoreLabel = 'Fair';
  } else {
    roiScoreLabel = 'N/A';
  }

  // 最も効果的なカテゴリ（aiUsageRate 最大、同率時は AI使用タスク数が多い方）
  let mostEffectiveCategory: string | null = null;
  if (categories.length > 0) {
    const sorted = [...categories].sort((a, b) => {
      if (b.aiUsageRate !== a.aiUsageRate) return b.aiUsageRate - a.aiUsageRate;
      // 同率時は AI使用タスク数（count * aiUsageRate / 100）で比較
      const aAiCount = Math.round((a.count * a.aiUsageRate) / 100);
      const bAiCount = Math.round((b.count * b.aiUsageRate) / 100);
      return bAiCount - aAiCount;
    });
    mostEffectiveCategory = sorted[0].category;
  }

  return {
    aiUsageRate,
    estimatedTimeSaved: Math.round(estimatedTimeSaved),
    mostEffectiveCategory,
    roiScore: Math.round(roiScore),
    roiScoreLabel,
    timeSavingsRate: Math.round(timeSavingsRate),
    categoryCoverage: Math.round(categoryCoverage),
    isEmpty: false,
  };
}
