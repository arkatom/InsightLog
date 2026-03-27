import type { TimerMode } from '@/constants/timer';
import { useTimerStore } from '@/store/timerStore';
import { useSettings } from '@/hooks/useSettings';
import { Clock, Timer, Watch } from 'lucide-react';

const MODES: { id: TimerMode; label: string; icon: typeof Clock }[] = [
  { id: 'pomodoro', label: 'ポモドーロ', icon: Clock },
  { id: 'free', label: 'フリー', icon: Timer },
  { id: 'stopwatch', label: 'ストップウォッチ', icon: Watch },
];

export function ModeSelector() {
  const { mode, setMode } = useTimerStore();
  const { settings } = useSettings();

  const handleModeChange = (newMode: TimerMode) => {
    // モード変更時にユーザー設定の作業時間を渡す
    setMode(newMode, settings.timer.pomodoroDuration);
  };

  return (
    <div className="bg-white rounded-xl p-1 flex shadow-sm">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => handleModeChange(id)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors
            ${mode === id ? 'bg-primary-800 text-white' : 'text-primary-500 hover:bg-primary-50'}`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
