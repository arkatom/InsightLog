export interface Task {
  id: string;                    // UUID
  name: string;                  // タスク名
  category: string[];            // カテゴリ（複数選択可能）
  aiUsed: boolean;               // AI利用フラグ
  duration: number;              // 所要時間（分）
  reworkCount: number;           // 手戻り回数
  notes: string;                 // 振り返りメモ
  createdAt: Date;               // 作成日時
  completedAt: Date;             // 完了日時
}
