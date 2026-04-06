import { AI_NOT_USED } from '@/constants/aiTools';
import type { Task } from '@/types/task';

/**
 * タスクが実質的に AI を使用したかを判定する。
 *
 * `aiToolsUsed` に「AI未使用」以外のツールが1つでも含まれていれば true、
 * 空配列または「AI未使用」のみの場合は false。
 *
 * この関数は `task.aiUsed` フィールド（v4 までの旧フィールド）の置き換え用。
 * 単一ソースを `aiToolsUsed` に統一することで、二重管理によるデータ不整合リスクを解消する。
 */
export function isAiUsed(task: Pick<Task, 'aiToolsUsed'>): boolean {
  return task.aiToolsUsed.some((tool) => tool !== AI_NOT_USED);
}
