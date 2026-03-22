import { useMemo } from 'react';
import { useTasks } from './useTasks';
import { calcRoi, type RoiResult } from '@/lib/roiCalc';

/**
 * AI ROI ダッシュボード用のデータを提供するカスタムフック
 */
export function useRoiDashboard(): RoiResult {
  const { tasks } = useTasks();

  return useMemo(() => calcRoi(tasks), [tasks]);
}
