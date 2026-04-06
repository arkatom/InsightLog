export type ROILabel = 'Excellent' | 'Good' | 'Fair' | 'N/A';

export interface ROIMetrics {
  hasData: boolean;
  aiUsageRatePercent: number;
  estimatedTimeSavedMinutes: number;
  mostEffectiveCategory: string | null;
  roiScore: number;
  roiLabel: ROILabel;
  categoryUsage: CategoryAIUsage[];
}

export interface CategoryAIUsage {
  category: string;
  aiUsageRate: number;
  totalCount: number;
  aiCount: number;
}
