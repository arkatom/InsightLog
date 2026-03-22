import { isThisWeek } from 'date-fns';
import type { Task } from '@/types/task';

export interface RoiResult {
  aiUsageRate: number;
  estimatedTimeSaved: number;
  mostEffectiveCategory: string | null;
  roiScore: number;
  roiLabel: 'Excellent' | 'Good' | 'Fair' | 'N/A';
  categoryBreakdown: { category: string; aiRate: number; total: number }[];
  hasEnoughData: boolean;
}

/**
 * 今週のタスクから AI ROI 指標を計算する
 */
export function calcRoi(allTasks: Task[]): RoiResult {
  const weekTasks = allTasks.filter(
    (t) => t.completedAt && isThisWeek(t.completedAt)
  );

  const aiTasks = weekTasks.filter((t) => t.aiUsed);
  const nonAiTasks = weekTasks.filter((t) => !t.aiUsed);

  const hasEnoughData =
    weekTasks.length >= 5 && aiTasks.length >= 1 && nonAiTasks.length >= 1;

  if (!hasEnoughData) {
    return {
      aiUsageRate: 0,
      estimatedTimeSaved: 0,
      mostEffectiveCategory: null,
      roiScore: 0,
      roiLabel: 'N/A',
      categoryBreakdown: [],
      hasEnoughData: false,
    };
  }

  // AI 活用率
  const aiUsageRate = Math.round((aiTasks.length / weekTasks.length) * 100);

  // 平均所要時間
  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

  const aiAvgDuration = avg(aiTasks.map((t) => t.duration));
  const nonAiAvgDuration = avg(nonAiTasks.map((t) => t.duration));

  // 推定時間削減 (分)
  const timeDiffPerTask = Math.max(0, nonAiAvgDuration - aiAvgDuration);
  const estimatedTimeSaved = Math.round(timeDiffPerTask * aiTasks.length);

  // カテゴリ別 AI 活用率
  const catMap = new Map<string, { ai: number; total: number }>();
  weekTasks.forEach((t) => {
    t.category.forEach((cat) => {
      const cur = catMap.get(cat) || { ai: 0, total: 0 };
      catMap.set(cat, {
        ai: cur.ai + (t.aiUsed ? 1 : 0),
        total: cur.total + 1,
      });
    });
  });

  const categoryBreakdown = Array.from(catMap.entries()).map(
    ([category, { ai, total }]) => ({
      category,
      aiRate: Math.round((ai / total) * 100),
      total,
    })
  );

  // 最も効果的なカテゴリ
  const mostEffective = categoryBreakdown.reduce<
    (typeof categoryBreakdown)[number] | null
  >((best, cur) => (!best || cur.aiRate > best.aiRate ? cur : best), null);
  const mostEffectiveCategory = mostEffective?.category ?? null;

  // ROI スコア (0-100)
  const reductionRate =
    nonAiAvgDuration > 0
      ? ((nonAiAvgDuration - aiAvgDuration) / nonAiAvgDuration) * 100
      : 0;
  const roiScore = Math.max(0, Math.min(100, Math.round(reductionRate)));

  // ラベル
  const roiLabel: RoiResult['roiLabel'] =
    roiScore >= 60 ? 'Excellent' : roiScore >= 30 ? 'Good' : 'Fair';

  return {
    aiUsageRate,
    estimatedTimeSaved,
    mostEffectiveCategory,
    roiScore,
    roiLabel,
    categoryBreakdown,
    hasEnoughData,
  };
}
