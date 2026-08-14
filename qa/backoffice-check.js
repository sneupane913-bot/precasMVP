/**
 * THE BACK OFFICE, USED THE WAY THE CLIENT USES IT.
 *
 * Every other suite calls one back-office action at a time. The client does
 * not. He opens /super, which fires three actions on mount, reads the screen,
 * clicks Approve, and the page reloads everything again. That SEQUENCE is what
 * broke, and no single-action test could ever have seen it:
 *
 *   "I just opened the super. I went to payment, and I clicked on approve. It
 *    says too many attempts, please wait five minutes. Why?"
 *
 * The cause was that `/api/super` spent from the brute-force budget on every
 * authenticated action. Five per five minutes is the right budget for GUESSING
 * a passcode. It is an absurd budget for using a dashboard: one page load spent
 * three of the five, the Approve click spent the fourth, and the reload that
 * follows an approval spent the fifth and was refused.
 *
 * He then saw the second half of it. The payment row still said "submitted"
 * while the dashboard already counted the money, because the reload that would
 * have corrected the row was the request that got throttled. Two screens
 * disagreeing about whether he had been paid.
 *
 * So this suite asserts the sequence, not the endpoint:
 *   1. a real page load does not eat the budget
 *   2. approving after a page load works
 *   3. the row is correct immediately afterwards, with no stale state
 *   4. a WRONG passcode is still throttled, because that budget must stay
 *   5. the screen never shows two contradictory outcomes at once
 *   6. every approval carries a phone number, because he has to ring people
 *
 * Run:  QA_PORT=3090 node qa/backoffice-check.js
 */
const http = require('http');
const fs = require('fs');

const P = Number(process.env.QA_PORT || 3090);
const SU = process.env.SUPER_ADMIN_PASSCODE || 'super-dev';

