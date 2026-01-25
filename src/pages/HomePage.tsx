import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Header } from '@/components/layout/Header';
import { ModeSelector } from '@/components/timer/ModeSelector';
import { Card } from '@/components/ui/Card';
import { SessionIndicator } from '@/components/timer/SessionIndicator';
import { TimerDisplay } from '@/components/timer/TimerDisplay';
import { TimerControls } from '@/components/timer/TimerControls';
import { TaskForm } from '@/components/task/TaskForm';
import { TaskList } from '@/components/task/TaskList';
import { useTimer } from '@/hooks/useTimer';

export function HomePage() {
  const [showTaskList, setShowTaskList] = useState(false);
  const { currentCycle } = useTimer();

  return (
    <Container>
      <Header
        onTaskListClick={() => setShowTaskList(true)}
        onStatsClick={() => {
          /* TODO: Phase 5で統計モーダルを実装 */
        }}
      />

      <ModeSelector />

      <Card>
        <SessionIndicator />
        <TimerDisplay />
        <div className="text-primary-400 text-center mb-8">サイクル {currentCycle}/4</div>
        <TimerControls />

        {/* 今日の統計（Phase 5で実装） */}
        <div className="mt-8 pt-6 border-t border-primary-100 flex justify-around">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-800">0</div>
            <div className="text-xs text-primary-400">完了セッション</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-800">0h 0m</div>
            <div className="text-xs text-primary-400">集中時間</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-800">0</div>
            <div className="text-xs text-primary-400">完了タスク</div>
          </div>
        </div>
      </Card>

      {/* タスク記録フォーム */}
      <TaskForm />

      {/* タスク一覧モーダル */}
      <TaskList isOpen={showTaskList} onClose={() => setShowTaskList(false)} />
    </Container>
  );
}
