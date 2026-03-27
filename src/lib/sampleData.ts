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

// 2ヶ月分のサンプルタスク（約90件）
// ストーリー: AI導入前(1週目) → Claude試用開始(2週目) → Claudeメイン運用(3週目〜)
const SAMPLE_TASKS: Omit<Task, 'id'>[] = [
  // ═══ 第1週（60〜54日前）: AI導入前 — 全て手作業 ═══════════════════════════
  makeTask('プロジェクト初期設計', ['設計'], false, [], 120, undefined, 2,
    'ホワイトボードで議論、要件定義に時間がかかった', 60, 9),
  makeTask('DB設計（ER図作成）', ['設計'], false, [], 90, undefined, 1,
    '', 60, 14),

  makeTask('認証基盤の実装（JWT）', ['実装'], false, [], 180, undefined, 4,
    'トークンリフレッシュの実装でハマった', 59, 9),

  makeTask('ユーザーCRUD API実装', ['実装'], false, [], 95, undefined, 2,
    'バリデーションが複雑', 58, 10),
  makeTask('API設計書ドラフト', ['ドキュメント'], false, [], 70, undefined, 0,
    '', 58, 15),

  makeTask('フロントエンド初期セットアップ', ['実装'], false, [], 60, undefined, 1,
    'Vite + React + TypeScript', 57, 10),

  makeTask('ログイン画面の実装', ['実装'], false, [], 85, undefined, 3,
    'フォームバリデーションで何度もやり直し', 56, 9),
  makeTask('コードレビュー: API設計', ['レビュー'], false, [], 45, undefined, 0,
    '', 56, 14),

  // ═══ 第2週（53〜47日前）: Claude試用開始 — 恐る恐る使い始める ═══════════
  makeTask('メール送信機能の実装', ['実装'], false, [], 75, undefined, 2,
    'SMTPの設定に手間取った', 53, 10),
  makeTask('パスワードリセット機能', ['実装'], true, ['Claude'], 50, 80, 1,
    'Claudeにフロー設計を相談。まだ半信半疑', 53, 14),

  makeTask('単体テスト: 認証モジュール', ['実装'], false, [], 90, undefined, 2,
    'モックの書き方に迷った', 52, 9),
  makeTask('Docker環境構築', ['設計'], true, ['Claude'], 40, 70, 0,
    'docker-compose.ymlをClaudeに生成してもらった。かなり良い', 52, 14),

  makeTask('CI/CD初期構築（GitHub Actions）', ['設計'], true, ['Claude'], 45, 90, 1,
    'ClaudeのYAMLをベースに微調整', 51, 10),

  makeTask('エラーハンドリング設計', ['設計'], false, [], 65, undefined, 1,
    '', 50, 10),
  makeTask('ロギング基盤の実装', ['実装'], true, ['Claude'], 40, 80, 0,
    'Claudeにベストプラクティスを聞いて設計', 50, 14),

  makeTask('管理画面テーブルコンポーネント', ['実装'], false, [], 100, undefined, 3,
    'ソート・ページネーションの実装が複雑', 49, 9),

  makeTask('技術選定ドキュメント', ['ドキュメント'], true, ['Claude'], 25, 60, 0,
    'Claudeに比較表を作らせた。かなり的確', 48, 10),

  // ═══ 第3週（46〜40日前）: Claudeメイン化 — 設計・レビューで頼りに ═══════
  makeTask('検索機能の実装（全文検索）', ['実装'], true, ['Claude'], 40, 90, 0,
    'Claudeに設計案を出してもらい、そのまま実装', 46, 9),
  makeTask('フィルタリングUI実装', ['実装'], true, ['Claude'], 35, 65, 0,
    '', 46, 14),

  makeTask('バグ修正: セッション切れエラー', ['実装'], true, ['Claude'], 25, 70, 0,
    'Claudeにスタックトレース共有→5分で原因特定', 45, 10),

  makeTask('通知機能の設計', ['設計'], true, ['Claude'], 30, 60, 0,
    'WebSocket vs SSEの比較をClaudeに聞いた', 44, 10),
  makeTask('通知機能のバックエンド実装', ['実装'], true, ['Claude'], 35, 80, 1,
    '', 44, 14),

  makeTask('レスポンシブ対応（モバイル）', ['実装'], false, [], 85, undefined, 3,
    'ブレークポイントの調整、手作業のほうが早かった', 43, 9),

  makeTask('ダッシュボードレイアウト実装', ['実装'], true, ['Claude'], 30, 75, 0,
    'グリッドレイアウトの設計をClaudeに相談', 42, 10),
  makeTask('APIドキュメント更新', ['ドキュメント'], true, ['Claude'], 20, 50, 0,
    'Claudeがコードから仕様書を自動生成', 42, 15),

  makeTask('週次進捗レポート作成', ['ドキュメント'], true, ['Claude'], 15, 45, 0,
    '', 41, 16),

  // ═══ 第4週（39〜33日前）: Claudeで設計・レビューが高速化 ═══════════════
  makeTask('マイクロサービス分割設計', ['設計'], true, ['Claude'], 35, 90, 0,
    'Claudeに設計案のレビュー依頼。盲点を3つ指摘してくれた', 39, 9),
  makeTask('API Gateway設計', ['設計'], true, ['Claude'], 30, 70, 0,
    'ルーティング設計をClaudeと壁打ち', 39, 14),

  makeTask('決済モジュール実装', ['実装'], true, ['Claude'], 55, 110, 1,
    'Stripe APIの使い方をClaudeに聞きながら実装', 38, 9),

  makeTask('決済フロー単体テスト', ['実装'], true, ['Claude'], 30, 70, 0,
    'テストケースをClaudeに列挙させてそのまま実装', 37, 10),
  makeTask('PRレビュー: 決済モジュール', ['レビュー'], true, ['Claude'], 20, 50, 0,
    'セキュリティ観点のチェックをClaudeに依頼', 37, 14),

  makeTask('バグ修正: 金額計算の丸め誤差', ['実装'], true, ['Claude'], 15, 55, 0,
    'Claudeにエッジケース列挙→即修正', 36, 10),

  makeTask('インフラ構成図の作成', ['ドキュメント'], true, ['Claude'], 20, 50, 0,
    'Mermaid記法でClaudeが生成', 35, 10),
  makeTask('負荷テスト設計', ['調査'], true, ['Claude'], 25, 60, 0,
    'テストシナリオをClaudeと設計', 35, 14),

  makeTask('データマイグレーション設計', ['設計'], true, ['Claude'], 25, 65, 0,
    'スキーマ変更の影響範囲をClaudeに分析させた', 34, 10),

  // ═══ 第5週（32〜26日前）: Claudeがデフォルトの作業ツールに ══════════════
  makeTask('GraphQL スキーマ設計', ['設計'], true, ['Claude'], 30, 75, 0,
    'Claudeにスキーマの一貫性チェック', 32, 9),
  makeTask('GraphQL リゾルバ実装', ['実装'], true, ['Claude'], 35, 80, 0,
    'N+1対策もClaudeが提案してくれた', 32, 14),

  makeTask('キャッシュ戦略の設計（Redis）', ['設計'], true, ['Claude'], 22, 55, 0,
    'TTL設計をClaudeと議論', 31, 10),
  makeTask('キャッシュ層の実装', ['実装'], true, ['Claude'], 28, 60, 0,
    '', 31, 14),

  makeTask('ファイルアップロード機能', ['実装'], true, ['Claude'], 30, 70, 0,
    'S3署名URL方式をClaudeが提案', 30, 9),
  makeTask('画像リサイズ処理（Lambda）', ['実装'], true, ['ChatGPT'], 40, 65, 1,
    'たまたまChatGPTで調べた。Sharpの設定例が出てきた', 30, 14),

  makeTask('E2Eテスト基盤構築（Playwright）', ['実装'], true, ['Claude'], 25, 65, 0,
    'Playwright設定とヘルパーをClaudeが生成', 29, 10),

  makeTask('バグ修正: ファイルアップロード進捗表示', ['実装'], true, ['Claude'], 12, 40, 0,
    'ログ共有→即原因特定', 28, 10),
  makeTask('PRレビュー: キャッシュ実装', ['レビュー'], true, ['Claude'], 18, 40, 0,
    '', 28, 14),

  makeTask('権限管理（RBAC）設計', ['設計'], true, ['Claude'], 25, 65, 0,
    'ロール・パーミッションモデルをClaudeと設計', 27, 10),
  makeTask('権限ミドルウェア実装', ['実装'], true, ['Claude'], 22, 50, 0,
    '', 27, 14),

  // ═══ 第6週（25〜19日前）: 高速回転 ══════════════════════════════════════
  makeTask('監視ダッシュボード設計（Grafana）', ['設計'], true, ['Claude'], 22, 55, 0,
    'アラート条件をClaudeと検討', 25, 9),
  makeTask('メトリクス収集実装', ['実装'], true, ['Claude'], 25, 60, 0,
    'OpenTelemetry設定をClaudeに相談', 25, 14),

  makeTask('バッチ処理実装（日次集計）', ['実装'], true, ['Claude'], 22, 55, 0,
    'SQLクエリの最適化をClaudeに依頼', 24, 10),
  makeTask('バッチ処理の単体テスト', ['実装'], true, ['Claude'], 15, 40, 0,
    '', 24, 14),

  makeTask('多言語対応（i18n）基盤', ['実装'], true, ['Claude'], 22, 60, 0,
    'i18n設計パターンをClaudeに相談', 23, 9),
  makeTask('日本語・英語翻訳ファイル作成', ['ドキュメント'], true, ['Claude'], 18, 50, 0,
    '', 23, 14),

  makeTask('パフォーマンスチューニング（DB）', ['調査'], true, ['Claude'], 25, 70, 0,
    'EXPLAIN結果をClaudeに分析させてインデックス追加', 22, 10),

  makeTask('WebSocket実装（リアルタイム通知）', ['実装'], true, ['Claude'], 30, 70, 0,
    'アーキテクチャ設計から実装までClaude', 21, 9),
  makeTask('Copilotでの接続テスト', ['実装'], true, ['Copilot'], 12, 35, 0,
    'ちょっとCopilotも試してみた', 21, 14),

  makeTask('セキュリティ監査チェックリスト', ['レビュー'], true, ['Claude'], 18, 50, 0,
    'OWASPトップ10ベースでClaudeがチェック', 20, 10),

  // ═══ 第7週（18〜12日前）: 習熟期 ════════════════════════════════════════
  makeTask('新メンバーオンボーディング資料', ['ドキュメント'], true, ['Claude'], 18, 50, 0,
    'Claudeでドラフト→チームレビュー', 18, 10),
  makeTask('コーディング規約ドキュメント', ['ドキュメント'], true, ['Claude'], 12, 40, 0,
    '既存コードからClaudeにパターン抽出', 18, 14),

  makeTask('A/Bテスト基盤の実装', ['実装'], true, ['Claude'], 25, 65, 0,
    'フィーチャーフラグ設計はClaude', 17, 9),
  makeTask('分析イベント送信実装', ['実装'], true, ['Claude'], 18, 40, 0,
    '', 17, 14),

  makeTask('バグ修正: WebSocket再接続', ['実装'], true, ['Claude'], 12, 45, 0,
    '再接続ロジックをClaudeが提案→即修正', 16, 10),

  makeTask('マイグレーションスクリプト作成', ['実装'], true, ['Claude'], 18, 50, 0,
    'ゼロダウンタイムマイグレーション', 15, 10),
  makeTask('ステージング環境の確認', ['調査'], false, [], 25, undefined, 0,
    '手動で確認', 15, 14),

  makeTask('PRレビュー: A/Bテスト実装', ['レビュー'], true, ['Claude'], 15, 35, 0,
    '', 14, 10),
  makeTask('E2Eテスト: 決済フロー', ['実装'], true, ['Claude'], 20, 55, 0,
    'テストシナリオ列挙→そのまま実装', 14, 14),

  makeTask('レート制限実装（API）', ['実装'], true, ['Claude'], 18, 50, 0,
    'スライディングウィンドウ方式をClaudeが提案', 13, 10),

  // ═══ 第8週（11〜0日前）: 完全に自然な道具として定着 ════════════════════
  makeTask('ダッシュボードUI刷新', ['実装'], true, ['Claude'], 22, 70, 0,
    'CSS変数設計もClaudeに任せた', 11, 9),
  makeTask('チャート実装（Recharts）', ['実装'], true, ['ChatGPT'], 25, 45, 0,
    'Rechartsの細かいAPI仕様はChatGPTのほうが詳しかった', 11, 14),

  makeTask('アクセシビリティ対応（ARIA）', ['実装'], true, ['Claude'], 20, 55, 0,
    'ARIA属性の追加箇所をClaudeが特定', 10, 10),
  makeTask('Lighthouse最適化', ['調査'], true, ['Claude'], 18, 45, 0,
    'レポート結果共有→改善策をClaude提案', 10, 14),

  makeTask('PWA対応（Service Worker設定）', ['実装'], true, ['Claude'], 18, 50, 0,
    'キャッシュ戦略をClaudeに相談', 9, 10),
  makeTask('オフライン対応テスト', ['実装'], true, ['Claude'], 12, 35, 0,
    '', 9, 14),

  makeTask('バグ修正: Safari互換性', ['実装'], true, ['Claude'], 10, 40, 0,
    'エラーログ共有→ポリフィル即提案', 8, 10),

  makeTask('データエクスポート機能（CSV/JSON）', ['実装'], true, ['Claude'], 20, 60, 0,
    '', 7, 10),
  makeTask('インポート機能とバリデーション', ['実装'], true, ['Claude'], 18, 50, 0,
    '', 7, 14),

  makeTask('リリース前セキュリティレビュー', ['レビュー'], true, ['Claude'], 18, 50, 0,
    'OWASP準拠チェック', 6, 10),
  makeTask('パフォーマンス回帰テスト', ['調査'], true, ['Claude'], 15, 40, 0,
    '', 6, 14),

  makeTask('リリースノート v1.0', ['ドキュメント'], true, ['Claude'], 10, 35, 0,
    'ドラフト→軽く編集', 5, 10),
  makeTask('ユーザーガイド作成', ['ドキュメント'], true, ['Claude'], 18, 55, 0,
    '', 5, 14),

  makeTask('ホットフィックス: メール送信遅延', ['実装'], true, ['Claude'], 10, 30, 0,
    'キューの設定ミスを即特定', 4, 10),
  makeTask('PRレビュー: エクスポート機能', ['レビュー'], true, ['Claude'], 12, 30, 0,
    '', 4, 14),

  makeTask('統計ダッシュボード改善', ['実装'], true, ['Claude'], 20, 50, 0,
    'ROI計算ロジックをClaudeに設計依頼', 3, 9),
  makeTask('E2Eテスト: エクスポートフロー', ['実装'], true, ['Claude'], 15, 40, 0,
    '', 3, 14),

  makeTask('パフォーマンス最適化（Memoization）', ['実装'], true, ['Claude'], 15, 45, 0,
    'useMemoの適切な使い所をClaudeが指摘', 2, 10),
  makeTask('コードレビュー: 統計モジュール', ['レビュー'], true, ['Claude'], 12, 30, 0,
    '', 2, 14),

  makeTask('本番デプロイ準備', ['調査'], true, ['Claude'], 12, 35, 0,
    'チェックリストをClaudeに生成', 1, 10),
  makeTask('最終スモークテスト', ['調査'], false, [], 20, undefined, 0,
    '手動確認', 1, 14),

  makeTask('v1.0 リリース作業', ['実装'], true, ['Claude'], 15, 40, 0,
    '', 0, 10),
  makeTask('リリース後モニタリング', ['調査'], true, ['Claude'], 10, 25, 0,
    'アラート条件をClaudeと最終確認', 0, 14),
];

