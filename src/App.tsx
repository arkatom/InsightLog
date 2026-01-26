import { useEffect, useRef } from 'react';
import { HomePage } from './pages/HomePage';
import { useTimerStore } from './store/timerStore';

function App() {
  const { isRunning, tick } = useTimerStore();
  const intervalRef = useRef<number | null>(null);

  // タイマーのtick処理（アプリ全体で1回のみ）
  useEffect(() => {
    if (isRunning) {
      const interval = window.setInterval(() => {
        tick();
      }, 1000);
      intervalRef.current = interval;

      return () => {
        clearInterval(interval);
      };
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isRunning, tick]);

  return <HomePage />;
}

export default App;
