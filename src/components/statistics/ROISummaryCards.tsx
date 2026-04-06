import { Badge } from '@/components/ui/Badge';
import type { ROIMetrics, ROILabel } from '@/types/roi';

interface ROISummaryCardsProps {
  metrics: ROIMetrics;
}

function getRoiBadgeVariant(label: ROILabel): 'success' | 'accent' | 'warning' | 'default' {
  if (label === 'Excellent') return 'success';
  if (label === 'Good') return 'accent';
  if (label === 'Fair') return 'warning';
  return 'default';
}

export function ROISummaryCards({ metrics }: ROISummaryCardsProps) {
  const { aiUsageRatePercent, estimatedTimeSavedMinutes, mostEffectiveCategory, roiScore, roiLabel } =
    metrics;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 今週のAI活用率 */}
      <div className="bg-accent-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-accent-700 mb-2">今週のAI活用率</h3>
        <div className="text-2xl font-bold text-accent-800">{aiUsageRatePercent}%</div>
      </div>

      {/* 推定時間削減 */}
      <div className="bg-success-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-success-700 mb-2">推定時間削減</h3>
        <div className="text-2xl font-bold text-success-800">{estimatedTimeSavedMinutes}分</div>
      </div>

      {/* 最も効果的なカテゴリ */}
      <div className="bg-primary-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-primary-600 mb-2">最も効果的なカテゴリ</h3>
        <div className="text-base font-bold text-primary-800 truncate">
          {mostEffectiveCategory ?? '—'}
        </div>
      </div>

      {/* AI ROI スコア */}
      <div className="bg-accent-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-accent-700 mb-2">AI ROI スコア</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-accent-800">{roiScore}</span>
          <Badge variant={getRoiBadgeVariant(roiLabel)}>{roiLabel}</Badge>
        </div>
      </div>
    </div>
  );
}
