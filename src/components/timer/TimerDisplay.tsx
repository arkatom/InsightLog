import { useTimer } from '@/hooks/useTimer';
import { formatDuration } from '@/lib/time';

export function TimerDisplay() {
  const { remainingSeconds, isRunning } = useTimer();

  return (
    <div className="text-center mb-8">
      <div
        className={`text-7xl font-mono font-bold text-primary-800 tracking-tight ${
          isRunning ? 'timer-pulse' : ''
        }`}
      >
        {formatDuration(remainingSeconds)}
      </div>
    </div>
  );
}
