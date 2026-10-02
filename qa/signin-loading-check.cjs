/** Run against next start (production): QA_BASE_URL=http://localhost:3218 node qa/signin-loading-check.cjs.
 * PLAYWRIGHT_MODULE may point to a bundled Playwright installation.
 * All auth responses are intercepted; no sign-in or account mutation is performed.
 */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_BASE_URL || 'http://localhost:3218';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const config = { apiKey: 'qa-public-placeholder', projectId: 'qa-signin', authDomain: 'qa-signin.firebaseapp.com' };
    let mode = 'http-error';
    let configCalls = 0;
    await page.route('**/api/me', route => route.fulfill({ json: { ok: true, data: { signedIn: mode === 'signed-in', needsProfile: false, entitlement: {} } } }));
    await page.route('**/api/auth/config', route => {
      configCalls++;
      if (mode === 'http-error') return route.fulfill({ status: 503, json: { ok: false } });
      if (mode === 'network-error') return route.abort();
      return route.fulfill({ json: { ok: true, data: { firebase: mode === 'null-config' ? null : config } } });
    });
    for (const failure of ['http-error', 'network-error']) {
      mode = failure;
      await page.goto(base + '/start?next=/universities');
      await page.getByRole('alert').filter({ hasText: 'We couldn’t load sign-in' }).waitFor();
      assert.equal(await page.getByPlaceholder('test name, e.g. sujan').count(), 0);
      mode = 'healthy';
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await page.getByRole('button', { name: 'Continue with Google', exact: true }).waitFor();
    }
    mode = 'null-config';
    await page.goto(base + '/start');
    await page.getByRole('alert').filter({ hasText: 'Sign-in is temporarily unavailable' }).waitFor();
    assert.equal(await page.getByPlaceholder('test name, e.g. sujan').count(), 0);
    mode = 'signed-in';
    configCalls = 0;
    await page.goto(base + '/start?next=/universities');
    await page.waitForURL('**/universities');
    assert.equal(configCalls, 0, 'A signed-in visit should redirect before requesting sign-in config');
    console.log('PASS: HTTP and network failures offer working retry; production null config never shows dev login; signed-in visitors redirect without loading config.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
