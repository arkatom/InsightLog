import { Sparkles, ExternalLink, Trash2, TrendingDown } from 'lucide-react';
import type { Task } from '@/types/task';
import { Badge } from '@/components/ui/Badge';
import { formatMinutes } from '@/lib/time';

interface TaskItemProps {
  task: Task;
  onDelete?: (id: string) => void;
}

function calcReductionPercent(task: Task): number | null {
  if (!task.aiUsed || !task.timeMinutesNoAi || task.timeMinutesNoAi <= 0) return null;
  return Math.round((1 - task.duration / task.timeMinutesNoAi) * 100);
}

export function TaskItem({ task, onDelete }: TaskItemProps) {
  const reduction = calcReductionPercent(task);

  return (
    <div className="p-4 bg-primary-50 rounded-lg mb-3 hover:bg-primary-100 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <span className="font-medium text-primary-800">{task.name}</span>
          {task.taskUrl && (
            <a
              href={task.taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 hover:underline"
            >
              <ExternalLink size={12} />
              リンク
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-sm text-primary-400">{formatMinutes(task.duration)}</span>
          {reduction !== null && (
            <span
              className={`text-xs font-medium flex items-center gap-0.5 ${
                reduction > 0 ? 'text-success-600' : 'text-warning-600'
              }`}
              title={`AI未使用時 ${task.timeMinutesNoAi}分 → ${task.duration}分`}
            >
              <TrendingDown size={12} />
              {reduction > 0 ? `-${reduction}%` : `+${Math.abs(reduction)}%`}
            </span>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-primary-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="削除"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-2 flex-wrap">
        {task.category.map((cat) => (
          <Badge key={cat} variant="default">
            {cat}
          </Badge>
        ))}
        {task.aiUsed && task.aiToolsUsed.length > 0 ? (
          task.aiToolsUsed.map((tool) => (
            <Badge key={tool} variant="accent" className="flex items-center gap-1">
              <Sparkles size={10} /> {tool}
            </Badge>
          ))
        ) : task.aiUsed ? (
          <Badge variant="accent" className="flex items-center gap-1">
            <Sparkles size={10} /> AI
          </Badge>
        ) : null}
        {task.reworkCount > 0 && (
          <Badge variant="warning">手戻り {task.reworkCount}回</Badge>
        )}
      </div>

      {task.notes && <p className="text-sm text-primary-500 line-clamp-2">{task.notes}</p>}
    </div>
  );
}
