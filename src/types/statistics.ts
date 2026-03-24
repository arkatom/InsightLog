/**
 * 基本統計データ
 */
export interface BasicStats {
  totalTasks: number;
  totalSessions: number;
  totalFocusTime: number; // 秒
}

/**
 * AI比較統計
 */
export interface AIComparisonStats {
  aiUsed: {
    count: number;
    averageDuration: number; // 分
    averageRework: number;
    totalDuration: number; // 分
  };
  aiNotUsed: {
    count: number;
    averageDuration: number; // 分
    averageRework: number;
    totalDuration: number; // 分
  };
}

/**
 * カテゴリ別統計
 */
export interface CategoryStats {
  category: string;
  count: number;
  totalDuration: number; // 分
  aiUsageRate: number; // パーセント
}

/**
 * 日別統計（時系列用）
 */
export interface DailyStats {
  date: string; // YYYY-MM-DD
  taskCount: number;
  aiUsageRate: number; // パーセント
  averageDuration: number; // 分
  totalDuration: number; // 分
}

/**
 * 期間範囲
 */
export type DateRange = 'today' | 'week' | 'month' | 'all';

/**
 * ROI評価ラベル
 */
export type RoiLabel = 'Excellent' | 'Good' | 'Fair' | 'N/A';

/**
 * ROIサマリー
 */
export interface RoiSummary {
  weeklyAiUsageRate: number; // 今週のAI活用率 (0-100%)
  estimatedTimeSaved: number; // 推定時間削減 (分)
  mostEffectiveCategory: string | null; // AI活用率が最も高いカテゴリ
  roiScore: number; // ROIスコア (0-100)
  roiLabel: RoiLabel; // 評価ラベル
  hasEnoughData: boolean; // データ十分性フラグ
}

/**
 * カテゴリ別AI活用統計
 */
export interface CategoryAiUsage {
  category: string;
  aiUsageRate: number; // AI活用率 (0-100%)
  taskCount: number; // タスク数（分配カウント）
  aiTaskCount: number; // AI使用タスク数（分配カウント）
}

/**
 * 全統計データ
 */
export interface Statistics {
  dateRange: DateRange;
  basic: BasicStats;
  aiComparison: AIComparisonStats;
  categories: CategoryStats[];
  daily: DailyStats[];
}
