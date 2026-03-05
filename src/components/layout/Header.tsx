import { List, BarChart3, Settings, FileText } from 'lucide-react';

interface HeaderProps {
  onTaskListClick?: () => void;
  onStatsClick?: () => void;
  onSettingsClick?: () => void;
  onReportClick?: () => void;
}

export function Header({ onTaskListClick, onStatsClick, onSettingsClick, onReportClick }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-xl font-bold text-primary-800">InsightLog</h1>
      <div className="flex gap-2">
        <button
          onClick={onTaskListClick}
          className="p-2 bg-white rounded-lg shadow-sm hover:bg-primary-50 transition-colors"
        >
          <List size={20} className="text-primary-600" />
        </button>
        <button
          onClick={onStatsClick}
          className="p-2 bg-white rounded-lg shadow-sm hover:bg-primary-50 transition-colors"
        >
          <BarChart3 size={20} className="text-primary-600" />
        </button>
        <button
          onClick={onReportClick}
          className="p-2 bg-white rounded-lg shadow-sm hover:bg-primary-50 transition-colors"
        >
          <FileText size={20} className="text-primary-600" />
        </button>
        <button
          onClick={onSettingsClick}
          className="p-2 bg-white rounded-lg shadow-sm hover:bg-primary-50 transition-colors"
        >
          <Settings size={20} className="text-primary-600" />
        </button>
      </div>
    </div>
  );
}
