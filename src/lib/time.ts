/**
 * 秒数を "MM:SS" 形式にフォーマット
 * @param seconds 秒数
 * @returns "MM:SS" 形式の文字列
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 分数を "H時間M分" 形式にフォーマット
 * @param minutes 分数
 * @returns "H時間M分" または "M分" 形式の文字列
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${mins}分`;
}

/**
 * 秒数を分数に変換
 * @param seconds 秒数
 * @returns 分数（小数点以下切り捨て）
 */
export function secondsToMinutes(seconds: number): number {
  return Math.floor(seconds / 60);
}

/**
 * 分数を秒数に変換
 * @param minutes 分数
 * @returns 秒数
 */
export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}
