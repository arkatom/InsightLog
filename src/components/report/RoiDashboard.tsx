import { useMemo } from 'react';
import { isThisWeek } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { RoiCategoryChart } from './RoiCategoryChart';
import { useTasks } from '@/hooks/useTasks';
import { calcRoiSummary, calcCategoryAiUsage } from '@/lib/roiCalc';
import type { RoiLabel } from '@/types/statistics';

interface RoiDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

function getRoiLabelColor(label: RoiLabel): string {
  switch (label) {
    case 'Excellent':
      return 'text-green-600 bg-green-50';
    case 'Good':
      return 'text-blue-600 bg-blue-50';
    case 'Fair':
      return 'text-yellow-600 bg-yellow-50';
    case 'N/A':
      return 'text-primary-500 bg-primary-50';
  }
}

export function RoiDashboard({ isOpen, onClose }: RoiDashboardProps) {
  const { tasks } = useTasks();

  const weeklyTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.completedAt) return false;
        return isThisWeek(task.completedAt);
      }),
    [tasks]
  );

  const summary = useMemo(() => calcRoiSummary(weeklyTasks), [weeklyTasks]);
  const categoryUsages = useMemo(() => calcCategoryAiUsage(weeklyTasks), [weeklyTasks]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI ROI ダッシュボード">
      <div className="space-y-4">
        {!summary.hasEnoughData ? (
          <div className="text-center py-12">
            <p className="text-primary-400">
              まだデータがありません。タスクを記録して始めましょう 🚀
            </p>
            <p className="text-xs text-primary-400 mt-2">
              AIを使用したタスクと未使用のタスクが各1件以上、合計5件以上のタスクが必要です
            </p>
          </div>
        ) : (
          <>
            {/* 4カード 2x2 グリッド */}
            <div className="grid grid-cols-2 gap-4">
              {/* 今週のAI活用率 */}
              <div className="bg-primary-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-primary-600 mb-2">今週のAI活用率</h3>
                <div className="text-2xl font-bold text-primary-800">
                  {summary.weeklyAiUsageRate}%
                </div>
                <div className="text-xs text-primary-500 mt-1">
                  {weeklyTasks.length} タスク中
                </div>
              </div>

              {/* 推定時間削減 */}
              <div className="bg-primary-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-primary-600 mb-2">推定時間削減</h3>
                <div className="text-2xl font-bold text-primary-800">
                  {summary.estimatedTimeSaved} 分
                </div>
                <div className="text-xs text-primary-500 mt-1">今週の合計</div>
              </div>

              {/* 最も効果的なカテゴリ */}
              <div className="bg-primary-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-primary-600 mb-2">最も効果的なカテゴリ</h3>
                <div className="text-lg font-bold text-primary-800 truncate">
                  {summary.mostEffectiveCategory ?? '—'}
                </div>
                <div className="text-xs text-primary-500 mt-1">AI活用率が最高</div>
              </div>

              {/* AI ROIスコア */}
              <div className="bg-primary-50 rounded-lg p-4">
                <h3 className="text-xs font-medium text-primary-600 mb-2">AI ROIスコア</h3>
                <div className="text-2xl font-bold text-primary-800">{summary.roiScore}</div>
                <div className="mt-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRoiLabelColor(summary.roiLabel)}`}
                  >
                    {summary.roiLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* カテゴリ別棒グラフ */}
            {categoryUsages.length > 0 && <RoiCategoryChart data={categoryUsages} />}
          </>
        )}
      </div>
    </Modal>
  );
}
