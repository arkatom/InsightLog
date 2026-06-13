import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TaskItem } from './TaskItem';
import { TaskForm } from './TaskForm';
import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@/types/task';
import { toast } from 'sonner';

interface TaskListProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskList({ isOpen, onClose }: TaskListProps) {
  const { tasks, deleteTask } = useTasks();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      toast.success('タスクを削除しました');
    } catch {
      toast.error('タスクの削除に失敗しました');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleEditDone = () => {
    setEditingTask(null);
  };

  const handleCloseModal = () => {
    // 編集中はリストに戻すだけ
    if (editingTask) {
      setEditingTask(null);
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title={editingTask ? 'タスクを編集' : 'タスク一覧'}
    >
      {editingTask ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleEditDone}
            className="text-sm text-primary-500 hover:text-primary-800 flex items-center gap-1"
          >
            <ArrowLeft size={14} /> 一覧に戻る
          </button>
          <TaskForm initialTask={editingTask} onSaved={handleEditDone} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-primary-400">
          <p>まだタスクが記録されていません</p>
        </div>
      ) : (
        <div>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
        </div>
      )}
    </Modal>
  );
}
