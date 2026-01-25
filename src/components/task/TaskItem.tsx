import { Sparkles } from 'lucide-react';
import type { Task } from '@/types/task';
import { Badge } from '@/components/ui/Badge';
import { formatMinutes } from '@/lib/time';

interface TaskItemProps {
  task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
  return (
    <div className="p-4 bg-primary-50 rounded-lg mb-3 hover:bg-primary-100 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="font-medium text-primary-800">{task.name}</span>
        <span className="text-sm text-primary-400">{formatMinutes(task.duration)}</span>
      </div>

      <div className="flex gap-2 mb-2 flex-wrap">
        {task.category.map((cat) => (
          <Badge key={cat} variant="default">
            {cat}
          </Badge>
        ))}
        {task.aiUsed && (
          <Badge variant="accent" className="flex items-center gap-1">
            <Sparkles size={10} /> AI
          </Badge>
        )}
        {task.reworkCount > 0 && (
          <Badge variant="warning">手戻り {task.reworkCount}回</Badge>
        )}
      </div>

      {task.notes && <p className="text-sm text-primary-500 line-clamp-2">{task.notes}</p>}
    </div>
  );
}
