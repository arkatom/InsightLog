import { Modal } from '@/components/ui/Modal';
import { TaskItem } from './TaskItem';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'sonner';

interface TaskListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskList({ isOpen, onClose }: TaskListProps) {
  const { tasks, deleteTask } = useTasks();

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      toast.success('タスクを削除しました');
    } catch {
      toast.error('タスクの削除に失敗しました');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="タスク一覧">
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-primary-400">
          <p>まだタスクが記録されていません</p>
        </div>
      ) : (
        <div>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </Modal>
  );
}
