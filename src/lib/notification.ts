/**
 * ブラウザ通知の許可をリクエスト
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * ブラウザ通知を表示
 */
export function showNotification(title: string, body: string, icon?: string): void {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: 'insightlog-timer',
      requireInteraction: false,
    });
  }
}

/**
 * バイブレーションを実行
 */
export function vibrate(pattern: number | number[] = 200): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * タイマー終了時の通知を送信
 */
export function notifyTimerEnd(sessionType: 'work' | 'shortBreak' | 'longBreak'): void {
  const messages = {
    work: {
      title: '作業セッション終了',
      body: 'お疲れ様でした。休憩しましょう。',
    },
    shortBreak: {
      title: '休憩終了',
      body: '次の作業セッションを開始しましょう。',
    },
    longBreak: {
      title: '長い休憩終了',
      body: 'リフレッシュできましたか？次のサイクルを開始しましょう。',
    },
  };

  const message = messages[sessionType];
  showNotification(message.title, message.body);
}
