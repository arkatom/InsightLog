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
 * AIツール別統計
 */
export interface AIToolStats {
  tool: string;
  count: number;
  averageDuration: number; // 分
  totalDuration: number; // 分
}

/**
 * 期間範囲
 */
export type DateRange = 'today' | 'week' | 'month' | 'all';

/**
 * 全統計データ
 */
export interface Statistics {
  dateRange: DateRange;
  basic: BasicStats;
  aiComparison: AIComparisonStats;
  categories: CategoryStats[];
  daily: DailyStats[];
  aiToolBreakdown: AIToolStats[];
}
