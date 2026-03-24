import type { Task } from '@/types/task';
import type { CategoryAiUsage, RoiLabel, RoiSummary } from '@/types/statistics';

/**
 * データが十分かどうか判定する
 * - タスク数 >= 5、かつ AI使用タスクと非AI使用タスクが両方存在する
 */
export function hasEnoughData(tasks: Task[]): boolean {
  return tasks.length >= 5 && tasks.some((t) => t.aiUsed) && tasks.some((t) => !t.aiUsed);
}

/**
 * AI活用率を計算する (0-100%)
 */
export function calcWeeklyAiUsageRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const aiCount = tasks.filter((t) => t.aiUsed).length;
  return Math.round((aiCount / tasks.length) * 100);
}

/**
 * カテゴリ別AI活用統計を計算する
 * task.category は string[] なので forEach で各カテゴリに分配カウント
 */
export function calcCategoryAiUsage(tasks: Task[]): CategoryAiUsage[] {
  const categoryMap = new Map<string, { taskCount: number; aiTaskCount: number }>();

  tasks.forEach((task) => {
    task.category.forEach((cat) => {
      const current = categoryMap.get(cat) ?? { taskCount: 0, aiTaskCount: 0 };
      categoryMap.set(cat, {
        taskCount: current.taskCount + 1,
        aiTaskCount: current.aiTaskCount + (task.aiUsed ? 1 : 0),
      });
    });
  });

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    taskCount: data.taskCount,
    aiTaskCount: data.aiTaskCount,
    aiUsageRate: Math.round((data.aiTaskCount / data.taskCount) * 100),
  }));
}

/**
 * AI活用率が最も高いカテゴリを返す
 * 同率の場合は taskCount 降順で安定ソート
 * 空配列の場合は null
 */
export function calcMostEffectiveCategory(categoryUsages: CategoryAiUsage[]): string | null {
  if (categoryUsages.length === 0) return null;

  const sorted = [...categoryUsages].sort((a, b) => {
    if (b.aiUsageRate !== a.aiUsageRate) return b.aiUsageRate - a.aiUsageRate;
    return b.taskCount - a.taskCount;
  });

  return sorted[0].category;
}

/**
 * 推定時間削減量を計算する（分）
 * 3段階フォールバック:
 * 1. timeMinutesNoAi あり → 直接差分
 * 2. timeMinutesNoAi なし → カテゴリ別平均差分
 * 3. カテゴリ別不能 → 全体平均差分 → 0
 */
export function calcEstimatedTimeSaved(tasks: Task[]): number {
  const aiTasks = tasks.filter((t) => t.aiUsed);
  if (aiTasks.length === 0) return 0;

  // 段階1: timeMinutesNoAi が設定されているタスクから直接差分
  const directDiffTasks = aiTasks.filter((t) => t.timeMinutesNoAi !== undefined && t.timeMinutesNoAi > 0);
  if (directDiffTasks.length > 0) {
    const totalSaved = directDiffTasks.reduce((sum, t) => {
      const diff = (t.timeMinutesNoAi ?? 0) - t.duration;
      return sum + Math.max(0, diff);
    }, 0);
    return Math.round(totalSaved);
  }

  // 段階2: カテゴリ別平均差分
  const nonAiTasks = tasks.filter((t) => !t.aiUsed);
  if (nonAiTasks.length > 0) {
    // カテゴリ別に AI と 非AI の平均所要時間を計算
    const categoryAiDuration = new Map<string, { sum: number; count: number }>();
    const categoryNonAiDuration = new Map<string, { sum: number; count: number }>();

    aiTasks.forEach((task) => {
      task.category.forEach((cat) => {
        const current = categoryAiDuration.get(cat) ?? { sum: 0, count: 0 };
        categoryAiDuration.set(cat, { sum: current.sum + task.duration, count: current.count + 1 });
      });
    });

    nonAiTasks.forEach((task) => {
      task.category.forEach((cat) => {
        const current = categoryNonAiDuration.get(cat) ?? { sum: 0, count: 0 };
        categoryNonAiDuration.set(cat, { sum: current.sum + task.duration, count: current.count + 1 });
      });
    });

    let totalSaved = 0;
    let categoriesComputed = 0;

    categoryAiDuration.forEach((aiData, cat) => {
      const nonAiData = categoryNonAiDuration.get(cat);
      if (nonAiData && nonAiData.count > 0 && aiData.count > 0) {
        const nonAiAvg = nonAiData.sum / nonAiData.count;
        const aiAvg = aiData.sum / aiData.count;
        const diff = nonAiAvg - aiAvg;
        totalSaved += Math.max(0, diff) * aiData.count;
        categoriesComputed++;
      }
    });

    if (categoriesComputed > 0) {
      return Math.round(totalSaved);
    }
  }

  // 段階3: 全体平均差分
  const nonAiTasksAll = tasks.filter((t) => !t.aiUsed);
  if (nonAiTasksAll.length > 0 && aiTasks.length > 0) {
    const nonAiAvg = nonAiTasksAll.reduce((sum, t) => sum + t.duration, 0) / nonAiTasksAll.length;
    const aiAvg = aiTasks.reduce((sum, t) => sum + t.duration, 0) / aiTasks.length;
    const diff = nonAiAvg - aiAvg;
    return Math.max(0, Math.round(diff * aiTasks.length));
  }

  return 0;
}

