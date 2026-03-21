import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E テスト設定
 * Ship-from-Issue デモ用: ビデオ録画を有効化（.webm 形式で自動保存）
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'demo/screenshots/playwright-report', open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',

    // ビデオ録画: .webm 形式で自動保存（変換不要）
    video: 'on',

    // スクリーンショット: テスト失敗時に自動保存
    screenshot: 'on',
  },

  outputDir: 'demo/screenshots/test-results',

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // E2E 実行前に開発サーバーを自動起動
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
