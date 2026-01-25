import { db } from './db';
import type { Task } from '@/types/task';
import type { PomodoroSession } from '@/types/session';
import type { AppSettings } from '@/types/settings';

export interface ExportData {
  version: string;
  exportedAt: string;
  tasks: Task[];
  sessions: PomodoroSession[];
  settings: AppSettings | null;
}

/**
 * 全データをJSON形式でエクスポート
 */
export async function exportDataAsJSON(): Promise<string> {
  const tasks = await db.tasks.toArray();
  const sessions = await db.sessions.toArray();
  const settings = await db.settings.toArray();

  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    tasks,
    sessions,
    settings: settings[0] || null,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * JSONデータをインポート
 */
export async function importDataFromJSON(jsonString: string): Promise<void> {
  const data: ExportData = JSON.parse(jsonString);

  // バリデーション
  if (!data.version || !data.tasks || !data.sessions) {
    throw new Error('無効なデータ形式です');
  }

  // インポート（既存データは保持、ID重複は上書き）
  await db.tasks.bulkPut(data.tasks);
  await db.sessions.bulkPut(data.sessions);
  if (data.settings) {
    await db.settings.put(data.settings);
  }
}

/**
 * データをダウンロード
 */
export async function downloadData(filename: string = 'insightlog-backup.json'): Promise<void> {
  const jsonString = await exportDataAsJSON();
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
