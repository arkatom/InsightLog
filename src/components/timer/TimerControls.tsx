import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';

export function TimerControls() {
  const { isRunning, isPaused, startTimer, pauseTimer, resumeTimer, resetTimer } = useTimer();

  const handlePlayPause = () => {
    if (isRunning) {
      pauseTimer();
    } else if (isPaused) {
      resumeTimer();
    } else {
      startTimer();
    }
  };

  return (
    <div className="flex justify-center gap-4">
      {/* リセットボタン */}
      <button
        onClick={resetTimer}
        className="p-3 bg-primary-100 rounded-full hover:bg-primary-200 transition-colors"
      >
        <RotateCcw size={24} className="text-primary-600" />
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
            <span className="text-white font-medium">
              {isPaused ? '再開' : 'スタート'}
            </span>
          </>
        )}
      </button>

      {/* 休憩スキップボタン（将来の拡張用、現在は装飾） */}
      <button className="p-3 bg-primary-100 rounded-full hover:bg-primary-200 transition-colors">
        <Coffee size={24} className="text-primary-600" />
      </button>
    </div>
  );
}
