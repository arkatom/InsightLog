import { subDays, setHours, setMinutes } from 'date-fns';
import { db } from './db';
import type { Task } from '@/types/task';
import type { PomodoroSession } from '@/types/session';

function makeDate(daysAgo: number, hour: number, min = 0): Date {
  return setMinutes(setHours(subDays(new Date(), daysAgo), hour), min);
}

function makeTask(
  name: string,
  category: string[],
  aiUsed: boolean,
  aiToolsUsed: string[],
  duration: number,
  timeMinutesNoAi: number | undefined,
  reworkCount: number,
  notes: string,
  daysAgo: number,
  hour: number
): Omit<Task, 'id'> {
  const d = makeDate(daysAgo, hour);
  return { name, category, aiUsed, aiToolsUsed, duration, timeMinutesNoAi, reworkCount, notes, createdAt: d, completedAt: d };
}

// 2週間分のサンプルタスク（32件）
// ストーリー: AI使用で平均27分 vs 非AI平均72分（63%削減）、手戻り回数も大幅減
const SAMPLE_TASKS: Omit<Task, 'id'>[] = [
  // ─── 14日前 ───────────────────────────────────────────────────────────
  makeTask('ユーザー認証フローのリファクタリング', ['実装'], false, [], 95, undefined, 3,
    '型エラーで何度もやり直し', 14, 10),
  makeTask('APIエラーハンドリング実装', ['実装'], false, [], 72, undefined, 2,
    '', 14, 14),
  makeTask('DBスキーマ設計（ユーザーテーブル拡張）', ['設計'], true, ['ChatGPT'], 45, 80, 1,
    'ChatGPTでスキーマ案を生成してレビュー', 14, 16),

  // ─── 13日前 ───────────────────────────────────────────────────────────
  makeTask('フロントエンドバリデーション実装', ['実装'], false, [], 80, undefined, 3,
    '正規表現が複雑で時間がかかった', 13, 10),
  makeTask('コンポーネントテスト作成', ['実装'], true, ['Copilot'], 35, 60, 0,
    'Copilotでテストケース自動生成、軽く修正するだけ', 13, 14),

  // ─── 12日前 ───────────────────────────────────────────────────────────
  makeTask('パフォーマンスボトルネック調査', ['調査'], false, [], 90, undefined, 1,
    '', 12, 9),
  makeTask('React Query移行調査・PoC', ['調査'], true, ['Claude'], 40, 90, 0,
    'Claudeに移行手順を確認。実装コードも生成してもらった', 12, 11),
  makeTask('API仕様書の更新', ['ドキュメント'], true, ['Claude'], 20, 55, 0,
    'Claudeがコードからドキュメント生成。確認して修正だけ', 12, 15),

  // ─── 11日前 ───────────────────────────────────────────────────────────
  makeTask('技術負債リストの整理', ['ドキュメント'], false, [], 60, undefined, 0,
    '', 11, 10),

  // ─── 9日前 ────────────────────────────────────────────────────────────
  makeTask('ダッシュボードUI実装', ['実装'], false, [], 110, undefined, 4,
    'レイアウト崩れで何度もやり直し', 9, 9),
  makeTask('検索フィルターコンポーネント実装', ['実装'], true, ['Claude', 'Copilot'], 28, 75, 0,
    'ClaudeでUI設計相談→Copilotで実装。ほぼそのまま動いた', 9, 13),
  makeTask('PRレビュー: 決済モジュール', ['レビュー'], true, ['Claude'], 25, 50, 0,
    'Claudeにセキュリティ観点のチェックを依頼', 9, 15),

  // ─── 8日前 ────────────────────────────────────────────────────────────
  makeTask('バグ修正: データ取得タイムアウト', ['実装'], false, [], 65, undefined, 2,
    '原因特定に時間かかった', 8, 10),
  makeTask('バグ修正: モバイルレイアウト崩れ', ['実装'], true, ['Claude'], 22, 50, 0,
    'Claudeにエラーログ共有→即解決', 8, 14),

  // ─── 7日前 ────────────────────────────────────────────────────────────
  makeTask('アーキテクチャ設計レビュー', ['設計'], true, ['Claude'], 35, 70, 0,
    "ClaudeにDevil's Advocate役をやってもらった", 7, 10),
  makeTask('単体テスト追加（useStatistics）', ['実装'], true, ['Copilot'], 18, 40, 0,
    '', 7, 13),
  makeTask('TypeScript型定義の整理', ['実装'], false, [], 50, undefined, 1,
    '', 7, 15),

  // ─── 6日前 ────────────────────────────────────────────────────────────
  makeTask('CI/CDパイプライン設定', ['設計'], true, ['Claude'], 30, 65, 0,
    'GitHub Actions設定をClaudeに生成してもらった', 6, 10),
  makeTask('エラーバウンダリ実装', ['実装'], false, [], 45, undefined, 1,
    '', 6, 14),

  // ─── 5日前 ────────────────────────────────────────────────────────────
  makeTask('ユーザビリティレビュー（UXチェック）', ['レビュー'], true, ['Claude'], 20, 45, 0,
    'ClaudeにUX観点でレビュー依頼', 5, 9),
  makeTask('ページネーション実装', ['実装'], true, ['Claude'], 25, 60, 0,
    'コード生成→そのまま組み込み', 5, 13),
  makeTask('リリースノート作成', ['ドキュメント'], true, ['Claude'], 15, 40, 0,
    'Claudeでドラフト生成→軽く編集', 5, 16),

  // ─── 4日前 ────────────────────────────────────────────────────────────
  makeTask('通知機能バグ修正', ['実装'], false, [], 70, undefined, 3,
    'ブラウザ互換性の問題、解決に時間がかかった', 4, 10),
  makeTask('アクセシビリティ対応（ARIA属性）', ['実装'], true, ['Claude'], 25, 55, 0,
    'ClaudeでARIA属性の追加箇所を特定してもらった', 4, 14),

  // ─── 3日前 ────────────────────────────────────────────────────────────
  makeTask('ストレステスト設計・実施', ['調査'], true, ['Claude'], 35, 70, 0,
    'テストシナリオをClaudeと一緒に設計', 3, 9),
  makeTask('PRレビュー: ダッシュボード機能', ['レビュー'], true, ['Claude'], 20, 40, 0,
    '', 3, 14),
  makeTask('データエクスポート機能実装', ['実装'], false, [], 80, undefined, 2,
    'CSVフォーマットの仕様で迷った', 3, 16),

  // ─── 2日前 ────────────────────────────────────────────────────────────
  makeTask('E2Eテスト作成（Playwright）', ['実装'], true, ['Claude'], 30, 75, 0,
    'Claudeがテストコードを生成。セレクタ調整だけ', 2, 10),
  makeTask('セキュリティ設計レビュー', ['設計'], true, ['Claude'], 25, 60, 0,
    'OWASPチェックをClaudeに依頼', 2, 14),

  // ─── 昨日 ─────────────────────────────────────────────────────────────
  makeTask('ダークモード実装', ['実装'], true, ['Claude', 'Copilot'], 28, 70, 0,
    'CSS変数の設計はClaude、実装はCopilot補完', 1, 10),
  makeTask('ユニットテスト追加（統計計算）', ['実装'], false, [], 45, undefined, 1,
    '', 1, 14),

  // ─── 今日 ─────────────────────────────────────────────────────────────
  makeTask('パフォーマンス最適化（Memoization）', ['実装'], true, ['Claude'], 22, 50, 0,
    'useMemoの適切な使い所をClaudeが指摘', 0, 10),
  makeTask('コードレビュー: PWA設定', ['レビュー'], true, ['Claude'], 18, 35, 0,
    '', 0, 13),
];

function makeSessions(): Omit<PomodoroSession, 'id'>[] {
  const sessions: Omit<PomodoroSession, 'id'>[] = [];
  const workDays = [14, 13, 12, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
  const startHours = [9, 10, 11, 14, 15];

  for (const daysAgo of workDays) {
    startHours.forEach((hour, i) => {
      const start = makeDate(daysAgo, hour);
      sessions.push({
        type: 'work',
        plannedDuration: 25 * 60,
        actualDuration: 25 * 60,
        startedAt: start,
        completedAt: new Date(start.getTime() + 25 * 60 * 1000),
        interrupted: false,
        cycleNumber: (i % 4) + 1,
      });
    });
  }
  return sessions;
}

export async function seedSampleData(): Promise<void> {
  const tasks: Task[] = SAMPLE_TASKS.map((t) => ({ ...t, id: crypto.randomUUID() }));
  const sessions: PomodoroSession[] = makeSessions().map((s) => ({ ...s, id: crypto.randomUUID() }));

  await db.tasks.bulkAdd(tasks);
  await db.sessions.bulkAdd(sessions);
}
