import { List, BarChart3, Settings, Upload } from 'lucide-react';
import type { ComponentType } from 'react';

interface HeaderProps {
  onTaskListClick?: () => void;
  onStatsClick?: () => void;
  onSettingsClick?: () => void;
  onImportClick?: () => void;
}

interface IconButtonProps {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
}

function IconButton({ label, icon: Icon, onClick }: IconButtonProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="p-2 bg-white rounded-lg shadow-sm hover:bg-primary-50 transition-colors"
      >
        <Icon size={20} className="text-primary-600" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 mt-1 px-2 py-1 rounded-md bg-primary-800 text-white text-xs whitespace-nowrap shadow-md opacity-0 translate-y-[-2px] transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 z-10"
      >
        {label}
      </span>
    </div>
  );
}

export function Header({
  onTaskListClick,
  onStatsClick,
  onSettingsClick,
  onImportClick,
}: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-xl font-bold text-primary-800">InsightLog</h1>
      <div className="flex gap-2">
        <IconButton label="autolog インポート" icon={Upload} onClick={onImportClick} />
        <IconButton label="タスク一覧" icon={List} onClick={onTaskListClick} />
        <IconButton label="統計" icon={BarChart3} onClick={onStatsClick} />
        <IconButton label="設定" icon={Settings} onClick={onSettingsClick} />
      </div>
    </div>
  );
}
