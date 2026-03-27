import { create } from 'zustand';
import type { TimerMode } from '@/constants/timer';
import type { SessionType } from '@/types/session';
import {
  DEFAULT_POMODORO_DURATION,
  DEFAULT_SHORT_BREAK_DURATION,
  DEFAULT_LONG_BREAK_DURATION,
} from '@/constants/timer';

interface TimerState {
  // タイマーモード
  mode: TimerMode;
  setMode: (mode: TimerMode, durationMinutes?: number) => void;

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
  reset: (durationMinutes?: number) => void;
  tick: () => void;
  setRemainingSeconds: (seconds: number) => void;
  setCurrentSessionType: (type: SessionType) => void;
  setCurrentCycle: (cycle: number) => void;
}

/**
 * セッションタイプに応じたデフォルト秒数を返す
 */
function getDefaultDuration(sessionType: SessionType): number {
  switch (sessionType) {
    case 'work':
      return DEFAULT_POMODORO_DURATION * 60;
    case 'shortBreak':
      return DEFAULT_SHORT_BREAK_DURATION * 60;
    case 'longBreak':
      return DEFAULT_LONG_BREAK_DURATION * 60;
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  // 初期状態
  mode: 'pomodoro',
  remainingSeconds: DEFAULT_POMODORO_DURATION * 60,
  isRunning: false,
  isPaused: false,
  currentSessionType: 'work',
  currentCycle: 1,

  // モード変更（durationMinutesで設定値を受け取れる）
  setMode: (mode, durationMinutes) => {
    set({ mode, isRunning: false, isPaused: false });
    if (mode === 'pomodoro') {
      const seconds = (durationMinutes ?? DEFAULT_POMODORO_DURATION) * 60;
      set({ remainingSeconds: seconds, currentSessionType: 'work', currentCycle: 1 });
    } else if (mode === 'free') {
      const seconds = (durationMinutes ?? DEFAULT_POMODORO_DURATION) * 60;
      set({ remainingSeconds: seconds });
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

  // リセット（durationMinutesでユーザー設定値を受け取れる）
  reset: (durationMinutes) => {
    const { mode, currentSessionType } = get();
    set({ isRunning: false, isPaused: false });

    if (mode === 'pomodoro') {
      const seconds = durationMinutes
        ? durationMinutes * 60
        : getDefaultDuration(currentSessionType);
      set({ remainingSeconds: seconds });
    } else if (mode === 'free') {
      const seconds = (durationMinutes ?? DEFAULT_POMODORO_DURATION) * 60;
      set({ remainingSeconds: seconds });
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
      // ポモドーロ・フリーはカウントダウン
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
