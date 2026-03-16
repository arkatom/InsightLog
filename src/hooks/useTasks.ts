import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { Task } from '@/types/task';

/**
 * タスクのCRUD操作を提供するカスタムフック
 */
export function useTasks() {
  // 全タスクをリアクティブに取得（作成日時の降順）
  const tasks = useLiveQuery(() => db.tasks.orderBy('createdAt').reverse().toArray());

  /**
   * タスクを追加
   */
  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'completedAt'>): Promise<string> => {
    const id = crypto.randomUUID();
    const now = new Date();

    await db.tasks.add({
      ...task,
      id,
      createdAt: now,
      completedAt: now,
    });

    return id;
  };

  /**
   * タスクを更新
   */
  const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
    await db.tasks.update(id, updates);
  };

  /**
   * タスクを削除
   */
  const deleteTask = async (id: string): Promise<void> => {
    await db.tasks.delete(id);
  };

  /**
   * IDでタスクを取得
   */
  const getTaskById = async (id: string): Promise<Task | undefined> => {
    return await db.tasks.get(id);
  };

  /**
   * 日付範囲でタスクを取得（完了済みタスクのみ）
   */
  const getTasksByDateRange = async (startDate: Date, endDate: Date): Promise<Task[]> => {
    return await db.tasks
      .where('completedAt')
      .between(startDate, endDate, true, true)
      .filter(task => task.completedAt !== null)
      .toArray();
  };

  /**
   * AI使用/不使用でフィルタ
   */
  const getTasksByAiUsage = async (aiUsed: boolean): Promise<Task[]> => {
    return await db.tasks.where('aiUsed').equals(aiUsed ? 1 : 0).toArray();
  };

  /**
   * カテゴリでフィルタ
   */
  const getTasksByCategory = async (category: string): Promise<Task[]> => {
    return await db.tasks.where('category').equals(category).toArray();
  };

  return {
    tasks: tasks ?? [],
    addTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByDateRange,
    getTasksByAiUsage,
    getTasksByCategory,
  };
}
