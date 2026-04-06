export interface Task {
  id: string;                    // UUID
  name: string;                  // タスク名
  taskUrl?: string;              // タスクURL（GitHub Issue, Jiraなど）
  category: string[];            // カテゴリ（複数選択可能）
  // AI 使用判定は isAiUsed(task) ヘルパー（@/lib/task-helpers）経由で行う。
  // 以前は aiUsed: boolean を併せて保持していたが、二重管理によるデータ不整合リスクを解消するため
  // Dexie v5 マイグレーションで削除し、aiToolsUsed を単一ソースとした。
  aiToolsUsed: string[];         // 使用したAIツール（例：["Claude", "Copilot"]、AI未使用なら ["AI未使用"] or []）
  duration: number;              // 所要時間（分）
  timeMinutesNoAi?: number;      // AI未利用時の所要時間（分、参考値）
  reworkCount: number;           // 手戻り回数
  notes: string;                 // 振り返りメモ
  createdAt: Date;               // 作成日時
  completedAt: Date | null;      // 完了日時（未完了の場合はnull）
  isSample?: boolean;            // サンプルデータフラグ
}
