import { describe, it, expect } from 'vitest';
import { formatDuration, formatMinutes, secondsToMinutes, minutesToSeconds } from '@/lib/time';

describe('time utilities', () => {
  describe('formatDuration', () => {
    it('25分を "25:00" にフォーマット', () => {
      expect(formatDuration(25 * 60)).toBe('25:00');
    });

    it('1分30秒を "1:30" にフォーマット', () => {
      expect(formatDuration(90)).toBe('1:30');
    });

    it('0秒を "0:00" にフォーマット', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('59秒を "0:59" にフォーマット', () => {
      expect(formatDuration(59)).toBe('0:59');
    });

    it('1時間を "60:00" にフォーマット', () => {
      expect(formatDuration(3600)).toBe('60:00');
    });
  });

  describe('formatMinutes', () => {
    it('25分を "25分" にフォーマット', () => {
      expect(formatMinutes(25)).toBe('25分');
    });

    it('60分を "1時間" にフォーマット', () => {
      expect(formatMinutes(60)).toBe('1時間');
    });

    it('90分を "1時間30分" にフォーマット', () => {
      expect(formatMinutes(90)).toBe('1時間30分');
    });

    it('120分を "2時間" にフォーマット', () => {
      expect(formatMinutes(120)).toBe('2時間');
    });

    it('0分を "0分" にフォーマット', () => {
      expect(formatMinutes(0)).toBe('0分');
    });
  });

  describe('secondsToMinutes', () => {
    it('60秒を1分に変換', () => {
      expect(secondsToMinutes(60)).toBe(1);
    });

    it('90秒を1分に変換（切り捨て）', () => {
      expect(secondsToMinutes(90)).toBe(1);
    });

    it('0秒を0分に変換', () => {
      expect(secondsToMinutes(0)).toBe(0);
    });

    it('3600秒を60分に変換', () => {
      expect(secondsToMinutes(3600)).toBe(60);
    });
  });

  describe('minutesToSeconds', () => {
    it('1分を60秒に変換', () => {
      expect(minutesToSeconds(1)).toBe(60);
    });

    it('25分を1500秒に変換', () => {
      expect(minutesToSeconds(25)).toBe(1500);
    });

    it('0分を0秒に変換', () => {
      expect(minutesToSeconds(0)).toBe(0);
    });
  });
});
