import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ImportedDraft } from '@/lib/db';
import type { DraftTask } from '@/types/import';

/**
 * autolog インポートで取り込み済みの draftKey を追跡するフック。
 * 同じ events.jsonl を再インポートしても重複が作られないようにする。
 */
export function useImportedDrafts() {
  const imported = useLiveQuery(() => db.importedDrafts.toArray());

  /** 取り込み済み draftKey のセット（O(1) ルックアップ用） */
  const importedKeys = new Set((imported ?? []).map((r) => r.draftKey));

  /** 取り込み実施を記録する */
  const recordImport = async (draft: DraftTask, taskId: string): Promise<void> => {
    const record: ImportedDraft = {
      draftKey: draft.draftKey,
      taskId,
      importedAt: new Date(),
      name: draft.name,
      repo: draft.meta.repo,
      branch: draft.meta.branch,
      jstDate: draft.meta.jstDate,
    };
    await db.importedDrafts.put(record);
  };

  /** taskId に紐づく取り込み記録を削除（タスク削除時のカスケード用） */
  const removeByTaskId = async (taskId: string): Promise<void> => {
    await db.importedDrafts.where('taskId').equals(taskId).delete();
  };

  return {
    imported: imported ?? [],
    importedKeys,
    recordImport,
    removeByTaskId,
  };
}
