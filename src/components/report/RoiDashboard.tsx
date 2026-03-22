import { X, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStatistics } from '@/hooks/useStatistics';
import { calcRoiSummary, calcCategoryAiUsage } from '@/lib/roiCalc';
import type { RoiScoreLabel } from '@/types/statistics';

interface RoiDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

function scoreLabelColor(label: RoiScoreLabel): string {
  switch (label) {
    case 'Excellent':
      return 'text-green-600';
    case 'Good':
      return 'text-blue-600';
    case 'Fair':
      return 'text-yellow-600';
    default:
      return 'text-primary-400';
  }
}

function scoreBadgeStyle(label: RoiScoreLabel): string {
  switch (label) {
    case 'Excellent':
      return 'bg-green-100 text-green-700';
    case 'Good':
      return 'bg-blue-100 text-blue-700';
    case 'Fair':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-primary-100 text-primary-500';
  }
}

export function RoiDashboard({ isOpen, onClose }: RoiDashboardProps) {
  const stats = useStatistics('week');
  const roi = calcRoiSummary(stats.aiComparison, stats.categories);
  const categoryUsage = calcCategoryAiUsage(stats.categories);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden fade-in">
        {/* ヘッダー */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-600" />
            <h2 className="font-bold text-lg">AI ROI ダッシュボード</h2>
          </div>
          <button onClick={onClose} className="hover:bg-primary-100 rounded p-1 transition-colors">
            <X size={24} className="text-primary-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          {roi.isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-primary-400">
              <TrendingUp size={40} className="mb-3 opacity-40" />
              <p className="text-center text-sm">
                まだデータがありません。タスクを記録して始めましょう 🚀
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 4カード */}
              <div className="grid grid-cols-2 gap-3">
                {/* 今週のAI活用率 */}
                <div className="bg-accent-50 rounded-xl p-4">
                  <p className="text-xs text-accent-600 mb-1">今週のAI活用率</p>
                  <p className="text-3xl font-bold text-accent-800">{roi.aiUsageRate}%</p>
                </div>

                {/* 推定時間削減 */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <p className="text-xs text-primary-600 mb-1">推定時間削減</p>
                  <p className="text-3xl font-bold text-primary-800">{roi.estimatedTimeSaved}</p>
                  <p className="text-xs text-primary-500">分</p>
                </div>

                {/* 最も効果的なカテゴリ */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <p className="text-xs text-primary-600 mb-1">最も効果的なカテゴリ</p>
                  <p className="text-base font-bold text-primary-800 truncate">
                    {roi.mostEffectiveCategory ?? '—'}
                  </p>
                </div>

                {/* AI ROI スコア */}
                <div className="bg-white border border-primary-100 rounded-xl p-4">
                  <p className="text-xs text-primary-600 mb-1">AI ROI スコア</p>
                  <p className={`text-3xl font-bold ${scoreLabelColor(roi.roiScoreLabel)}`}>
                    {roi.roiScore}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${scoreBadgeStyle(roi.roiScoreLabel)}`}
                  >
                    {roi.roiScoreLabel}
                  </span>
                </div>
              </div>

              {/* カテゴリ別AI活用率グラフ */}
              {categoryUsage.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-primary-100">
                  <h3 className="text-sm font-medium text-primary-700 mb-4">
                    カテゴリ別AI活用率
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={categoryUsage}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip
                        formatter={(value) => [
                          typeof value === 'number' ? `${value}%` : '0%',
                          'AI活用率',
                        ]}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="aiUsageRate" fill="#3b82f6" radius={[4, 4, 0, 0]} name="AI活用率" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