/**
 * ROIスコアを計算する (0-100)
 * 加重平均: 活用率 30% + 時間削減 40% + 品質改善 30%
 */
export function calcRoiScore(
  aiUsageRate: number,
  estimatedTimeSaved: number,
  tasks: Task[]
): number {
  const aiTasks = tasks.filter((t) => t.aiUsed);
  const nonAiTasks = tasks.filter((t) => !t.aiUsed);

  // 活用率スコア
  const usageScore = aiUsageRate / 100;

  // 時間削減スコア
  const totalAiDuration = aiTasks.reduce((sum, t) => sum + t.duration, 0);
  const timeSavedScore =
    totalAiDuration > 0 ? Math.min(1, estimatedTimeSaved / totalAiDuration) : 0;

  // 品質改善スコア: reworkCount の改善率
  const aiRework =
    aiTasks.length > 0
      ? aiTasks.reduce((sum, t) => sum + t.reworkCount, 0) / aiTasks.length
      : 0;
  const nonAiRework =
    nonAiTasks.length > 0
      ? nonAiTasks.reduce((sum, t) => sum + t.reworkCount, 0) / nonAiTasks.length
      : 0;

  let qualityScore = 0;
  if (nonAiRework > 0) {
    qualityScore = Math.max(0, Math.min(1, (nonAiRework - aiRework) / nonAiRework));
  } else if (aiRework === 0 && nonAiRework === 0) {
    // どちらも0の場合は中立
    qualityScore = 0.5;
  }

  const rawScore = (usageScore * 0.3 + timeSavedScore * 0.4 + qualityScore * 0.3) * 100;
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

/**
 * ROI評価ラベルを返す
 */
export function getRoiLabel(score: number, enoughData: boolean): RoiLabel {
  if (!enoughData) return 'N/A';
  if (score >= 70) return 'Excellent';
  if (score >= 40) return 'Good';
  return 'Fair';
}

/**
 * ROIサマリーを計算するエントリポイント
 * 引数は呼び出し側で「今週」フィルタ済みタスクを渡す
 */
export function calcRoiSummary(tasks: Task[]): RoiSummary {
  const enoughData = hasEnoughData(tasks);

  if (!enoughData) {
    return {
      weeklyAiUsageRate: calcWeeklyAiUsageRate(tasks),
      estimatedTimeSaved: 0,
      mostEffectiveCategory: null,
      roiScore: 0,
      roiLabel: 'N/A',
      hasEnoughData: false,
    };
  }

  const weeklyAiUsageRate = calcWeeklyAiUsageRate(tasks);
  const estimatedTimeSaved = calcEstimatedTimeSaved(tasks);
  const categoryUsages = calcCategoryAiUsage(tasks);
  const mostEffectiveCategory = calcMostEffectiveCategory(categoryUsages);
  const roiScore = calcRoiScore(weeklyAiUsageRate, estimatedTimeSaved, tasks);
  const roiLabel = getRoiLabel(roiScore, enoughData);

  return {
    weeklyAiUsageRate,
    estimatedTimeSaved,
    mostEffectiveCategory,
    roiScore,
    roiLabel,
    hasEnoughData: true,
  };
}
