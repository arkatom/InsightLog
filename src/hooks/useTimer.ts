import { useEffect, useRef, useCallback } from 'react';
import { useTimerStore } from '@/store/timerStore';
import { useSettings } from './useSettings';
import { useSessions } from './useSessions';
import type { SessionType } from '@/types/session';
import { audioNotification } from '@/lib/audio';
import { notifyTimerEnd, vibrate } from '@/lib/notification';

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
      const plannedDuration =
        currentSessionType === 'work'
          ? settings.timer.pomodoroDuration * 60
          : currentSessionType === 'shortBreak'
          ? settings.timer.shortBreakDuration * 60
          : settings.timer.longBreakDuration * 60;

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
  }, [mode, currentSessionType, currentCycle, settings, start, addSession]);

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

    if (settings.notification.browserNotificationEnabled && mode === 'pomodoro') {
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

      const nextDuration =
        nextSessionType === 'work'
          ? settings.timer.pomodoroDuration * 60
          : nextSessionType === 'shortBreak'
          ? settings.timer.shortBreakDuration * 60
          : settings.timer.longBreakDuration * 60;

      setRemainingSeconds(nextDuration);

      const shouldAutoStart =
        (nextSessionType !== 'work' && settings.timer.autoStartBreaks) ||
        (nextSessionType === 'work' && settings.timer.autoStartPomodoros);

      if (shouldAutoStart) {
        startTimer();
      } else {
        pause();
      }
    } else {
      pause();
    }
  }, [
    mode,
    currentSessionType,
    currentCycle,
    settings,
    updateSession,
    getNextSessionType,
    setCurrentSessionType,
    setCurrentCycle,
    setRemainingSeconds,
    pause,
    // startTimer is stable (useCallback), no need to include
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
   * タイマーリセット
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

    reset();
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
