import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { PomodoroSession, SessionType } from '@/types/session';

/**
 * セッションのCRUD操作を提供するカスタムフック
 */
export function useSessions() {
  // 全セッションをリアクティブに取得
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray());

  /**
   * セッションを追加
   */
  const addSession = async (
    session: Omit<PomodoroSession, 'id' | 'startedAt'>
  ): Promise<string> => {
    const id = crypto.randomUUID();
    const now = new Date();

    await db.sessions.add({
      ...session,
      id,
      startedAt: now,
    });

    return id;
  };

  /**
   * セッションを更新
   */
  const updateSession = async (id: string, updates: Partial<PomodoroSession>): Promise<void> => {
    await db.sessions.update(id, updates);
  };

  /**
   * セッションを削除
   */
  const deleteSession = async (id: string): Promise<void> => {
    await db.sessions.delete(id);
  };

  /**
   * 現在進行中のセッションを取得
   */
  const getCurrentSession = async (): Promise<PomodoroSession | undefined> => {
    const sessions = await db.sessions.toArray();
    return sessions.find((s) => s.completedAt === null);
  };

  /**
   * 今日のセッションを取得
   */
  const getTodaySessions = async (): Promise<PomodoroSession[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db.sessions
      .where('startedAt')
      .between(today, tomorrow, true, false)
      .toArray();
  };

  /**
   * 特定タイプのセッション数を取得
   */
  const getSessionCountByType = async (type: SessionType): Promise<number> => {
    return await db.sessions.where('type').equals(type).count();
  };

  return {
    sessions: sessions ?? [],
    addSession,
    updateSession,
    deleteSession,
    getCurrentSession,
    getTodaySessions,
    getSessionCountByType,
  };
}
