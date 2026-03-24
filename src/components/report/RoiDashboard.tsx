import { X } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRoiData } from '@/hooks/useRoiData';
import type { RoiLabel } from '@/lib/roiCalc';

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
    default:
      return 'text-primary-400 bg-primary-50';
  }
}

export function RoiDashboard({ isOpen, onClose }: RoiDashboardProps) {
  const roi = useRoiData();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden fade-in">
        {/* ヘッダー */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-lg">AI ROI ダッシュボード</h2>
          <button onClick={onClose} className="hover:bg-primary-100 rounded p-1 transition-colors">
            <X size={24} className="text-primary-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 overflow-y-auto max-h-[75vh]">
          {!roi.hasEnoughData ? (
            <div className="text-center py-16 text-primary-400">
              <p className="text-base">
                まだデータがありません。タスクを記録して始めましょう 🚀
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 4カード */}
              <div className="grid grid-cols-2 gap-3">
                {/* 今週のAI活用率 */}
                <div className="bg-accent-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-accent-600 mb-1">今週のAI活用率</div>
                  <div className="text-3xl font-bold text-accent-800">{roi.aiUsageRate}%</div>
                </div>

                {/* 推定時間削減 */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-primary-600 mb-1">推定時間削減</div>
                  <div className="text-3xl font-bold text-primary-800">
                    {roi.estimatedTimeSaved}
                    <span className="text-sm font-normal ml-1">分</span>
                  </div>
                </div>

                {/* 最も効果的なカテゴリ */}
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="text-xs font-medium text-primary-600 mb-1">
                    最も効果的なカテゴリ
                  </div>
                  <div className="text-lg font-bold text-primary-800 truncate">
                    {roi.topCategory ?? '—'}
                  </div>
                </div>

                {/* AI ROI スコア */}
                <div className="bg-white border border-primary-100 rounded-xl p-4">
                  <div className="text-xs font-medium text-primary-600 mb-1">AI ROI スコア</div>
                  <div className="text-3xl font-bold text-primary-800">{roi.roiScore}</div>
                  <span
                    className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${getRoiLabelColor(roi.roiLabel)}`}
                  >
                    {roi.roiLabel}
                  </span>
                </div>
              </div>

              {/* カテゴリ別 AI 活用率棒グラフ */}
              {roi.categoryBreakdown.length > 0 && (
                <div className="bg-white border border-primary-100 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-primary-700 mb-3">
                    カテゴリ別 AI 活用率
                  </h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={roi.categoryBreakdown}
                      margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'AI活用率']}
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="aiUsageRate" name="AI活用率" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
