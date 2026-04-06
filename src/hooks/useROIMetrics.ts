import { useMemo } from 'react';
import { isThisWeek } from 'date-fns';
import { useTasks } from './useTasks';
import { calculateROIMetrics } from '@/lib/roiCalc';
import type { ROIMetrics } from '@/types/roi';

export function useROIMetrics(): ROIMetrics {
  const { tasks } = useTasks();

  return useMemo(() => {
    const weekTasks = tasks.filter((t) => t.completedAt && isThisWeek(t.completedAt));
    return calculateROIMetrics(weekTasks);
  }, [tasks]);
}