let pass = 0;
let fail = 0;
function t(id, name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${id.padEnd(8)} ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${id.padEnd(8)} ${name}\n          ${detail}`);
  }
}

function req(method, path, body, opts = {}) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'x-forwarded-for': opts.ip || '203.0.113.200' };
    if (data) headers['Content-Type'] = 'application/json';
    if (opts.cookie) headers['Cookie'] = opts.cookie;
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (resp) => {
      let d = '';
      resp.on('data', (c) => (d += c));
      resp.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(d);
        } catch {
          /* html */
        }
        res({ code: resp.statusCode, body: d, json, setCookie: resp.headers['set-cookie'] || [] });
      });
    });
    r.on('error', (e) => res({ code: 0, body: String(e), json: null, setCookie: [] }));
    if (data) r.write(data);
    r.end();
  });
}

const jarOf = (r) => (r.setCookie || []).map((c) => c.split(';')[0]).join('; ');
const merge = (a, b) => {
  const m = new Map();
  for (const part of [a, b].filter(Boolean).join('; ').split('; ').filter(Boolean)) {
    const i = part.indexOf('=');
    m.set(part.slice(0, i), part.slice(i + 1));
  }
  return [...m.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
};

/**
 * Exactly what /super fires when the page mounts, in order, taken from
 * `loadAll()` in app/super/page.tsx. Three actions.
 *
 * That number is the whole point. The old brute-force budget was five per five
 * minutes, so one page load spent three of it, the Approve click spent the
 * fourth, and the reload that follows an approval spent the fifth and was
 * refused. Which is precisely the sequence the client described.
 */
async function pageLoad(ip) {
  const out = [];
  for (const action of ['overview', 'orders', 'flaggedTrials']) {
    out.push(await req('POST', '/api/super', { action, superKey: SU }, { ip }));
  }
  return out;
}

(async () => {
  console.log('\n=== THE BACK OFFICE, USED THE WAY THE CLIENT USES IT ===\n');
  const S = Date.now().toString(36);

  // A student who has really paid, so there is something to approve.
  const ip = '203.0.113.201';
  const signIn = await req('POST', '/api/auth/firebase', { idToken: `dev:bo-${S}`, fingerprint: `bo-${S}` }, { ip });
  let jar = jarOf(signIn);
  const created = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip, cookie: jar });
  jar = merge(jar, jarOf(created));
  const orderId = created.json?.data?.orderId;
  await req(
    'POST',
    '/api/payment',
    {
      action: 'submit',
      orderId,
      walletTxnId: `BO${S}`,
      payerName: 'Ramesh Thapa',
      // What a real student types at checkout. NOT phoneE164, which only
      // Firebase phone auth ever sets and which nobody here has.
      whatsappNumber: '+9779843805222',
      whatsappConfirmed: true,
      payerPhoneSuffix: '5222',
    },
    { ip, cookie: jar }
  );

  // ------------------------------------------------------------------ BO-1
  // The client's exact sequence, on ONE address, as one person at one desk.
  const desk = '203.0.113.202';
  const load1 = await pageLoad(desk);
  t(
    'BO-1',
    'Opening the dashboard does not spend the brute-force budget',
    load1.every((r) => r.code === 200),
    `page load returned ${load1.map((r) => r.code).join(',')} - a dashboard that fires three actions must not spend three of five attempts`
  );

  // ------------------------------------------------------------------ BO-2
  // He clicks Approve. This is the click that was refused.
  const approve = await req(
    'POST',
    '/api/super',
    { action: 'verifyPayment', superKey: SU, orderId, confirmedInWalletLedger: true },
    { ip: desk }
  );
  t(
    'BO-2',
    'Approve works immediately after a page load',
    approve.code === 200,
    `approve -> ${approve.code} "${approve.json?.error?.userMessage ?? ''}" - this is the exact click that told the client to wait five minutes`
  );

  // ------------------------------------------------------------------ BO-3
  // The page reloads everything after approving. That reload was throttled,
  // which is why the row still said "submitted" while the money was counted.
  const load2 = await pageLoad(desk);
  t(
    'BO-3',
    'The reload after approving is not throttled either',
    load2.every((r) => r.code === 200),
    `reload returned ${load2.map((r) => r.code).join(',')} - if this is refused, the screen keeps showing the old status`
  );

  const orders = load2[1].json?.data ?? [];
  const mine = orders.find((o) => o.id === orderId);
  t(
    'BO-4',
    'The row says approved, not submitted',
    mine?.state === 'verified',
    `row shows "${mine?.state}" after approving - the client saw "submitted" while the dashboard already counted him as paid`
  );

  const over = load2[0].json?.data;
  t(
    'BO-5',
    'And the counters agree with the row',
    (over?.counts?.ordersAwaiting ?? 99) === 0 && (over?.revenueNpr ?? 0) >= 449,
    `awaiting ${over?.counts?.ordersAwaiting}, revenue ${over?.revenueNpr} - two screens must never disagree about whether we have been paid`
  );

  // ------------------------------------------------------------------ BO-6
  // He has to be able to ring people. A directory with no number is a list.
  t(
    'BO-6',
    'Every approval request carries a number to ring',
    typeof mine?.payerPhone === 'string' && mine.payerPhone.length > 5 && mine.payerPhoneSuffix === '5222',
    `phone "${mine?.payerPhone}", paid-from suffix "${mine?.payerPhoneSuffix}"`
  );

  const dir = await req('POST', '/api/super', { action: 'directory', superKey: SU }, { ip: desk });
  const rows = dir.json?.data?.students ?? [];
  t(
    'BO-7',
    'And so does every student in the directory',
    Array.isArray(rows) &&
      rows.length > 0 &&
      rows.every((x) => 'whatsappNumber' in x && 'whatsappConfirmed' in x) &&
      rows.some((x) => x.whatsappNumber),
    `${rows.length} students, ${rows.filter((x) => x.whatsappNumber).length} with a number we could ring`
  );

  // ------------------------------------------------------------------ BO-8
  // The screen must actually READ those fields. Three times in this project a
  // feature existed on the server with nothing on screen calling it.
  const superPage = fs.readFileSync('app/super/page.tsx', 'utf8');
  t(
    'BO-8',
    'The screen actually renders the phone numbers it is sent',
    /tel:\$\{?[so]\.(payerPhone|phone)/.test(superPage) && (superPage.match(/>Phone</g) || []).length >= 2,
    'the API returned payerPhone and whatsappNumber for weeks and no screen ever read them'
  );

  // ------------------------------------------------------------------ BO-9
  // The budget that MUST stay: guessing the passcode.
  const attacker = '198.51.100.77';
  const guesses = [];
  for (let i = 0; i < 7; i += 1) {
    const g = await req('POST', '/api/super', { action: 'overview', superKey: `guess-${i}` }, { ip: attacker });
    guesses.push(g.code);
  }
  t(
    'BO-9',
    'Guessing the passcode is still throttled hard',
    guesses.includes(429),
    `seven wrong passcodes returned ${guesses.join(',')} - loosening this for the dashboard must not have loosened it for an attacker`
  );

  t(
    'BO-10',
    'And a throttled attacker cannot get in with the RIGHT key either',
    (await req('POST', '/api/super', { action: 'overview', superKey: SU }, { ip: attacker })).code === 429,
    'the lockout must apply to the address, not to the key that was tried'
  );

  // ----------------------------------------------------------------- BO-11
  // Two contradictory banners at once is worse than either alone.
  t(
    'BO-11',
    'The screen cannot show an error and a success at the same time',
    /setError\(null\);\s*\n\s*setNotice\(null\);/.test(superPage) &&
      /setError\(json\.error\.userMessage\);\s*\n\s*setNotice\(null\);/.test(superPage),
    'the client saw "Too many attempts" directly above "Payment verified and the pack was added"'
  );

  // ----------------------------------------------------------------- BO-12
  // Approving twice must never pay twice, however fast he clicks.
  const again = await req(
    'POST',
    '/api/super',
    { action: 'verifyPayment', superKey: SU, orderId, confirmedInWalletLedger: true },
    { ip: desk }
  );
  const meAfter = await req('GET', '/api/me', null, { ip, cookie: jar });
  t(
    'BO-12',
    'Approving twice grants once',
    again.code === 200 &&
      again.json?.data?.alreadyVerified === true &&
      (meAfter.json?.data?.entitlement?.mocksLeft ?? 0) <= 8,
    `second approve -> ${again.code} alreadyVerified=${again.json?.data?.alreadyVerified}, mocksLeft ${meAfter.json?.data?.entitlement?.mocksLeft}`
  );

  console.log(`\n  ${pass} passed, ${fail} failed, ${pass + fail} cases\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
