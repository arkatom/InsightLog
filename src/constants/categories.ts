export const TASK_CATEGORIES = [
  '実装',
  '設計',
  'デザイン',
  'レビュー',
  '調査',
  'ドキュメント',
  'MTG',
  'その他'
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];
