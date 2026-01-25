import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWAインストールプロンプトを管理するカスタムフック
 */
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    // 初期値としてインストール状態をチェック
    return window.matchMedia('(display-mode: standalone)').matches;
  });

  useEffect(() => {

    // beforeinstallpromptイベントをリッスン
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // インストール完了時
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * インストールプロンプトを表示
   */
  const promptInstall = async (): Promise<boolean> => {
    if (!installPrompt) {
      return false;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
      return true;
    }

    return false;
  };

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    promptInstall,
  };
}
