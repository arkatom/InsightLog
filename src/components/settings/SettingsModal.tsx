import { useState, useRef } from 'react';
import { Upload, Trash2, FileText, FileJson, FileSpreadsheet, Download, Volume2, Bell } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/hooks/useSettings';
import type { AppSettings } from '@/types/settings';
import { useStatistics } from '@/hooks/useStatistics';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import {
  downloadJSON,
  downloadKPICSV,
  downloadMarkdownSummary,
  importDataFromJSON,
  deleteAllData,
} from '@/lib/export';
import { seedSampleData } from '@/lib/sampleData';
import { audioNotification } from '@/lib/audio';
import { requestNotificationPermission, showNotification, vibrate } from '@/lib/notification';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings, isInitialized } = useSettings();

  // settings が初期化されるまで内部コンポーネントをレンダリングしない
  if (!isInitialized) return null;

  return <SettingsModalInner isOpen={isOpen} onClose={onClose} settings={settings} updateSettings={updateSettings} />;
}

function SettingsModalInner({
  isOpen,
  onClose,
  settings,
  updateSettings,
}: SettingsModalProps & {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}) {
  const stats = useStatistics('all');
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [memberName, setMemberName] = useState(settings.memberId);
  const [timerSettings, setTimerSettings] = useState(settings.timer);
  const [notificationSettings, setNotificationSettings] = useState(settings.notification);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      toast.success('InsightLogをインストールしました');
    }
  };

  const handleSaveMemberName = async () => {
    const trimmed = memberName.trim();
    if (!trimmed) {
      toast.error('メンバー名を入力してください');
      return;
    }
    await updateSettings({ memberId: trimmed });
    toast.success('メンバー名を保存しました');
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings({ timer: timerSettings, notification: notificationSettings });
      toast.success('設定を保存しました');
    } catch {
      toast.error('設定の保存に失敗しました');
    }
  };

  const handleTestSound = () => {
    audioNotification.playTimerEndSound(notificationSettings.soundVolume);
  };

  const handleTestNotification = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      showNotification('テスト通知', 'これはテスト通知です');
      toast.success('通知を送信しました');
    } else {
      toast.error('通知が許可されていません');
    }
  };

  const handleTestVibration = () => {
    vibrate([200, 100, 200]);
    toast.success('バイブレーションをテストしました');
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
      await downloadKPICSV(`logs-${format(new Date(), 'yyyyMMdd')}.csv`);
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
        {/* メンバー名 */}
        <section>
          <h3 className="text-sm font-medium text-primary-700 mb-3">メンバー名</h3>
          <p className="text-xs text-primary-500 mb-2">CSVエクスポート時の member_id に使用されます</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="例: yamada"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveMemberName()}
              className="flex-1 px-3 py-2 bg-primary-50 rounded-lg border-0 focus:ring-2 focus:ring-accent-200 text-sm"
            />
            <Button onClick={handleSaveMemberName} size="sm">
              保存
            </Button>
          </div>
        </section>

        {/* タイマー表示設定 */}
        <section>
          <h3 className="text-sm font-medium text-primary-700 mb-3">表示設定</h3>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-primary-700">タイマーを表示する</span>
            <input
              type="checkbox"
              checked={settings.showTimer ?? true}
              onChange={(e) => updateSettings({ showTimer: e.target.checked })}
              className="w-4 h-4 rounded text-accent-500"
            />
          </label>
        </section>

        {/* PWAインストール */}
        {canInstall && (
          <section className="bg-accent-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-accent-700 mb-2">アプリのインストール</h3>
            <p className="text-xs text-accent-600 mb-3">
              ホーム画面に追加して、アプリのように使用できます
            </p>
            <Button
              onClick={handleInstall}
              variant="primary"
              size="sm"
              className="w-full flex items-center justify-center gap-1"
            >
              <Download size={14} />
              インストール
            </Button>
          </section>
        )}

        {isInstalled && (
          <section className="bg-success-50 rounded-lg p-4">
            <p className="text-sm text-success-700">✓ InsightLogはインストール済みです</p>
          </section>
        )}
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

        {/* 通知設定 */}
        <section>
          <h3 className="text-sm font-medium text-primary-700 mb-3">通知設定</h3>
          <div className="space-y-3">
            {/* 音声通知 */}
            <div className="bg-primary-50 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={notificationSettings.soundEnabled}
                  onChange={(e) =>
                    setNotificationSettings({ ...notificationSettings, soundEnabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-accent-500"
                />
                <Volume2 size={16} className="text-primary-500" />
                <span className="text-sm text-primary-700">音声通知</span>
              </label>

              {notificationSettings.soundEnabled && (
                <div className="ml-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-primary-500 w-12">音量</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={notificationSettings.soundVolume}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          soundVolume: Number(e.target.value),
                        })
                      }
                      className="flex-1"
                    />
                    <span className="text-xs text-primary-500 w-8">
                      {Math.round(notificationSettings.soundVolume * 100)}%
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleTestSound}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    テスト
                  </Button>
                </div>
              )}
            </div>

            {/* ブラウザ通知 */}
            <div className="bg-primary-50 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={notificationSettings.browserNotificationEnabled}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      browserNotificationEnabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-accent-500"
                />
                <Bell size={16} className="text-primary-500" />
                <span className="text-sm text-primary-700">ブラウザ通知</span>
              </label>

              {notificationSettings.browserNotificationEnabled && (
                <div className="ml-6">
                  <Button
                    type="button"
                    onClick={handleTestNotification}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    テスト（許可をリクエスト）
                  </Button>
                </div>
              )}
            </div>

            {/* バイブレーション */}
            <div className="bg-primary-50 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={notificationSettings.vibrationEnabled}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      vibrationEnabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-accent-500"
                />
                <span className="text-sm text-primary-700">バイブレーション（モバイル）</span>
              </label>

              {notificationSettings.vibrationEnabled && (
                <div className="ml-6">
                  <Button
                    type="button"
                    onClick={handleTestVibration}
                    variant="ghost"
                    size="sm"
                    className="w-full"
                  >
                    テスト
                  </Button>
                </div>
              )}
            </div>
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
            {/* サンプルデータ */}
            <div className="bg-primary-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-primary-700 mb-1">サンプルデータ</h4>
              <p className="text-xs text-primary-500 mb-2">2週間分のデモ用データを読み込みます（32件のタスク）</p>
              <Button
                onClick={async () => {
                  await seedSampleData();
                  toast.success('サンプルデータを読み込みました');
                }}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                サンプルデータを読み込む
              </Button>
            </div>

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
