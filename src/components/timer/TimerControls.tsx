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
    // 停止 = リセット（セッションを中断として記録）
    resetTimer();
  };

  return (
    <div className="flex justify-center gap-3">
      {/* リセットボタン（ポモドーロのみ、セッション中断なし） */}
      {mode === 'pomodoro' && !isRunning && !isPaused && (
        <button
          onClick={resetTimer}
          className="p-3 bg-primary-100 rounded-full hover:bg-primary-200 transition-colors"
          title="リセット"
        >
          <RotateCcw size={20} className="text-primary-600" />
        </button>
      )}

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

      {/* 停止ボタン（実行中または一時停止中） */}
      {(isRunning || isPaused) && (
        <button
          onClick={handleStop}
          className="p-3 bg-warning-100 rounded-full hover:bg-warning-200 transition-colors"
          title="停止（セッションを中断）"
        >
          <Square size={20} className="text-warning-600" />
        </button>
      )}
    </div>
  );
}
