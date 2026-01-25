export interface TimerSettings {
  pomodoroDuration: number;      // ポモドーロ時間（分）
  shortBreakDuration: number;    // 短い休憩時間（分）
  longBreakDuration: number;     // 長い休憩時間（分）
  cyclesUntilLongBreak: number;  // 長い休憩までのサイクル数
  autoStartBreaks: boolean;      // 休憩の自動開始
  autoStartPomodoros: boolean;   // 作業の自動開始
}

export interface NotificationSettings {
  soundEnabled: boolean;         // 音声通知
  soundVolume: number;           // 音量（0-1）
  browserNotificationEnabled: boolean; // ブラウザ通知
  vibrationEnabled: boolean;     // バイブレーション
}

export interface AppSettings {
  id?: string;                   // IndexedDB用のID（通常は'app-settings'固定）
  timer: TimerSettings;
  notification: NotificationSettings;
  customCategories: string[];    // ユーザー定義カテゴリ
  onboardingCompleted: boolean;  // オンボーディング完了フラグ
  lastBackupDate: Date | null;   // 最終バックアップ日
}

export const DEFAULT_SETTINGS: AppSettings = {
  timer: {
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    cyclesUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false
  },
  notification: {
    soundEnabled: true,
    soundVolume: 0.5,
    browserNotificationEnabled: false,
    vibrationEnabled: false
  },
  customCategories: [],
  onboardingCompleted: false,
  lastBackupDate: null
};
