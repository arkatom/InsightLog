import { Coffee } from 'lucide-react';
import { useTimer } from '@/hooks/useTimer';
import { useSettings } from '@/hooks/useSettings';

export function SessionIndicator() {
  const { currentSessionType, currentCycle, mode } = useTimer();
  const { settings } = useSettings();

  if (mode !== 'pomodoro') {
    return null;
  }

  const sessionLabels = {
    work: '作業中',
    shortBreak: '休憩中',
    longBreak: '長い休憩中',
  };

  const getNextSessionInfo = () => {
    if (currentSessionType === 'work') {
      const isLongBreak = currentCycle % settings.timer.cyclesUntilLongBreak === 0;
      const duration = isLongBreak
        ? settings.timer.longBreakDuration
        : settings.timer.shortBreakDuration;
      return `休憩 ${duration}分`;
    } else {
      return `作業 ${settings.timer.pomodoroDuration}分`;
    }
  };

  return (
    <div className="flex justify-center gap-4 mb-6">
      <span className="px-3 py-1 bg-primary-800 text-white rounded-full text-sm">
        {sessionLabels[currentSessionType]}
      </span>
      <span className="text-primary-400 text-sm flex items-center gap-1">
        <Coffee size={14} />
        次: {getNextSessionInfo()}
      </span>
    </div>
  );
}
