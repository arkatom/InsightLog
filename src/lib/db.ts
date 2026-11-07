import Dexie, { type Table } from 'dexie';
import type { Task } from '@/types/task';
import type { PomodoroSession } from '@/types/session';
import type { AppSettings } from '@/types/settings';

/** autolog インポートで取り込んだ下書きの追跡レコード（重複取り込み防止用） */
export interface ImportedDraft {
  draftKey: string;       // DraftTask.draftKey と同じ
  taskId: string;         // 紐づく Task の id
  importedAt: Date;       // 取り込み実施時刻
  name: string;           // 取り込み時の name（後から探しやすいよう保存）
  repo?: string;
  branch?: string;
  jstDate?: string;
}

/** autolog インポートのソース記憶（前回の events.jsonl を一発で開けるよう FileSystemFileHandle を保存） */
export interface AutologSource {
  id: 'default';                            // シングルトン
  fileHandle?: FileSystemFileHandle;        // File System Access API 対応ブラウザのみ。IDB に構造化複製で保存可
  fileName: string;                         // フォールバック表示用
  lastReadAt: Date;
}

export class InsightLogDatabase extends Dexie {
  tasks!: Table<Task, string>;
  sessions!: Table<PomodoroSession, string>;
  settings!: Table<AppSettings, string>;
  importedDrafts!: Table<ImportedDraft, string>;
  autologSource!: Table<AutologSource, string>;

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

    // バージョン4: reportsテーブル削除
    this.version(4).stores({
      tasks: 'id, name, createdAt, completedAt, aiUsed, *category, *aiToolsUsed',
      sessions: 'id, startedAt, completedAt, type',
      settings: 'id, memberId',
      reports: null
    });

    // バージョン5: aiUsed フィールドを廃止（aiToolsUsed を単一ソースに統一）
    // - tasks スキーマから aiUsed インデックスを除外
    // - 既存レコードから aiUsed プロパティを物理削除
    this.version(5).stores({
      tasks: 'id, name, createdAt, completedAt, *category, *aiToolsUsed',
      sessions: 'id, startedAt, completedAt, type',
      settings: 'id, memberId',
    }).upgrade(async (trans) => {
      const tasks = await trans.table('tasks').toArray();
      for (const task of tasks) {
        if ('aiUsed' in task) {
          const { aiUsed: _aiUsed, ...rest } = task;
          void _aiUsed;
          await trans.table('tasks').put(rest);
        }
      }
    });

    // バージョン6: autolog インポート用 importedDrafts テーブル追加
    // - 取り込み済みの draftKey を保存し、再インポート時の重複を防ぐ
    this.version(6).stores({
      tasks: 'id, name, createdAt, completedAt, *category, *aiToolsUsed',
      sessions: 'id, startedAt, completedAt, type',
      settings: 'id, memberId',
      importedDrafts: 'draftKey, taskId, importedAt, jstDate, branch',
    });

    // バージョン7: autolog ファイル元の記憶（File System Access API の handle 保存）
    this.version(7).stores({
      tasks: 'id, name, createdAt, completedAt, *category, *aiToolsUsed',
      sessions: 'id, startedAt, completedAt, type',
      settings: 'id, memberId',
      importedDrafts: 'draftKey, taskId, importedAt, jstDate, branch',
      autologSource: 'id',
    });
  }
}

export const db = new InsightLogDatabase();
