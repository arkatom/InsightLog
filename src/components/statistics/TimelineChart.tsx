import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { DailyStats } from '@/types/statistics';

interface TimelineChartProps {
  data: DailyStats[];
}

export function TimelineChart({ data }: TimelineChartProps) {
  const chartData = data.map((day) => ({
    date: format(parseISO(day.date), 'MM/dd'),
    タスク数: day.taskCount,
    'AI利用率': day.aiUsageRate,
    平均所要時間: day.averageDuration,
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4">
        <h3 className="text-sm font-medium text-primary-700 mb-4">時系列推移</h3>
        <div className="text-center py-8 text-primary-400">
          <p>データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="text-sm font-medium text-primary-700 mb-4">時系列推移</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="タスク数"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="AI利用率"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="平均所要時間"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
