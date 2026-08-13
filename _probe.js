const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  try {
    await page.goto('https://abeysone.cloud/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const overlay = await page.$('#diag-overlay');
    console.log('Overlay found on login page:', !!overlay);
    if (overlay) console.log(await overlay.textContent());
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
