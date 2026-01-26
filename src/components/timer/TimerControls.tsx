import { Play, Pause, RotateCcw, Square } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';

export function TimerControls() {
  const { isRunning, isPaused, mode, startTimer, pauseTimer, resumeTimer, resetTimer } = useTimer();

  const handlePlayPause = () => {
    if (isRunning) {
      pauseTimer();
    } else if (isPaused) {
      resumeTimer();
    } else {
      startTimer();
    }
  };

  const handleStop = () => {
    resetTimer();
  };

  // ボタンの表示状態
  const showReset = mode === 'pomodoro' && !isRunning && !isPaused;
  const showStop = isRunning || isPaused;

  return (
    <div className="flex justify-center gap-3">
      {/* リセットボタン */}
      <button
        onClick={resetTimer}
        disabled={!showReset}
        className={`p-3 rounded-full transition-colors ${
          showReset
            ? 'bg-primary-100 hover:bg-primary-200'
            : 'bg-primary-50 opacity-50 cursor-not-allowed'
        }`}
        title="リセット"
      >
        <RotateCcw size={20} className={showReset ? 'text-primary-600' : 'text-primary-300'} />
      </button>

      {/* スタート/一時停止ボタン */}
      <button
        onClick={handlePlayPause}
        className="px-8 py-4 bg-primary-800 rounded-full shadow-lg flex items-center gap-2 hover:bg-primary-700 transition-colors"
      >
        {isRunning ? (
          <>
            <Pause size={24} className="text-white" />
            <span className="text-white font-medium">一時停止</span>
          </>
        ) : (
          <>
            <Play size={24} className="text-white" />
            <span className="text-white font-medium">{isPaused ? '再開' : 'スタート'}</span>
          </>
        )}
      </button>

      {/* 停止ボタン */}
      <button
        onClick={handleStop}
        disabled={!showStop}
        className={`p-3 rounded-full transition-colors ${
          showStop
            ? 'bg-warning-100 hover:bg-warning-200'
            : 'bg-primary-50 opacity-50 cursor-not-allowed'
        }`}
        title="停止（セッションを中断）"
      >
        <Square size={20} className={showStop ? 'text-warning-600' : 'text-primary-300'} />
      </button>
    </div>
  );
}
