import Dexie, { type Table } from 'dexie';
import type { Task } from '@/types/task';
import type { PomodoroSession } from '@/types/session';
import type { AppSettings } from '@/types/settings';

export class InsightLogDatabase extends Dexie {
  tasks!: Table<Task, string>;
  sessions!: Table<PomodoroSession, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('InsightLogDB');

    // バージョン1: 初期スキーマ
    this.version(1).stores({
      tasks: 'id, name, createdAt, completedAt, aiUsed, *category',
      sessions: 'id, startedAt, completedAt, type',
      settings: 'id'
    });
  }
}

export const db = new InsightLogDatabase();
