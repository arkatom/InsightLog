/**
 * AI利用ツールの選択肢
 */
export const AI_TOOLS = [
  'AI未使用',
  'Claude',
  'Copilot',
  'ChatGPT',
  'Gemini',
  'その他AI'
] as const;

export type AITool = typeof AI_TOOLS[number];

/**
 * 「AI未使用」の定数
 */
export const AI_NOT_USED = 'AI未使用';
