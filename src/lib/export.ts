import { format } from 'date-fns';
import { db } from './db';
import type { Task } from '@/types/task';
import type { PomodoroSession } from '@/types/session';
import type { AppSettings } from '@/types/settings';
import type { Statistics } from '@/types/statistics';
import { AI_NOT_USED } from '@/constants/aiTools';

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
 * タスクをCSV形式でエクスポート
 */
export async function exportDataAsCSV(): Promise<string> {
  const tasks = await db.tasks.toArray();

  const headers = [
    'ID',
    'タスク名',
    'タスクURL',
    'カテゴリ',
    'AI利用',
    '所要時間（分）',
    '手戻り回数',
    '振り返りメモ',
    '作成日時',
    '完了日時',
  ];

  const rows = tasks.map((task) => [
    task.id,
    task.name,
    task.taskUrl || '',
    task.category.join(', '),
    task.aiUsed ? 'はい' : 'いいえ',
    task.duration.toString(),
    task.reworkCount.toString(),
    task.notes,
    format(task.createdAt, 'yyyy-MM-dd HH:mm:ss'),
    task.completedAt ? format(task.completedAt, 'yyyy-MM-dd HH:mm:ss') : 'N/A',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // カンマや改行を含む場合はダブルクォートで囲む
          if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * 統計サマリーをMarkdown形式でエクスポート
 */
export function exportStatsSummaryAsMarkdown(stats: Statistics): string {
  const now = format(new Date(), 'yyyy-MM-dd HH:mm');

  const dateRangeLabels = {
    today: '今日',
    week: '今週',
    month: '今月',
    all: '全期間',
  };

  let markdown = `# InsightLog 統計レポート

**生成日時**: ${now}
**対象期間**: ${dateRangeLabels[stats.dateRange]}

---

## 基本統計

- **総タスク数**: ${stats.basic.totalTasks}
- **総セッション数**: ${stats.basic.totalSessions}
- **総集中時間**: ${Math.floor(stats.basic.totalFocusTime / 3600)}時間${Math.floor((stats.basic.totalFocusTime % 3600) / 60)}分

---

## AI使用比較

### AI使用

- **タスク数**: ${stats.aiComparison.aiUsed.count}
- **平均所要時間**: ${stats.aiComparison.aiUsed.averageDuration}分
- **平均手戻り回数**: ${stats.aiComparison.aiUsed.averageRework}回
- **総所要時間**: ${stats.aiComparison.aiUsed.totalDuration}分

### AI不使用

- **タスク数**: ${stats.aiComparison.aiNotUsed.count}
- **平均所要時間**: ${stats.aiComparison.aiNotUsed.averageDuration}分
- **平均手戻り回数**: ${stats.aiComparison.aiNotUsed.averageRework}回
- **総所要時間**: ${stats.aiComparison.aiNotUsed.totalDuration}分

---

## カテゴリ別統計

| カテゴリ | タスク数 | 総所要時間 | AI利用率 |
|---------|---------|-----------|---------|
`;

  stats.categories.forEach((cat) => {
    markdown += `| ${cat.category} | ${cat.count} | ${cat.totalDuration}分 | ${cat.aiUsageRate}% |\n`;
  });

  if (stats.daily.length > 0) {
    markdown += `
---

## 日別推移

| 日付 | タスク数 | AI利用率 | 平均所要時間 | 総所要時間 |
|------|---------|---------|------------|-----------|
`;

    stats.daily.forEach((day) => {
      const dateStr = format(new Date(day.date), 'MM/dd');
      markdown += `| ${dateStr} | ${day.taskCount} | ${day.aiUsageRate}% | ${day.averageDuration}分 | ${day.totalDuration}分 |\n`;
    });
  }

  markdown += `
---

生成元: InsightLog
`;

  return markdown;
}

/**
 * JSONデータをインポート
 */
export async function importDataFromJSON(jsonString: string): Promise<void> {
  let data: ExportData;

  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('無効なJSON形式です');
  }

  // バリデーション
  if (!data.version) {
    throw new Error('バージョン情報が見つかりません');
  }

  if (!Array.isArray(data.tasks)) {
    throw new Error('タスクデータが無効です');
  }

  if (!Array.isArray(data.sessions)) {
    throw new Error('セッションデータが無効です');
  }

  // Date型への変換
  const tasksWithDates = data.tasks.map((task) => ({
    ...task,
    createdAt: new Date(task.createdAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
  }));

  const sessionsWithDates = data.sessions.map((session) => ({
    ...session,
    startedAt: new Date(session.startedAt),
    completedAt: session.completedAt ? new Date(session.completedAt) : null,
  }));

  const settingsWithDates = data.settings
    ? {
        ...data.settings,
        lastBackupDate: data.settings.lastBackupDate
          ? new Date(data.settings.lastBackupDate)
          : null,
      }
    : null;

  // インポート（既存データは保持、ID重複は上書き）
  await db.tasks.bulkPut(tasksWithDates);
  await db.sessions.bulkPut(sessionsWithDates);
  if (settingsWithDates) {
    await db.settings.put(settingsWithDates);
  }
}

/**
 * 全データを削除
 */
export async function deleteAllData(): Promise<void> {
  await db.tasks.clear();
  await db.sessions.clear();
  await db.settings.clear();
}

/**
 * JSONデータをダウンロード
 */
export async function downloadJSON(filename: string = 'insightlog-backup.json'): Promise<void> {
  const jsonString = await exportDataAsJSON();
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * CSVデータをダウンロード
 */
export async function downloadCSV(filename: string = 'insightlog-tasks.csv'): Promise<void> {
  const csvString = await exportDataAsCSV();
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Markdown統計サマリーをダウンロード
 */
export function downloadMarkdownSummary(
  stats: Statistics,
  filename: string = 'insightlog-report.md'
): void {
  const markdown = exportStatsSummaryAsMarkdown(stats);
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Dateをローカルタイムゾーンオフセット付きISO形式でフォーマット
 * 例: 2026-01-09T06:07:32.886+09:00
 */
function formatLocalISO(date: Date): string {
  const offset = -date.getTimezoneOffset(); // JST=+540, UTC=0, EST=-300
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const minutes = String(absOffset % 60).padStart(2, '0');
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS") + `${sign}${hours}:${minutes}`;
}

/**
 * タスクをKPIダッシュボード形式のCSVでエクスポート
 */
export async function exportDataAsKPICSV(): Promise<string> {
  const tasks = await db.tasks.toArray();
  const settings = await db.settings.toArray();
  const memberId = settings[0]?.memberId || 'unknown';

  // KPIダッシュボード形式のヘッダー
  const headers = [
    'log_id',
    'timestamp',
    'date',
    'member_id',
    'task_name',
    'ai_used',
    'time_minutes',
    'ai_tools_used',
    'project_id',
    'phase',
    'time_minutes_no_ai',
    'outcome_quality',
    'notes',
    'created_by',
    'updated_at',
  ];

  const rows = tasks.map((task) => {
    // ai_usedの判定（aiToolsUsedが空配列またはAI未使用のみの場合はfalse）
    const aiUsed =
      task.aiToolsUsed.length > 0 && !task.aiToolsUsed.includes(AI_NOT_USED);

    // AI_NOT_USEDを除外してカンマ区切り文字列にする
    const aiToolsStr = aiUsed
      ? task.aiToolsUsed.filter((tool) => tool !== AI_NOT_USED).join(',')
      : '';

    const logDate = task.completedAt ?? task.createdAt;
    return [
      task.id, // log_id
      formatLocalISO(logDate), // timestamp
      format(logDate, 'yyyy-MM-dd'), // date
      memberId, // member_id
      task.name, // task_name
      aiUsed.toString(), // ai_used
      task.duration.toString(), // time_minutes
      aiToolsStr, // ai_tools_used
      task.taskUrl || '', // project_id
      task.category[0] || '', // phase（最初のカテゴリ）
      task.timeMinutesNoAi?.toString() || '', // time_minutes_no_ai
      '', // outcome_quality（InsightLogにはない）
      task.notes, // notes
      'manual_input', // created_by
      '', // updated_at
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // カンマや改行を含む場合はダブルクォートで囲む
          if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * KPI形式CSVデータをダウンロード
 */
export async function downloadKPICSV(filename: string = 'logs.csv'): Promise<void> {
  const csvString = await exportDataAsKPICSV();
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
