import { useMemo } from 'react';
import { useTasks } from './useTasks';
import { calcRoi } from '@/lib/roiCalc';
import type { RoiResult } from '@/lib/roiCalc';

/**
 * 今週の ROI データを計算して返すカスタムフック
 */
export function useRoiData(): RoiResult {
  const { tasks } = useTasks();

  const roiResult = useMemo(() => calcRoi(tasks), [tasks]);

  return roiResult;
}
