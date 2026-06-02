// H5 学生端完整流程 E2E 测试 (Playwright + 已下载的 Chromium 1223)
// 流程: /exam 登录 → /exam/[id] 答题 → 交卷 → /exam/[id]/result 看成绩
const { chromium } = require('C:/Users/Loonghuangbaosheng/AppData/Local/Temp/node_modules/playwright-core');
const path = require('path');

const SHOT_DIR = 'C:/Users/Loonghuangbaosheng/AppData/Local/Temp/pw-screenshots';
const STUDENT_NO = 'PWE2E001';
const EXAM_CODE = '817314'; // 英语期末考

function shot(page, name) {
  return page.screenshot({ path: path.join(SHOT_DIR, name + '.png') });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('requestfailed', (req) => {
    if (req.url().includes('/api/v1/')) console.log('[reqfailed]', req.url(), req.failure()?.errorText);
  });

  let pass = 0, fail = 0;
  const check = (name, cond, extra = '') => {
    if (cond) { console.log('  ✅', name, extra); pass++; }
    else { console.log('  ❌', name, extra); fail++; }
  };

  try {
    // === Step 1: H5 登录页 ===
    console.log('\n[Step 1] H5 登录页');
    await page.goto('http://localhost:3000/exam', { waitUntil: 'networkidle', timeout: 15000 });
    await shot(page, '01-login');
    check('登录页加载', page.url() === 'http://localhost:3000/exam');

    const inputs = await page.$$('input');
    check('登录页有 2 个 input', inputs.length === 2);

    // === Step 2: 输入学号 + 考试码 + 点登录 ===
    console.log('\n[Step 2] 填表 + 登录');
    await inputs[0].type(STUDENT_NO);
    await inputs[1].type(EXAM_CODE);
    await shot(page, '02-filled');

    // 找登录按钮
    let loginBtn = null;
    for (const b of await page.$$('button')) {
      const t = await page.evaluate((el) => el.textContent, b);
      if (t && (t.includes('登录') || t.includes('开始') || t.includes('进入'))) {
        loginBtn = b; break;
      }
    }
    check('找到登录按钮', !!loginBtn);
    await loginBtn.click();

    // 等待跳转
    await page.waitForURL(/\/exam\/[^/]+$/, { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    const examId = page.url().match(/\/exam\/([^/?#]+)/)[1];
    console.log('  examId:', examId);
    check('跳转到答题页', !!examId);
    await shot(page, '03-exam-loaded');

    // 等待题目加载完（看到 "1/20" 出现后再等 1s 稳态）
    await page.waitForSelector('text=/1\\/20/', { timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
    await shot(page, '03-exam-loaded');

    // === Step 3: 检查答题页结构 ===
    console.log('\n[Step 3] 答题页结构');
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasQuestion = bodyText.length > 50;
    check('答题页有内容', hasQuestion);
    check('有倒计时显示', /\d+:\d{2}/.test(bodyText));

    // === Step 4: 答第一题（按题型）===
    console.log('\n[Step 4] 答题');
    // 检测题型：找单选/多选/判断/填空 的 DOM
    const questionType = await page.evaluate(() => {
      if (document.querySelector('input[type="text"]')) return 'FILL_BLANK';
      const buttons = Array.from(document.querySelectorAll('button'));
      const judgeBtn = buttons.find(b => b.textContent.trim() === '正确' || b.textContent.trim() === '错误');
      if (judgeBtn) return 'TRUE_FALSE';
      // 单选/多选：option 类按钮（带 .grid grid-cols-2 容器或者就是普通列表）
      const optBtns = buttons.filter(b => /^[A-D]\.|^[A-D]$/.test(b.textContent.trim()));
      if (optBtns.length >= 2) return 'CHOICE';
      return 'UNKNOWN';
    });
    console.log('  questionType:', questionType);

    let answered = false;
    if (questionType === 'FILL_BLANK') {
      const input = await page.$('input[type="text"]');
      if (input) { await input.type('studies'); answered = true; }
    } else if (questionType === 'TRUE_FALSE') {
      for (const b of await page.$$('button')) {
        const t = await page.evaluate((el) => el.textContent, b);
        if (t && t.trim() === '正确') { await b.click(); answered = true; break; }
      }
    } else if (questionType === 'CHOICE') {
      for (const b of await page.$$('button')) {
        const t = await page.evaluate((el) => el.textContent, b);
        if (t && /^[A-D]\.|^[A-D]$/.test(t.trim())) { await b.click(); answered = true; break; }
      }
    }
    check('点击了第一题答案', answered);
    await new Promise((r) => setTimeout(r, 800));
    await shot(page, '04-answered');

    // === Step 5: 下一题 ===
    console.log('\n[Step 5] 下一题');
    let nextBtn = null;
    for (const b of await page.$$('button')) {
      const t = await page.evaluate((el) => el.textContent, b);
      if (t && (t.includes('下一题') || t.includes('下一'))) {
        nextBtn = b; break;
      }
    }
    if (nextBtn) {
      await nextBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      check('点击下一题成功', true);
    } else {
      check('点击下一题成功', false, '—— 只有一题，直接交卷');
    }
    await shot(page, '05-next');

    // === Step 6: 答剩余题 + 跳到末题 + 交卷 ===
    console.log('\n[Step 6] 答完所有题 + 交卷');
    // 多页最多 20 题 — 每页答一次 + next
    for (let i = 0; i < 25; i++) {
      // 先答当前题（按题型）
      const t = await page.evaluate(() => {
        if (document.querySelector('input[type="text"]')) return 'FILL_BLANK';
        const buttons = Array.from(document.querySelectorAll('button'));
        if (buttons.find(b => b.textContent.trim() === '正确')) return 'TRUE_FALSE';
        if (buttons.find(b => /^[A-D]\.|^[A-D]$/.test(b.textContent.trim()))) return 'CHOICE';
        return 'NONE';
      });
      if (t === 'FILL_BLANK') {
        const inp = await page.$('input[type="text"]');
        if (inp) await inp.type('answer' + i);
      } else if (t === 'TRUE_FALSE') {
        for (const b of await page.$$('button')) {
          const tt = await page.evaluate((el) => el.textContent, b);
          if (tt && tt.trim() === '正确') { await b.click(); break; }
        }
      } else if (t === 'CHOICE') {
        for (const b of await page.$$('button')) {
          const tt = await page.evaluate((el) => el.textContent, b);
          if (tt && /^[A-D]\.|^[A-D]$/.test(tt.trim())) { await b.click(); break; }
        }
      }
      await new Promise((r) => setTimeout(r, 300));
      // 找下一题
      let foundNext = false;
      for (const b of await page.$$('button')) {
        const tt = await page.evaluate((el) => el.textContent, b);
        if (tt && (tt.includes('下一题') || tt.includes('下一'))) {
          await b.click();
          foundNext = true;
          break;
        }
      }
      if (!foundNext) break; // 末题
      await new Promise((r) => setTimeout(r, 300));
    }
    await new Promise((r) => setTimeout(r, 500));
    await shot(page, '06-last-question');

    // 找"交卷"按钮
    let submitBtn = null;
    for (const b of await page.$$('button')) {
      const t = await page.evaluate((el) => el.textContent, b);
      if (t && t.includes('交卷')) { submitBtn = b; break; }
    }
    check('找到交卷按钮', !!submitBtn);

    page.once('dialog', (d) => d.accept());
    await submitBtn.click();

    // === Step 7: 等待跳到 result 页 ===
    console.log('\n[Step 7] 看成绩页');
    await page.waitForURL(/\/result/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await new Promise((r) => setTimeout(r, 1000));
    check('跳转到 result 页', page.url().includes('/result'));
    await shot(page, '07-result');

    const resultText = await page.evaluate(() => document.body.innerText);
    check('成绩页有分数显示', /\d+/.test(resultText));

  } catch (e) {
    console.log('\n[FATAL]', e.message);
    fail++;
    try { await shot(page, 'fatal'); } catch {}
  } finally {
    await browser.close();
    console.log(`\n=== E2E 结果: ${pass} pass, ${fail} fail ===`);
    process.exit(fail === 0 ? 0 : 1);
  }
})();
