import { useEffect, useRef, useCallback } from 'react';
import { useTimerStore } from '@/store/timerStore';
import { useSettings } from './useSettings';
import { useSessions } from './useSessions';
import type { SessionType } from '@/types/session';
import { audioNotification } from '@/lib/audio';
import { notifyTimerEnd, vibrate } from '@/lib/notification';
import { saveTimerState, loadTimerState, clearTimerState } from '@/lib/storage';

/**
 * タイマーのロジックを提供するカスタムフック
 */
export function useTimer() {
  const {
    mode,
    remainingSeconds,
    isRunning,
    isPaused,
    currentSessionType,
    currentCycle,
    start,
    pause,
    resume,
    reset,
    setRemainingSeconds,
    setCurrentSessionType,
    setCurrentCycle,
  } = useTimerStore();

  const { settings } = useSettings();
  const { addSession, updateSession } = useSessions();

  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const restoredRef = useRef(false);

  /**
   * 現在のセッションタイプに対応する設定上の秒数を返す
   */
  const getDurationForSessionType = useCallback(
    (sessionType: SessionType): number => {
      switch (sessionType) {
        case 'work':
          return settings.timer.pomodoroDuration * 60;
        case 'shortBreak':
          return settings.timer.shortBreakDuration * 60;
        case 'longBreak':
          return settings.timer.longBreakDuration * 60;
      }
    },
    [settings.timer.pomodoroDuration, settings.timer.shortBreakDuration, settings.timer.longBreakDuration]
  );

  /**
   * タイマー状態をlocalStorageから復元（初回のみ）
   */
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const saved = loadTimerState();
    if (!saved) return;

    // 復元された状態を適用
    useTimerStore.setState({
      mode: saved.mode,
      remainingSeconds: saved.remainingSeconds,
      isRunning: false, // 復元後は一時停止状態にする
      isPaused: saved.isRunning || saved.isPaused,
      currentSessionType: saved.currentSessionType,
      currentCycle: saved.currentCycle,
    });
  }, []);

  /**
   * タイマー状態の変更をlocalStorageに保存
   */
  useEffect(() => {
    if (!restoredRef.current) return;

    if (isRunning || isPaused) {
      saveTimerState({
        mode,
        remainingSeconds,
        isRunning,
        isPaused,
        currentSessionType,
        currentCycle,
      });
    } else {
      clearTimerState();
    }
  }, [mode, remainingSeconds, isRunning, isPaused, currentSessionType, currentCycle]);

  /**
   * 次のセッションタイプを取得
   */
  const getNextSessionType = useCallback((): SessionType => {
    if (currentSessionType === 'work') {
      if (currentCycle % settings.timer.cyclesUntilLongBreak === 0) {
        return 'longBreak';
      } else {
        return 'shortBreak';
      }
    } else {
      return 'work';
    }
  }, [currentSessionType, currentCycle, settings.timer.cyclesUntilLongBreak]);

  /**
   * タイマー開始
   */
  const startTimer = useCallback(async () => {
    start();
    startTimeRef.current = Date.now();

    if (mode === 'pomodoro') {
      const plannedDuration = getDurationForSessionType(currentSessionType);

      const id = await addSession({
        type: currentSessionType,
        plannedDuration,
        actualDuration: 0,
        completedAt: null,
        interrupted: false,
        cycleNumber: currentCycle,
      });
      sessionIdRef.current = id;
    }
  }, [mode, currentSessionType, currentCycle, start, addSession, getDurationForSessionType]);

  /**
   * タイマー完了時の処理
   */
  const handleTimerComplete = useCallback(async () => {
    if (sessionIdRef.current && startTimeRef.current) {
      const now = Date.now();
      const actualDuration = Math.floor((now - startTimeRef.current) / 1000);
      await updateSession(sessionIdRef.current, {
        actualDuration,
        completedAt: new Date(now),
        interrupted: false,
      });
      sessionIdRef.current = null;
    }

    // 通知を送信
    if (settings.notification.soundEnabled) {
      audioNotification.playTimerEndSound(settings.notification.soundVolume);
    }

    if (settings.notification.browserNotificationEnabled && mode !== 'stopwatch') {
      notifyTimerEnd(currentSessionType);
    }

    if (settings.notification.vibrationEnabled) {
      vibrate([200, 100, 200]);
    }

    if (mode === 'pomodoro') {
      const nextSessionType = getNextSessionType();
      const nextCycle = nextSessionType === 'work' ? currentCycle + 1 : currentCycle;

      setCurrentSessionType(nextSessionType);
      setCurrentCycle(nextCycle);

      const nextDuration = getDurationForSessionType(nextSessionType);
      setRemainingSeconds(nextDuration);

      const shouldAutoStart =
        (nextSessionType !== 'work' && settings.timer.autoStartBreaks) ||
        (nextSessionType === 'work' && settings.timer.autoStartPomodoros);

      if (shouldAutoStart) {
        start();
        startTimeRef.current = Date.now();
      } else {
        pause();
      }
    } else {
      // フリーモード: 完了したら停止
      pause();
    }
  }, [
    mode,
    currentSessionType,
    currentCycle,
    settings,
    updateSession,
    getNextSessionType,
    getDurationForSessionType,
    setCurrentSessionType,
    setCurrentCycle,
    setRemainingSeconds,
    pause,
    start,
  ]);

  // タイマー終了の検知（tick処理はApp.tsxで一元管理）
  useEffect(() => {
    if (mode !== 'stopwatch' && remainingSeconds === 0 && isRunning) {
      handleTimerComplete();
    }
  }, [remainingSeconds, isRunning, mode, handleTimerComplete]);

  /**
   * タイマー一時停止
   */
  const pauseTimer = () => {
    pause();
  };

  /**
   * タイマー再開
   */
  const resumeTimer = () => {
    resume();
  };

  /**
   * タイマーリセット（設定値を使ってリセット）
   */
  const resetTimer = async () => {
    if (sessionIdRef.current && startTimeRef.current) {
      const now = Date.now();
      const actualDuration = Math.floor((now - startTimeRef.current) / 1000);
      await updateSession(sessionIdRef.current, {
        actualDuration,
        completedAt: new Date(now),
        interrupted: true,
      });
      sessionIdRef.current = null;
    }

    // 現在のセッションタイプに応じた設定値でリセット
    const durationMinutes =
      mode === 'pomodoro'
        ? (currentSessionType === 'work'
            ? settings.timer.pomodoroDuration
            : currentSessionType === 'shortBreak'
            ? settings.timer.shortBreakDuration
            : settings.timer.longBreakDuration)
        : mode === 'free'
        ? settings.timer.pomodoroDuration
        : undefined;

    reset(durationMinutes);
    startTimeRef.current = null;
  };

  return {
    mode,
    remainingSeconds,
    isRunning,
    isPaused,
    currentSessionType,
    currentCycle,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  };
}
