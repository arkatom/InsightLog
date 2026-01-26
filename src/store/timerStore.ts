import { create } from 'zustand';
import type { TimerMode } from '@/constants/timer';
import type { SessionType } from '@/types/session';

interface TimerState {
  // タイマーモード
  mode: TimerMode;
  setMode: (mode: TimerMode) => void;

  // タイマー状態
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;

  // ポモドーロ状態
  currentSessionType: SessionType;
  currentCycle: number;

  // アクション
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: () => void;
  setRemainingSeconds: (seconds: number) => void;
  setCurrentSessionType: (type: SessionType) => void;
  setCurrentCycle: (cycle: number) => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  // 初期状態
  mode: 'pomodoro',
  remainingSeconds: 25 * 60,
  isRunning: false,
  isPaused: false,
  currentSessionType: 'work',
  currentCycle: 1,

  // モード変更
  setMode: (mode) => {
    set({ mode, isRunning: false, isPaused: false });
    // モード変更時にタイマーをリセット
    if (mode === 'pomodoro') {
      set({ remainingSeconds: 25 * 60, currentSessionType: 'work', currentCycle: 1 });
    } else if (mode === 'stopwatch') {
      set({ remainingSeconds: 0 });
    }
  },

  // タイマー開始
  start: () => {
    set({ isRunning: true, isPaused: false });
  },

  // 一時停止
  pause: () => {
    set({ isRunning: false, isPaused: true });
  },

  // 再開
  resume: () => {
    set({ isRunning: true, isPaused: false });
  },

  // リセット
  reset: () => {
    const { mode, currentSessionType } = get();
    set({ isRunning: false, isPaused: false });

    if (mode === 'pomodoro') {
      const duration = currentSessionType === 'work' ? 25 * 60 : 5 * 60;
      set({ remainingSeconds: duration });
    } else if (mode === 'stopwatch') {
      set({ remainingSeconds: 0 });
    }
  },

  // 1秒経過
  tick: () => {
    const { remainingSeconds, mode } = get();

    if (mode === 'stopwatch') {
      // ストップウォッチはカウントアップ
      set({ remainingSeconds: remainingSeconds + 1 });
    } else {
      // その他はカウントダウン
      if (remainingSeconds > 0) {
        set({ remainingSeconds: remainingSeconds - 1 });
      }
    }
  },

  // 残り時間設定
  setRemainingSeconds: (seconds) => {
    set({ remainingSeconds: seconds });
  },

  // セッションタイプ設定
  setCurrentSessionType: (type) => {
    set({ currentSessionType: type });
  },

  // サイクル番号設定
  setCurrentCycle: (cycle) => {
    set({ currentCycle: cycle });
  },
}));
