import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 配置
 * - 跑 H5 学生端完整流程：登录 → 答题 → 交卷 → 看成绩
 * - 需要 web dev server (:3000) + backend (:4000) 在跑
 *   本地: pnpm dev (web) + pnpm start:dev (backend)
 *   CI: 由 GitHub Actions 起服务
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // 后端共享 DB，串行跑避免互相污染
  workers: 1,
  reporter: process.env.CI ? 'list' : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
