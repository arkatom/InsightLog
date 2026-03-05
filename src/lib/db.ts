import Dexie, { type Table } from 'dexie';
import type { Task } from '@/types/task';
import type { PomodoroSession } from '@/types/session';
import type { AppSettings } from '@/types/settings';
import type { Report } from '@/types/report';

export class InsightLogDatabase extends Dexie {
  tasks!: Table<Task, string>;
  sessions!: Table<PomodoroSession, string>;
  settings!: Table<AppSettings, string>;
  reports!: Table<Report, string>;

  constructor() {
    super('InsightLogDB');

    // バージョン1: 初期スキーマ
    this.version(1).stores({
      tasks: 'id, name, createdAt, completedAt, aiUsed, *category',
      sessions: 'id, startedAt, completedAt, type',
      settings: 'id'
    });

    // バージョン2: aiToolsUsed, timeMinutesNoAi, memberId追加
    this.version(2).stores({
      tasks: 'id, name, createdAt, completedAt, aiUsed, *category, *aiToolsUsed',
      sessions: 'id, startedAt, completedAt, type',
      settings: 'id, memberId'
    }).upgrade(async (trans) => {
      // 既存のタスクにデフォルト値を設定
      const tasks = await trans.table('tasks').toArray();
      for (const task of tasks) {
        await trans.table('tasks').update(task.id, {
          aiToolsUsed: task.aiUsed ? ['AI（旧データ）'] : [],
          timeMinutesNoAi: undefined
        });
      }
    });

    // バージョン3: reportsテーブル追加
    this.version(3).stores({
      tasks: 'id, name, createdAt, completedAt, aiUsed, *category, *aiToolsUsed',
      sessions: 'id, startedAt, completedAt, type',
      settings: 'id, memberId',
      reports: 'id, name, uploadedAt'
    });
  }
}

export const db = new InsightLogDatabase();
