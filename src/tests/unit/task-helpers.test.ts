import { describe, it, expect } from 'vitest';
import { isAiUsed } from '@/lib/task-helpers';

describe('isAiUsed', () => {
  it('aiToolsUsed が空配列の場合は false', () => {
    expect(isAiUsed({ aiToolsUsed: [] })).toBe(false);
  });

  it('aiToolsUsed が ["AI未使用"] のみの場合は false', () => {
    expect(isAiUsed({ aiToolsUsed: ['AI未使用'] })).toBe(false);
  });

  it('aiToolsUsed に Claude が含まれる場合は true', () => {
    expect(isAiUsed({ aiToolsUsed: ['Claude'] })).toBe(true);
  });

  it('aiToolsUsed に複数ツールが含まれる場合は true', () => {
    expect(isAiUsed({ aiToolsUsed: ['Claude', 'Copilot'] })).toBe(true);
  });

  it('aiToolsUsed に「AI未使用」と他のツールが混在する場合も true（他のツールが優先）', () => {
    // 通常 TaskForm の UI ロジックでは混在しないが、防御的に true を返す
    expect(isAiUsed({ aiToolsUsed: ['AI未使用', 'Claude'] })).toBe(true);
  });

  it('レガシーデータ ["AI（旧データ）"] の場合は true', () => {
    // Dexie v2 マイグレーションで設定される値
    expect(isAiUsed({ aiToolsUsed: ['AI（旧データ）'] })).toBe(true);
  });
});
