import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import type { AppSettings } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';

const SETTINGS_ID = 'app-settings';

/**
 * アプリ設定の読み書きを提供するカスタムフック
 */
export function useSettings() {
  const [isInitialized, setIsInitialized] = useState(false);

  // 初回起動時の設定初期化（書き込み操作はuseEffectで実行）
  useEffect(() => {
    const initializeSettings = async () => {
      const saved = await db.settings.get(SETTINGS_ID);

      // 初回起動時: memberIdは空文字（ユーザーが設定画面で入力）
      if (!saved) {
        const initialSettings: AppSettings = {
          ...DEFAULT_SETTINGS,
          id: SETTINGS_ID,
          memberId: '',
        };
        await db.settings.put(initialSettings);
        setIsInitialized(true);
        return;
      }

      setIsInitialized(true);
    };

    initializeSettings();
  }, []);

  // 設定をリアクティブに取得（読み取りのみ）
  const settings = useLiveQuery(async () => {
    const saved = await db.settings.get(SETTINGS_ID);
    return saved || { ...DEFAULT_SETTINGS, id: SETTINGS_ID, memberId: 'temp' };
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
    const current = await db.settings.get(SETTINGS_ID);
    if (!current) {
      throw new Error('設定が初期化されていません');
    }
    await db.settings.put({ ...current, ...updates, id: SETTINGS_ID });
  };

  /**
   * 設定をリセット（memberIdは保持）
   */
  const resetSettings = async (): Promise<void> => {
    const current = await db.settings.get(SETTINGS_ID);
    const memberId = current?.memberId || '';
    await db.settings.put({ ...DEFAULT_SETTINGS, id: SETTINGS_ID, memberId });
  };

  return {
    settings: settings || { ...DEFAULT_SETTINGS, id: SETTINGS_ID, memberId: 'temp' },
    saveSettings,
    updateSettings,
    resetSettings,
    isInitialized,
  };
}
