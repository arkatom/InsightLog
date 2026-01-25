import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AIComparisonStats } from '@/types/statistics';

interface ComparisonChartProps {
  data: AIComparisonStats;
}

export function ComparisonChart({ data }: ComparisonChartProps) {
  const chartData = [
    {
      metric: '平均所要時間',
      'AI使用': data.aiUsed.averageDuration,
      'AI不使用': data.aiNotUsed.averageDuration,
    },
    {
      metric: '平均手戻り回数',
      'AI使用': data.aiUsed.averageRework,
      'AI不使用': data.aiNotUsed.averageRework,
    },
    {
      metric: 'タスク完了数',
      'AI使用': data.aiUsed.count,
      'AI不使用': data.aiNotUsed.count,
    },
  ];

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-sm font-medium text-primary-700 mb-4">AI使用/不使用の比較</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="AI使用" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="AI不使用" fill="#9ca3af" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
