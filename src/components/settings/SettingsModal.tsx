import { useState, useRef } from 'react';
import { Upload, Trash2, FileText, FileJson, FileSpreadsheet } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/hooks/useSettings';
import { useStatistics } from '@/hooks/useStatistics';
import {
  downloadJSON,
  downloadCSV,
  downloadMarkdownSummary,
  importDataFromJSON,
  deleteAllData,
} from '@/lib/export';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const stats = useStatistics('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [timerSettings, setTimerSettings] = useState(settings.timer);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveSettings = () => {
    updateSettings({ timer: timerSettings });
    toast.success('設定を保存しました');
  };

  const handleExportJSON = async () => {
    try {
      await downloadJSON(`insightlog-backup-${format(new Date(), 'yyyyMMdd')}.json`);
      updateSettings({ lastBackupDate: new Date() });
      toast.success('JSONファイルをダウンロードしました');
    } catch (error) {
      toast.error('エクスポートに失敗しました');
      console.error(error);
    }
  };

  const handleExportCSV = async () => {
    try {
      await downloadCSV(`insightlog-tasks-${format(new Date(), 'yyyyMMdd')}.csv`);
      toast.success('CSVファイルをダウンロードしました');
    } catch (error) {
      toast.error('エクスポートに失敗しました');
      console.error(error);
    }
  };

  const handleExportMarkdown = () => {
    try {
      downloadMarkdownSummary(stats, `insightlog-report-${format(new Date(), 'yyyyMMdd')}.md`);
      toast.success('統計レポートをダウンロードしました');
    } catch (error) {
      toast.error('エクスポートに失敗しました');
      console.error(error);
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importDataFromJSON(text);
      toast.success('データをインポートしました');
      onClose();
      window.location.reload(); // データ再読み込みのためリロード
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'インポートに失敗しました');
      console.error(error);
    }

    // ファイル選択をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteData = async () => {
    try {
      await deleteAllData();
      toast.success('全データを削除しました');
      setShowDeleteConfirm(false);
      onClose();
      window.location.reload();
    } catch (error) {
      toast.error('削除に失敗しました');
      console.error(error);
    }
  };

  const daysSinceBackup = settings.lastBackupDate
    ? differenceInDays(new Date(), settings.lastBackupDate)
    : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="設定">
      <div className="space-y-6">
        {/* タイマー設定 */}
        <section>
          <h3 className="text-sm font-medium text-primary-700 mb-3">タイマー設定</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-primary-500 mb-1">作業時間</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={timerSettings.pomodoroDuration}
                  onChange={(e) =>
                    setTimerSettings({ ...timerSettings, pomodoroDuration: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-primary-50 rounded-lg border-0 focus:ring-2 focus:ring-accent-200 text-sm"
                />
                <span className="text-xs text-primary-400">分</span>
              </div>
              <div>
                <label className="block text-xs text-primary-500 mb-1">短い休憩</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={timerSettings.shortBreakDuration}
                  onChange={(e) =>
                    setTimerSettings({
                      ...timerSettings,
                      shortBreakDuration: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-primary-50 rounded-lg border-0 focus:ring-2 focus:ring-accent-200 text-sm"
                />
                <span className="text-xs text-primary-400">分</span>
              </div>
              <div>
                <label className="block text-xs text-primary-500 mb-1">長い休憩</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={timerSettings.longBreakDuration}
                  onChange={(e) =>
                    setTimerSettings({
                      ...timerSettings,
                      longBreakDuration: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-primary-50 rounded-lg border-0 focus:ring-2 focus:ring-accent-200 text-sm"
                />
                <span className="text-xs text-primary-400">分</span>
              </div>
            </div>

            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timerSettings.autoStartBreaks}
                  onChange={(e) =>
                    setTimerSettings({ ...timerSettings, autoStartBreaks: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-accent-500"
                />
                <span className="text-sm text-primary-700">休憩の自動開始</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timerSettings.autoStartPomodoros}
                  onChange={(e) =>
                    setTimerSettings({ ...timerSettings, autoStartPomodoros: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-accent-500"
                />
                <span className="text-sm text-primary-700">作業の自動開始</span>
              </label>
            </div>

            <Button onClick={handleSaveSettings} size="sm" className="w-full">
              設定を保存
            </Button>
          </div>
        </section>

        {/* データ管理 */}
        <section>
          <h3 className="text-sm font-medium text-primary-700 mb-3">データ管理</h3>

          {/* バックアップ状況 */}
          {daysSinceBackup !== null && (
            <div
              className={`mb-3 p-3 rounded-lg ${
                daysSinceBackup >= 7 ? 'bg-warning-50' : 'bg-success-50'
              }`}
            >
              <p className={`text-sm ${daysSinceBackup >= 7 ? 'text-warning-700' : 'text-success-700'}`}>
                {daysSinceBackup === 0
                  ? '今日バックアップ済み'
                  : `最終バックアップから${daysSinceBackup}日経過`}
              </p>
              {daysSinceBackup >= 7 && (
                <p className="text-xs text-warning-600 mt-1">
                  定期的なバックアップを推奨します
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {/* エクスポート */}
            <div className="bg-primary-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-primary-700 mb-2">データのエクスポート</h4>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportJSON}
                  variant="secondary"
                  size="sm"
                  className="flex-1 flex items-center gap-1"
                >
                  <FileJson size={14} />
                  JSON
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="secondary"
                  size="sm"
                  className="flex-1 flex items-center gap-1"
                >
                  <FileSpreadsheet size={14} />
                  CSV
                </Button>
                <Button
                  onClick={handleExportMarkdown}
                  variant="secondary"
                  size="sm"
                  className="flex-1 flex items-center gap-1"
                >
                  <FileText size={14} />
                  MD
                </Button>
              </div>
            </div>

            {/* インポート */}
            <div className="bg-primary-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-primary-700 mb-2">データのインポート</h4>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                size="sm"
                className="w-full flex items-center justify-center gap-1"
              >
                <Upload size={14} />
                JSONファイルを選択
              </Button>
            </div>

            {/* 削除 */}
            <div className="bg-warning-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-warning-700 mb-2">データの削除</h4>
              {!showDeleteConfirm ? (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="ghost"
                  size="sm"
                  className="w-full flex items-center justify-center gap-1 text-warning-600 hover:bg-warning-100"
                >
                  <Trash2 size={14} />
                  全データを削除
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-warning-700">本当に全データを削除しますか？</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeleteData}
                      variant="ghost"
                      size="sm"
                      className="flex-1 bg-warning-600 text-white hover:bg-warning-700"
                    >
                      削除する
                    </Button>
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* バージョン情報 */}
        <div className="text-center text-xs text-primary-400 pt-4 border-t border-primary-100">
          <p>InsightLog v0.1.0 (MVP)</p>
        </div>
      </div>
    </Modal>
  );
}
