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
 * ROI スコアラベル
 */
export type RoiScoreLabel = 'Excellent' | 'Good' | 'Fair' | 'N/A';

/**
 * ROI サマリー
 */
export interface RoiSummary {
  aiUsageRate: number; // 今週のAI活用率 (0-100)
  estimatedTimeSaved: number; // 推定時間削減（分）、負値は0にクランプ
  mostEffectiveCategory: string | null; // AI活用率最高のカテゴリ
  roiScore: number; // 0-100 のスコア値
  roiScoreLabel: RoiScoreLabel; // Excellent / Good / Fair / N/A
  timeSavingsRate: number; // 時間短縮割合% (0-100)
  categoryCoverage: number; // AI活用カテゴリ割合% (0-100)
  isEmpty: boolean; // 空状態フラグ
}

/**
 * カテゴリ別AI活用率
 */
export interface CategoryAiUsage {
  category: string;
  aiUsageRate: number; // 0-100
  totalTasks: number;
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
