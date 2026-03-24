import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { CategoryStats } from '@/types/statistics';

interface CategoryChartProps {
  data: CategoryStats[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function CategoryChart({ data }: CategoryChartProps) {
  const chartData = data.map((cat) => ({
    name: cat.category,
    value: cat.totalDuration,
    aiUsageRate: cat.aiUsageRate,
  }));

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-sm font-medium text-primary-700 mb-4">カテゴリ別所要時間</h3>
      {chartData.length === 0 ? (
        <div className="text-center py-8 text-primary-400">
          <p>データがありません</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => {
                const percent = entry.percent || 0;
                return `${entry.name} ${(percent * 100).toFixed(0)}%`;
              }}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                if (value === undefined || value === null) return ['0分', '所要時間'];
                return [`${value}分`, '所要時間'];
              }}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
