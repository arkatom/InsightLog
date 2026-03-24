import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { CategoryAiUsage } from '@/types/statistics';

interface RoiCategoryChartProps {
  data: CategoryAiUsage[];
}

export function RoiCategoryChart({ data }: RoiCategoryChartProps) {
  const chartData = data.map((item) => ({
    category: item.category,
    'AI活用率(%)': item.aiUsageRate,
  }));

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-sm font-medium text-primary-700 mb-4">カテゴリ別AI活用率</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value) => [`${value}%`, 'AI活用率']}
          />
          <Bar dataKey="AI活用率(%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
