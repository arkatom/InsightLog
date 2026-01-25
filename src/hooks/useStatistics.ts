import { useMemo } from 'react';
import {
  isToday,
  isThisWeek,
  isThisMonth,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
} from 'date-fns';
import { useTasks } from './useTasks';
import { useSessions } from './useSessions';
import type {
  Statistics,
  DateRange,
  BasicStats,
  AIComparisonStats,
  CategoryStats,
  DailyStats,
} from '@/types/statistics';

/**
 * 統計データを計算するカスタムフック
 */
export function useStatistics(dateRange: DateRange = 'today') {
  const { tasks } = useTasks();
  const { sessions } = useSessions();

  const statistics = useMemo<Statistics>(() => {
    // 期間でフィルタ
    const filteredTasks = tasks.filter((task) => {
      const taskDate = task.completedAt;
      switch (dateRange) {
        case 'today':
          return isToday(taskDate);
        case 'week':
          return isThisWeek(taskDate);
        case 'month':
          return isThisMonth(taskDate);
        case 'all':
          return true;
        default:
          return false;
      }
    });

    const filteredSessions = sessions.filter((session) => {
      const sessionDate = session.startedAt;
      switch (dateRange) {
        case 'today':
          return isToday(sessionDate);
        case 'week':
          return isThisWeek(sessionDate);
        case 'month':
          return isThisMonth(sessionDate);
        case 'all':
          return true;
        default:
          return false;
      }
    });

    // 基本統計
    const basic: BasicStats = {
      totalTasks: filteredTasks.length,
      totalSessions: filteredSessions.filter(
        (s) => s.type === 'work' && s.completedAt && !s.interrupted
      ).length,
      totalFocusTime: filteredSessions
        .filter((s) => s.type === 'work' && s.completedAt && !s.interrupted)
        .reduce((sum, s) => sum + s.actualDuration, 0),
    };

    // AI比較統計
    const aiTasks = filteredTasks.filter((t) => t.aiUsed);
    const nonAiTasks = filteredTasks.filter((t) => !t.aiUsed);

    const average = (arr: number[]) => {
      if (arr.length === 0) return 0;
      return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    };

    const aiComparison: AIComparisonStats = {
      aiUsed: {
        count: aiTasks.length,
        averageDuration: Math.round(average(aiTasks.map((t) => t.duration))),
        averageRework: Math.round(average(aiTasks.map((t) => t.reworkCount)) * 10) / 10,
        totalDuration: aiTasks.reduce((sum, t) => sum + t.duration, 0),
      },
      aiNotUsed: {
        count: nonAiTasks.length,
        averageDuration: Math.round(average(nonAiTasks.map((t) => t.duration))),
        averageRework: Math.round(average(nonAiTasks.map((t) => t.reworkCount)) * 10) / 10,
        totalDuration: nonAiTasks.reduce((sum, t) => sum + t.duration, 0),
      },
    };

    // カテゴリ別統計
    const categoryMap = new Map<string, { count: number; duration: number; aiCount: number }>();

    filteredTasks.forEach((task) => {
      task.category.forEach((cat) => {
        const current = categoryMap.get(cat) || { count: 0, duration: 0, aiCount: 0 };
        categoryMap.set(cat, {
          count: current.count + 1,
          duration: current.duration + task.duration,
          aiCount: current.aiCount + (task.aiUsed ? 1 : 0),
        });
      });
    });

    const categories: CategoryStats[] = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        count: data.count,
        totalDuration: data.duration,
        aiUsageRate: Math.round((data.aiCount / data.count) * 100),
      })
    );

    // 時系列データ
    const daily: DailyStats[] = [];

    if (dateRange !== 'all') {
      let start: Date, end: Date;

      if (dateRange === 'today') {
        start = end = new Date();
      } else if (dateRange === 'week') {
        start = startOfWeek(new Date());
        end = endOfWeek(new Date());
      } else {
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
      }

      const days = eachDayOfInterval({ start, end });

      days.forEach((day) => {
        const dayTasks = filteredTasks.filter((t) => isSameDay(t.completedAt, day));
        const aiDayTasks = dayTasks.filter((t) => t.aiUsed);

        daily.push({
          date: format(day, 'yyyy-MM-dd'),
          taskCount: dayTasks.length,
          aiUsageRate: dayTasks.length > 0 ? Math.round((aiDayTasks.length / dayTasks.length) * 100) : 0,
          averageDuration:
            dayTasks.length > 0
              ? Math.round(average(dayTasks.map((t) => t.duration)))
              : 0,
          totalDuration: dayTasks.reduce((sum, t) => sum + t.duration, 0),
        });
      });
    }

    return {
      dateRange,
      basic,
      aiComparison,
      categories,
      daily,
    };
  }, [tasks, sessions, dateRange]);

  return statistics;
}
