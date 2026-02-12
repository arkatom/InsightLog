export interface Task {
  id: string;                    // UUID
  name: string;                  // タスク名
  taskUrl?: string;              // タスクURL（GitHub Issue, Jiraなど）
  category: string[];            // カテゴリ（複数選択可能）
  aiUsed: boolean;               // AI利用フラグ（後方互換性のため残す）
  aiToolsUsed: string[];         // 使用したAIツール（例：["Claude", "Copilot"]、空配列 = AI未使用）
  duration: number;              // 所要時間（分）
  timeMinutesNoAi?: number;      // AI未利用時の所要時間（分、参考値）
  reworkCount: number;           // 手戻り回数
  notes: string;                 // 振り返りメモ
  createdAt: Date;               // 作成日時
  completedAt: Date;             // 完了日時
}
