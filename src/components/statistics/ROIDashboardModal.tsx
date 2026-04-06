import { Modal } from '@/components/ui/Modal';
import { useROIMetrics } from '@/hooks/useROIMetrics';
import { ROISummaryCards } from './ROISummaryCards';
import { ROICategoryChart } from './ROICategoryChart';

interface ROIDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ROIDashboardModal({ isOpen, onClose }: ROIDashboardModalProps) {
  const metrics = useROIMetrics();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI活用ROIダッシュボード">
      {metrics.hasData ? (
        <div className="space-y-4">
          <p className="text-xs text-primary-400">対象期間: 今週</p>
          <ROISummaryCards metrics={metrics} />
          <ROICategoryChart data={metrics.categoryUsage} />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-primary-400">まだデータがありません。タスクを記録して始めましょう 🚀</p>
        </div>
      )}
    </Modal>
  );
}
