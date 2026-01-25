export type SessionType = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroSession {
  id: string;                    // UUID
  type: SessionType;             // セッションタイプ
  plannedDuration: number;       // 予定時間（秒）
  actualDuration: number;        // 実際の時間（秒）
  startedAt: Date;               // 開始日時
  completedAt: Date | null;      // 完了日時（null = 未完了）
  interrupted: boolean;          // 途中で中断されたか
  cycleNumber: number;           // サイクル番号
}
