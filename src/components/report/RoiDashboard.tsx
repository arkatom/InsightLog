import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useRoiDashboard } from '@/hooks/useRoiDashboard';
import { TrendingUp, Clock, Award, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface RoiDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

function KpiCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: typeof TrendingUp;
  title: string;
  value: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="bg-primary-50 rounded-xl p-4 flex items-start gap-3">
      <div className="p-2 bg-primary-100 rounded-lg shrink-0">
        <Icon size={20} className="text-primary-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-primary-400 font-medium">{title}</p>
        <p className="text-xl font-bold text-primary-800 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-primary-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function RoiDashboard({ isOpen, onClose }: RoiDashboardProps) {
  const data = useRoiDashboard();

  const scoreLabelColor: Record<string, string> = {
    Excellent: 'text-green-600',
    Good: 'text-blue-600',
    Fair: 'text-yellow-600',
    'N/A': 'text-primary-400',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI ROI ダッシュボード">
      {!data.hasData ? (
        <div className="text-center py-12">
          <p className="text-primary-400">
            {'まだデータがありません。タスクを記録して始めましょう \uD83D\uDE80'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI カード */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={TrendingUp}
              title="今週のAI活用率"
              value={`${data.aiUsageRate}%`}
            />
            <KpiCard
              icon={Clock}
              title="推定時間削減"
              value={`${data.timeSaved}分`}
              subtitle="今週の合計削減分"
            />
            <KpiCard
              icon={Award}
              title="最も効果的なカテゴリ"
              value={data.mostEffectiveCategory ?? '-'}
            />
            <KpiCard
              icon={Target}
              title="AI ROI スコア"
              value={`${data.roiScore.score}`}
              subtitle={
                <span className={scoreLabelColor[data.roiScore.label]}>
                  {data.roiScore.label}
                </span>
              }
            />
          </div>

          {/* カテゴリ別AI活用率グラフ */}
          {data.categoryData.length > 0 && (
            <div className="bg-primary-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-primary-600 mb-3">
                カテゴリ別 AI 活用率
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.categoryData}>
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'AI活用率']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="rate" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
