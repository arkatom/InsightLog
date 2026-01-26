import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup();
});
