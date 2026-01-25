import type { TimerMode } from '@/constants/timer';
import type { SessionType } from '@/types/session';

/**
 * タイマー状態（localStorage保存用）
 */
export interface TimerStateStorage {
  mode: TimerMode;
  remainingSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  currentSessionType: SessionType;
  currentCycle: number;
  savedAt: number; // Date.now()
}

const TIMER_STATE_KEY = 'insightlog-timer-state';

/**
 * タイマー状態をlocalStorageに保存
 */
export function saveTimerState(state: Omit<TimerStateStorage, 'savedAt'>): void {
  const stateWithTimestamp: TimerStateStorage = {
    ...state,
    savedAt: Date.now(),
  };
  localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(stateWithTimestamp));
}

/**
 * タイマー状態をlocalStorageから復元
 */
export function loadTimerState(): TimerStateStorage | null {
  const stored = localStorage.getItem(TIMER_STATE_KEY);
  if (!stored) return null;

  try {
    const state: TimerStateStorage = JSON.parse(stored);

    // タイマーが実行中だった場合、経過時間を考慮
    if (state.isRunning || state.isPaused) {
      const elapsedSeconds = Math.floor((Date.now() - state.savedAt) / 1000);

      // ストップウォッチの場合はカウントアップ
      if (state.mode === 'stopwatch') {
        state.remainingSeconds += elapsedSeconds;
      } else {
        // その他はカウントダウン
        state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsedSeconds);
      }
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * タイマー状態をクリア
 */
export function clearTimerState(): void {
  localStorage.removeItem(TIMER_STATE_KEY);
}
