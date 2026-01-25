import { useEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { useTimerStore } from './store/timerStore';
import { saveTimerState } from './lib/storage';

function App() {
  const timerState = useTimerStore();

  // タブ非表示時・ブラウザ終了時にタイマー状態を保存
  useEffect(() => {
    const saveState = () => {
      saveTimerState({
        mode: timerState.mode,
        remainingSeconds: timerState.remainingSeconds,
        isRunning: timerState.isRunning,
        isPaused: timerState.isPaused,
        currentSessionType: timerState.currentSessionType,
        currentCycle: timerState.currentCycle,
      });
    };

    // タブ非表示時に保存
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveState();
      }
    };

    // ブラウザ終了時に保存
    const handleBeforeUnload = () => {
      saveState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [timerState]);

  return <HomePage />;
}

export default App;
