import type { Statistics } from '@/types/statistics';
import { formatMinutes } from '@/lib/time';

interface StatsSummaryProps {
  stats: Statistics;
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  const { basic, aiComparison } = stats;

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {/* 基本統計 */}
      <div className="col-span-2 bg-primary-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-primary-600 mb-3">基本統計</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-primary-800">{basic.totalTasks}</div>
            <div className="text-xs text-primary-500">タスク</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-800">{basic.totalSessions}</div>
            <div className="text-xs text-primary-500">セッション</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary-800">
              {formatMinutes(Math.floor(basic.totalFocusTime / 60))}
            </div>
            <div className="text-xs text-primary-500">集中時間</div>
          </div>
        </div>
      </div>

      {/* AI使用統計 */}
      <div className="bg-accent-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-accent-700 mb-2">AI使用</h3>
        <div className="space-y-2">
          <div>
            <div className="text-xl font-bold text-accent-800">{aiComparison.aiUsed.count}</div>
            <div className="text-xs text-accent-600">タスク</div>
          </div>
          <div>
            <div className="text-sm text-primary-700">
              平均 {aiComparison.aiUsed.averageDuration}分
            </div>
            <div className="text-xs text-primary-500">手戻り {aiComparison.aiUsed.averageRework}回</div>
          </div>
        </div>
      </div>

      {/* AI不使用統計 */}
      <div className="bg-primary-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-primary-600 mb-2">AI不使用</h3>
        <div className="space-y-2">
          <div>
            <div className="text-xl font-bold text-primary-800">{aiComparison.aiNotUsed.count}</div>
            <div className="text-xs text-primary-500">タスク</div>
          </div>
          <div>
            <div className="text-sm text-primary-700">
              平均 {aiComparison.aiNotUsed.averageDuration}分
            </div>
            <div className="text-xs text-primary-500">手戻り {aiComparison.aiNotUsed.averageRework}回</div>
          </div>
        </div>
      </div>
    </div>
  );
}
