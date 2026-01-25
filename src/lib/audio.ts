/**
 * Web Audio APIでビープ音を生成・再生
 */
export class AudioNotification {
  private audioContext: AudioContext | null = null;

  constructor() {
    // AudioContextの初期化（ユーザー操作後に実行）
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * ビープ音を再生
   * @param volume 音量（0-1）
   * @param duration 再生時間（ミリ秒）
   * @param frequency 周波数（Hz）
   */
  async playBeep(volume: number = 0.5, duration: number = 200, frequency: number = 800): Promise<void> {
    if (!this.audioContext) {
      console.warn('AudioContext is not supported');
      return;
    }

    try {
      // AudioContextを再開（ブラウザポリシー対応）
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // 設定
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = volume;

      // 再生
      const now = this.audioContext.currentTime;
      oscillator.start(now);
      oscillator.stop(now + duration / 1000);

      // フェードアウト
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);
    } catch (error) {
      console.error('Failed to play beep:', error);
    }
  }

  /**
   * タイマー終了音を再生（3回ビープ）
   */
  async playTimerEndSound(volume: number = 0.5): Promise<void> {
    await this.playBeep(volume, 150, 800);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await this.playBeep(volume, 150, 800);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await this.playBeep(volume, 300, 1000);
  }
}

// シングルトンインスタンス
export const audioNotification = new AudioNotification();
