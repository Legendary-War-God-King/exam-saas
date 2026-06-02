import { test, expect, Page } from '@playwright/test';

/**
 * H5 学生端完整流程 E2E
 * 1) /exam 登录
 * 2) 答完 20 题（按题型自动答）
 * 3) 末题交卷
 * 4) /result 看到分数
 */

const STUDENT_NO = `PWE2E_${Date.now().toString(36)}`;
const EXAM_CODE = '817314'; // 英语期末考 (DB 里 PUBLISHED)

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
}

test('H5 student exam flow: login → answer → submit → result', async ({ page }) => {
  // === Step 1: 登录页 ===
  await page.goto('/exam', { waitUntil: 'networkidle' });
  await shot(page, '01-login');
  await expect(page).toHaveURL(/\/exam$/);

  const inputs = page.locator('input');
  await expect(inputs).toHaveCount(2);

  // === Step 2: 填表 + 登录 ===
  await inputs.nth(0).fill(STUDENT_NO);
  await inputs.nth(1).fill(EXAM_CODE);
  await shot(page, '02-filled');

  const loginBtn = page.getByRole('button', { name: /登录|开始|进入/ });
  await loginBtn.click();

  await page.waitForURL(/\/exam\/[^/]+$/, { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  const url = page.url();
  const examId = url.match(/\/exam\/([^/?#]+)/)?.[1];
  expect(examId).toBeTruthy();

  // === Step 3: 答题页结构 ===
  await expect(page.locator('text=/\\d+:\\d{2}/').first()).toBeVisible({ timeout: 10_000 });
  await shot(page, '03-exam-loaded');

  // === Step 4-6: 按题型答所有题 + 交卷 ===
  const answerCurrent = async () => {
    const fillInput = page.locator('input[type="text"]').first();
    if (await fillInput.isVisible().catch(() => false)) {
      await fillInput.fill('test-answer');
      return;
    }
    const judge = page.getByRole('button', { name: '正确' });
    if (await judge.isVisible().catch(() => false)) {
      await judge.click();
      return;
    }
    // 单选/多选：找 A/B/C/D 选项按钮
    const opt = page.locator('button').filter({ hasText: /^[A-D]\.|^[A-D]$/ }).first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
    }
  };

  for (let i = 0; i < 25; i++) {
    await answerCurrent();
    await page.waitForTimeout(300);
    const nextBtn = page.getByRole('button', { name: /下一题|下一/ });
    if (!(await nextBtn.isVisible().catch(() => false))) break;
    await nextBtn.click();
    await page.waitForTimeout(300);
  }
  await shot(page, '06-last-question');

  // === Step 7: 交卷 ===
  page.once('dialog', (d) => d.accept());
  const submitBtn = page.getByRole('button', { name: '交卷' });
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  // === Step 8: result 页 ===
  await page.waitForURL(/\/result/, { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  await shot(page, '07-result');
  await expect(page.locator('text=/\\d+/').first()).toBeVisible();
});
