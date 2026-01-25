import { Clock, Timer, Watch } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import type { TimerMode } from '@/constants/timer';

const MODES = [
  { id: 'pomodoro' as TimerMode, label: 'ポモドーロ', icon: Clock },
  { id: 'free' as TimerMode, label: 'フリー', icon: Timer },
  { id: 'stopwatch' as TimerMode, label: 'ストップウォッチ', icon: Watch },
];

export function ModeSelector() {
  const { mode, setMode } = useTimerStore();

  return (
    <div className="bg-white rounded-xl p-1 flex shadow-sm">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
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
