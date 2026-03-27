import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatsSummary } from './StatsSummary';
import { ComparisonChart } from './ComparisonChart';
import { CategoryChart } from './CategoryChart';
import { TimelineChart } from './TimelineChart';
import { useStatistics } from '@/hooks/useStatistics';
import { downloadKPICSV } from '@/lib/export';
import { seedSampleData, deleteSampleData, hasSampleData } from '@/lib/sampleData';
import { toast } from 'sonner';
import type { DateRange } from '@/types/statistics';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [excludeSample, setExcludeSample] = useState(false);
  const [sampleDataExists, setSampleDataExists] = useState(false);
  const stats = useStatistics(dateRange, excludeSample);

  useEffect(() => {
    hasSampleData().then(setSampleDataExists);
  }, []);

  const dateRanges: { value: DateRange; label: string }[] = [
    { value: 'today', label: '今日' },
    { value: 'week', label: '今週' },
    { value: 'month', label: '今月' },
    { value: 'all', label: '全期間' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="統計・分析">
      <div className="space-y-4">
        {/* 期間選択 */}
        <div className="flex gap-2">
          {dateRanges.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                dateRange === value
                  ? 'bg-primary-800 text-white'
                  : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 統計サマリー */}
        <StatsSummary stats={stats} />

        {/* KPI形式CSVエクスポートボタン */}
        {stats.basic.totalTasks > 0 && (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await downloadKPICSV();
                  toast.success('KPI形式CSVをダウンロードしました');
                } catch (error) {
                  toast.error('エクスポートに失敗しました');
                  console.error(error);
                }
              }}
            >
              KPI形式でエクスポート
            </Button>
          </div>
        )}

        {/* AI比較グラフ */}
        {stats.basic.totalTasks > 0 && <ComparisonChart data={stats.aiComparison} />}

        {/* カテゴリ別グラフ */}
        {stats.categories.length > 0 && <CategoryChart data={stats.categories} />}

        {/* AIツール別統計 */}
        {stats.aiToolBreakdown.length > 0 && (
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-sm font-medium text-primary-700 mb-3">AIツール別統計</h3>
            <div className="space-y-2">
              {stats.aiToolBreakdown.map((tool) => (
                <div key={tool.tool} className="flex items-center justify-between p-2 bg-primary-50 rounded-lg">
                  <span className="text-sm font-medium text-primary-800">{tool.tool}</span>
                  <div className="flex gap-4 text-xs text-primary-500">
                    <span>{tool.count}件</span>
                    <span>平均{tool.averageDuration}分</span>
                    <span>計{tool.totalDuration}分</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 時系列グラフ */}
        {stats.daily.length > 0 && dateRange !== 'all' && <TimelineChart data={stats.daily} />}

        {/* サンプルデータ除外トグル */}
        {sampleDataExists && stats.basic.totalTasks > 0 && (
          <div className="flex items-center justify-between bg-primary-50 rounded-lg p-3">
            <span className="text-xs text-primary-600">サンプルデータを除外</span>
            <input
              type="checkbox"
              checked={excludeSample}
              onChange={(e) => setExcludeSample(e.target.checked)}
              className="w-4 h-4 rounded text-accent-500"
            />
          </div>
        )}

        {/* データなしメッセージ */}
        {stats.basic.totalTasks === 0 && (
          <div className="text-center py-12">
            <p className="text-primary-400">この期間にはタスクが記録されていません</p>
            <p className="text-xs text-primary-400 mt-2 mb-6">タスクを記録すると、統計が表示されます</p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await seedSampleData();
                  setSampleDataExists(true);
                  toast.success('サンプルデータを読み込みました（約90件）');
                }}
              >
                サンプルデータで試す
              </Button>
              {sampleDataExists && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-warning-600 hover:bg-warning-100"
                  onClick={async () => {
                    const result = await deleteSampleData();
                    setSampleDataExists(false);
                    setExcludeSample(false);
                    toast.success(`サンプルデータを削除しました（${result.tasks}件）`);
                  }}
                >
                  サンプルを削除
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
