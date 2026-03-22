import { X, TrendingUp, Clock, Tag, Award } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRoiDashboard } from '@/hooks/useRoiDashboard';

interface RoiDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoiDashboard({ isOpen, onClose }: RoiDashboardProps) {
  const roi = useRoiDashboard();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in">
      <div
        role="dialog"
        data-testid="roi-dashboard"
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden fade-in"
      >
        {/* ヘッダー */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-lg text-primary-800">
            AI ROI ダッシュボード
          </h2>
          <button
            onClick={onClose}
            aria-label="close"
            className="hover:bg-primary-100 rounded p-1 transition-colors"
          >
            <X size={24} className="text-primary-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          {!roi.hasEnoughData ? (
            <div className="text-center py-16 text-primary-400">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-base">
                まだデータがありません。タスクを記録して始めましょう
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 4 KPI カード */}
              <div className="grid grid-cols-2 gap-3">
                {/* AI活用率 */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-primary-500" />
                    <span className="text-xs font-medium text-primary-500">
                      今週のAI活用率
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-primary-800">
                    {roi.aiUsageRate}%
                  </div>
                </div>

                {/* 推定時間削減 */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-primary-500" />
                    <span className="text-xs font-medium text-primary-500">
                      推定時間削減
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-primary-800">
                    {roi.estimatedTimeSaved}分
                  </div>
                </div>

                {/* 最も効果的なカテゴリ */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag size={16} className="text-primary-500" />
                    <span className="text-xs font-medium text-primary-500">
                      最も効果的なカテゴリ
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-primary-800">
                    {roi.mostEffectiveCategory ?? '-'}
                  </div>
                </div>

                {/* AI ROI スコア */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award size={16} className="text-primary-500" />
                    <span className="text-xs font-medium text-primary-500">
                      AI ROIスコア
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-primary-800">
                      {roi.roiScore}
                    </span>
                    <span className="text-sm font-medium text-primary-500">
                      {roi.roiLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* カテゴリ別 AI 活用率棒グラフ */}
              {roi.categoryBreakdown.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-primary-600 mb-3">
                    カテゴリ別 AI 活用率
                  </h3>
                  <div className="bg-primary-50 rounded-xl p-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={roi.categoryBreakdown}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="category"
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          tickFormatter={(v: number) => `${v}%`}
                        />
                        <Tooltip
                          formatter={(value) => [`${value}%`, 'AI活用率']}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                          }}
                        />
                        <Bar
                          dataKey="aiRate"
                          fill="#374151"
                          radius={[4, 4, 0, 0]}
                          name="AI活用率"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
