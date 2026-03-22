import type { Task } from '@/types/task';

export interface CategoryAiUsage {
  category: string;
  rate: number; // 0-100
  aiCount: number;
  totalCount: number;
}

export interface RoiScore {
  score: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'N/A';
}

/**
 * データが十分かどうかを判定する
 * AI使用タスクと未使用タスクがそれぞれ1件以上、合計5件以上
 */
export function hasEnoughData(tasks: Task[]): boolean {
  const aiTasks = tasks.filter((t) => t.aiUsed);
  const nonAiTasks = tasks.filter((t) => !t.aiUsed);
  return aiTasks.length > 0 && nonAiTasks.length > 0 && tasks.length >= 5;
}

/**
 * AI活用率を計算する (0-100%)
 */
export function calcAiUsageRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const aiCount = tasks.filter((t) => t.aiUsed).length;
  return Math.round((aiCount / tasks.length) * 100);
}

/**
 * 推定時間削減を計算する（分）
 * AI使用タスクの平均時間と未使用タスクの平均時間の差分 x AI使用タスク数
 */
export function calcTimeSaved(tasks: Task[]): number {
  const aiTasks = tasks.filter((t) => t.aiUsed);
  const nonAiTasks = tasks.filter((t) => !t.aiUsed);

  if (aiTasks.length === 0 || nonAiTasks.length === 0) return 0;

  const aiAvg = aiTasks.reduce((sum, t) => sum + t.duration, 0) / aiTasks.length;
  const nonAiAvg = nonAiTasks.reduce((sum, t) => sum + t.duration, 0) / nonAiTasks.length;

  const diff = nonAiAvg - aiAvg;
  if (diff <= 0) return 0;

  return Math.round(diff * aiTasks.length);
}

/**
 * 最も効果的なカテゴリを返す（AI活用率が最も高いカテゴリ）
 */
export function calcMostEffectiveCategory(tasks: Task[]): string | null {
  const categoryMap = new Map<string, { aiCount: number; totalCount: number }>();

  tasks.forEach((task) => {
    task.category.forEach((cat) => {
      const current = categoryMap.get(cat) || { aiCount: 0, totalCount: 0 };
      categoryMap.set(cat, {
        aiCount: current.aiCount + (task.aiUsed ? 1 : 0),
        totalCount: current.totalCount + 1,
      });
    });
  });

  let bestCategory: string | null = null;
  let bestRate = -1;

  categoryMap.forEach((data, category) => {
    const rate = data.aiCount / data.totalCount;
    if (rate > bestRate) {
      bestRate = rate;
      bestCategory = category;
    }
  });

  return bestCategory;
}

/**
 * AI ROI スコアを計算する (0-100)
 * 時間削減率をベースにスコア化
 */
export function calcRoiScore(tasks: Task[]): RoiScore {
  const aiTasks = tasks.filter((t) => t.aiUsed);
  const nonAiTasks = tasks.filter((t) => !t.aiUsed);

  if (aiTasks.length === 0 || nonAiTasks.length === 0) {
    return { score: 0, label: 'N/A' };
  }

  const aiAvg = aiTasks.reduce((sum, t) => sum + t.duration, 0) / aiTasks.length;
  const nonAiAvg = nonAiTasks.reduce((sum, t) => sum + t.duration, 0) / nonAiTasks.length;

  if (nonAiAvg === 0) {
    return { score: 0, label: 'N/A' };
  }

  // 時間削減率: (nonAiAvg - aiAvg) / nonAiAvg * 100
  const reductionRate = ((nonAiAvg - aiAvg) / nonAiAvg) * 100;
  const score = Math.max(0, Math.min(100, Math.round(reductionRate)));

  let label: RoiScore['label'];
  if (score >= 80) {
    label = 'Excellent';
  } else if (score >= 50) {
    label = 'Good';
  } else if (score >= 1) {
    label = 'Fair';
  } else {
    label = 'N/A';
  }

  return { score, label };
}

/**
 * カテゴリ別AI活用率を計算する
 */
export function calcCategoryAiUsage(tasks: Task[]): CategoryAiUsage[] {
  const categoryMap = new Map<string, { aiCount: number; totalCount: number }>();

  tasks.forEach((task) => {
    task.category.forEach((cat) => {
      const current = categoryMap.get(cat) || { aiCount: 0, totalCount: 0 };
      categoryMap.set(cat, {
        aiCount: current.aiCount + (task.aiUsed ? 1 : 0),
        totalCount: current.totalCount + 1,
      });
    });
  });

  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      rate: Math.round((data.aiCount / data.totalCount) * 100),
      aiCount: data.aiCount,
      totalCount: data.totalCount,
    }))
    .sort((a, b) => b.rate - a.rate);
}
