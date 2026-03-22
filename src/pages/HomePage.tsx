import { useState, lazy, Suspense } from 'react';
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
import { useStatistics } from '@/hooks/useStatistics';
import { useSettings } from '@/hooks/useSettings';
import { formatMinutes } from '@/lib/time';

// モーダルを遅延ロード
const StatsModal = lazy(() => import('@/components/statistics/StatsModal').then(m => ({ default: m.StatsModal })));
const SettingsModal = lazy(() => import('@/components/settings/SettingsModal').then(m => ({ default: m.SettingsModal })));
const ReportModal = lazy(() => import('@/components/report/ReportModal').then(m => ({ default: m.ReportModal })));
const RoiDashboard = lazy(() => import('@/components/report/RoiDashboard').then(m => ({ default: m.RoiDashboard })));

export function HomePage() {
  const [showTaskList, setShowTaskList] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showRoi, setShowRoi] = useState(false);
  const { currentCycle } = useTimer();
  const stats = useStatistics('today');
  const { settings } = useSettings();
  const showTimer = settings.showTimer ?? true;

  return (
    <Container>
      <Header
        onTaskListClick={() => setShowTaskList(true)}
        onStatsClick={() => setShowStats(true)}
        onSettingsClick={() => setShowSettings(true)}
        onReportClick={() => setShowReports(true)}
        onRoiClick={() => setShowRoi(true)}
      />

      {showTimer && (
        <>
          <ModeSelector />

          <Card>
            <SessionIndicator />
            <TimerDisplay />
            <div className="text-primary-400 text-center mb-8">サイクル {currentCycle}/4</div>
            <TimerControls />

            {/* 今日の統計 */}
            <div className="mt-8 pt-6 border-t border-primary-100 flex justify-around">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-800">{stats.basic.totalSessions}</div>
                <div className="text-xs text-primary-400">完了セッション</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-800">
                  {formatMinutes(Math.floor(stats.basic.totalFocusTime / 60))}
                </div>
                <div className="text-xs text-primary-400">集中時間</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-800">{stats.basic.totalTasks}</div>
                <div className="text-xs text-primary-400">完了タスク</div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* タスク記録フォーム */}
      <TaskForm />

      {/* タスク一覧モーダル */}
      <TaskList isOpen={showTaskList} onClose={() => setShowTaskList(false)} />

      {/* 統計モーダル（遅延ロード） */}
      <Suspense fallback={null}>
        {showStats && <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />}
      </Suspense>

      {/* 設定モーダル（遅延ロード） */}
      <Suspense fallback={null}>
        {showSettings && <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />}
      </Suspense>

      {/* レポートモーダル（遅延ロード） */}
      <Suspense fallback={null}>
        {showReports && <ReportModal isOpen={showReports} onClose={() => setShowReports(false)} />}
      </Suspense>

      {/* AI ROI ダッシュボードモーダル（遅延ロード） */}
      <Suspense fallback={null}>
        {showRoi && <RoiDashboard isOpen={showRoi} onClose={() => setShowRoi(false)} />}
      </Suspense>
    </Container>
  );
}
