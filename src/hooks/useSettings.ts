import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { AppSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

const SETTINGS_ID = 'app-settings';

/**
 * アプリ設定の読み書きを提供するカスタムフック
 */
export function useSettings() {
  // 設定をリアクティブに取得
  const settings = useLiveQuery(async () => {
    const saved = await db.settings.get(SETTINGS_ID);
    return saved || DEFAULT_SETTINGS;
  });

  /**
   * 設定を保存
   */
  const saveSettings = async (newSettings: AppSettings): Promise<void> => {
    await db.settings.put({ ...newSettings, id: SETTINGS_ID });
  };

  /**
   * 設定を部分的に更新
   */
  const updateSettings = async (updates: Partial<AppSettings>): Promise<void> => {
    const current = (await db.settings.get(SETTINGS_ID)) || DEFAULT_SETTINGS;
    await db.settings.put({ ...current, ...updates, id: SETTINGS_ID });
  };

  /**
   * 設定をリセット
   */
  const resetSettings = async (): Promise<void> => {
    await db.settings.put({ ...DEFAULT_SETTINGS, id: SETTINGS_ID });
  };

  return {
    settings: settings || DEFAULT_SETTINGS,
    saveSettings,
    updateSettings,
    resetSettings,
  };
}