// タスクが存在する日を自動抽出
function getWorkDays(): number[] {
  const daySet = new Set<number>();
  for (const task of SAMPLE_TASKS) {
    const daysAgo = Math.round(
      (Date.now() - (task.completedAt ?? task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    daySet.add(daysAgo);
  }
  return Array.from(daySet).sort((a, b) => b - a);
}

function makeSessions(): Omit<PomodoroSession, 'id'>[] {
  const sessions: Omit<PomodoroSession, 'id'>[] = [];
  const workDays = getWorkDays();
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
  const tasks: Task[] = SAMPLE_TASKS.map((t) => ({ ...t, id: crypto.randomUUID(), isSample: true }));
  const sessions: PomodoroSession[] = makeSessions().map((s) => ({ ...s, id: crypto.randomUUID(), isSample: true }));

  await db.tasks.bulkAdd(tasks);
  await db.sessions.bulkAdd(sessions);
}

/**
 * サンプルデータのみを削除
 */
export async function deleteSampleData(): Promise<{ tasks: number; sessions: number }> {
  const sampleTasks = await db.tasks.filter((t) => t.isSample === true).toArray();
  const sampleSessions = await db.sessions.filter((s) => s.isSample === true).toArray();

  const taskIds = sampleTasks.map((t) => t.id);
  const sessionIds = sampleSessions.map((s) => s.id);

  await db.tasks.bulkDelete(taskIds);
  await db.sessions.bulkDelete(sessionIds);

  return { tasks: taskIds.length, sessions: sessionIds.length };
}

/**
 * サンプルデータが存在するかチェック
 */
export async function hasSampleData(): Promise<boolean> {
  const count = await db.tasks.filter((t) => t.isSample === true).count();
  return count > 0;
}
