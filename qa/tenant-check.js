/**
 * Tenant isolation and seat allocation (F7, F9, F10).
 *
 * Run it the same way as lifecycle-check.js: see qa/README.md. It needs a dev
 * server (never `next start`) and no `.env.local` in the mirror.
 *
 * Every student here signs in from a DIFFERENT x-forwarded-for. That is not a
 * trick to dodge the rate limiter, it is what the limiter is for: five sign-in
 * attempts per IP per five minutes is exactly the control that makes passcode
 * brute force impractical, and weakening it for a test would be testing a
 * product we do not ship. Ten students on ten connections is the real case.
 */
const http = require('http');

/**
 * The back-office passcodes, READ FROM THE ENVIRONMENT.
 *
 * These were the literals 'super-dev' and 'owner-dev'. On any machine with a
 * real `.env.local` — which is every machine that can actually run the product
 * — each back-office call came back 403 "bad credentials", and the suites
 * reported that as PRODUCT defects. `walk-check` produced twenty-three of them
 * in one run. `lifecycle-check` E8 printed "second=DOUBLE GRANTED" when nothing
 * had been granted at all, because the FIRST approval had been refused.
 *
 * A suite that reports a wrong password as a double grant is worse than no
 * suite. The next person reads twenty-three findings, discovers the first two
 * are nonsense, and stops reading — and a real one is sitting at number
 * nineteen. It is the same lesson as R-6's false positive on /refund: fix the
 * harness, never relax the rule.
 *
 * The literal stays as the fallback, because a fresh clone with no `.env.local`
 * really does run on the dev defaults.
 */
const QA_SUPER_KEY = process.env.SUPER_ADMIN_PASSCODE || 'super-dev';
const QA_OWNER_KEY = process.env.OWNER_ACCESS_KEY || process.env.OWNER_PASSCODE || 'owner-dev';

const P = Number(process.env.QA_PORT || 3012);

function call(path, body, { ip = '10.0.0.1', cookie = null } = {}) {
  return new Promise((res) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'x-forwarded-for': ip,
    };
    if (cookie) headers['Cookie'] = cookie;
    const r = http.request({ host: '127.0.0.1', port: P, path, method: 'POST', headers }, (x) => {
      let d = '';
      x.on('data', (c) => (d += c));
      x.on('end', () => {
        let j = null;
        try { j = JSON.parse(d); } catch { /* leave null */ }
        res({ code: x.statusCode, json: j, cookies: x.headers['set-cookie'] || [] });
      });
    });
    r.on('error', (e) => res({ code: 0, json: null, err: String(e) }));
    r.write(data);
    r.end();
  });
}

const SUPER = QA_SUPER_KEY;
/**
 * Every super-admin call below uses its OWN 10.9.9.x address. The auth limiter
 * is five attempts per IP per five minutes, and this suite legitimately makes
 * more than five. An earlier version reused one address, silently got a 429 on
 * the sixth call, and a later assertion failed for a reason that had nothing to
 * do with the thing under test.
 */
let pass = 0, fail = 0;
const t = (id, ok, detail) => { ok ? pass++ : fail++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(12)} ${detail}`); };

const SEATS = 3;
const OVERSUBSCRIBE = 6;

(async () => {
  const stamp = Date.now().toString(36);
  const A = { slug: `qa-a-${stamp}`, passcode: 'passA123' };
  const B = { slug: `qa-b-${stamp}`, passcode: 'passB123' };

  for (const c of [A, B]) {
    const made = await call('/api/platform', {
      action: 'createConsultancy', superKey: SUPER,
      name: c.slug, slug: c.slug, seatsTotal: SEATS, paidNpr: 6000, passcode: `handover-${c.slug}`,
    }, { ip: '10.9.9.1' });
    c.id = made.json?.data?.id;
    await call('/api/platform', {
      action: 'setConsultancyStatus', superKey: SUPER, consultancyId: c.id, status: 'approved',
    }, { ip: '10.9.9.2' });
    // First login replaces the handover code, as a real admin must.
    await call('/api/admin', {
      action: 'changePasscode', slug: c.slug, passcode: `handover-${c.slug}`, newPasscode: c.passcode,
    }, { ip: '10.9.9.3' });
  }
  t('setup', !!A.id && !!B.id, `two approved consultancies with ${SEATS} seats each`);

  // F7: more students than seats, all at once. Exactly SEATS may be seated.
  const signups = await Promise.all(
    Array.from({ length: OVERSUBSCRIBE }, (_, i) =>
      call('/api/auth/firebase',
        { idToken: `dev:qa-seat-${stamp}-${i}`, fingerprint: `fp-${i}`, via: A.slug },
        { ip: `10.1.0.${i + 1}` })
    )
  );
  const created = signups.filter((s) => s.json?.data?.isNew).length;
  t('F7-signup', created === OVERSUBSCRIBE, `${created} of ${OVERSUBSCRIBE} accounts created (nobody turned away)`);

  const adminA = await call('/api/admin', { action: 'login', slug: A.slug, passcode: A.passcode }, { ip: '10.8.8.1' });
  const statsA = adminA.json?.data?.stats;
  t('F7-seats', statsA?.seatsUsed === SEATS && statsA?.seatsLeft === 0,
    `${OVERSUBSCRIBE} simultaneous signups against ${SEATS} seats -> used=${statsA?.seatsUsed} left=${statsA?.seatsLeft} (never more than ${SEATS})`);

  // A seated student got the seat grant on top of the trial; an unseated one
  // keeps the trial only. Both must exist, which proves the seat is real and
  // that running out does not break the signup.
  const balances = (adminA.json?.data?.students ?? []).map((s) => s.mocksLeft).sort((a, b) => b - a);
  t('F7-grant', balances.filter((b) => b > 1).length === SEATS && balances.filter((b) => b === 1).length === OVERSUBSCRIBE - SEATS,
    `mock balances ${JSON.stringify(balances)} (${SEATS} seated, ${OVERSUBSCRIBE - SEATS} on the free trial)`);

  // F9: B's students are B's. A cannot name B by any field in the request.
  await call('/api/auth/firebase',
    { idToken: `dev:qa-b-student-${stamp}`, fingerprint: 'fp-b', via: B.slug },
    { ip: '10.2.0.1' });

  const injected = await call('/api/admin', {
    action: 'login', slug: A.slug, passcode: A.passcode,
    consultancyId: B.id, slugOverride: B.slug, tenant: B.id,
  }, { ip: '10.8.8.2' });
  const namesA = (injected.json?.data?.students ?? []).map((s) => s.id);
  const adminB = await call('/api/admin', { action: 'login', slug: B.slug, passcode: B.passcode }, { ip: '10.8.8.3' });
  const namesB = (adminB.json?.data?.students ?? []).map((s) => s.id);
  const overlap = namesA.filter((id) => namesB.includes(id));
  t('F9-inject', overlap.length === 0 && namesA.length === OVERSUBSCRIBE && namesB.length === 1,
    `A sees ${namesA.length}, B sees ${namesB.length}, shared students: ${overlap.length}`);

  const wrongPass = await call('/api/admin', { action: 'login', slug: B.slug, passcode: A.passcode }, { ip: '10.8.8.4' });
  t('F9-cred', wrongPass.code === 403, `A's passcode against B's slug -> ${wrongPass.code}`);

  // F10: a student who came in off the street belongs to nobody.
  await call('/api/auth/firebase', { idToken: `dev:qa-direct-${stamp}`, fingerprint: 'fp-d' }, { ip: '10.3.0.1' });
  const afterDirect = await call('/api/admin', { action: 'login', slug: A.slug, passcode: A.passcode }, { ip: '10.8.8.5' });
  const countAfter = (afterDirect.json?.data?.students ?? []).length;
  t('F10', countAfter === OVERSUBSCRIBE,
    `direct student signed up; A still sees ${countAfter} (must stay ${OVERSUBSCRIBE})`);

  // A consultancy that is not approved reads nothing at all.
  await call('/api/platform', { action: 'setConsultancyStatus', superKey: SUPER, consultancyId: B.id, status: 'suspended' }, { ip: '10.9.9.3' });
  const suspended = await call('/api/admin', { action: 'login', slug: B.slug, passcode: B.passcode }, { ip: '10.8.8.6' });
  t('F9-status', suspended.code === 403 && !suspended.json?.data,
    `suspended consultancy -> ${suspended.code}, no data returned`);

  // ---- E9 / E10: who may approve a payment ------------------------------
  // Re-approve B so it can act again.
  await call('/api/platform', { action: 'setConsultancyStatus', superKey: SUPER, consultancyId: B.id, status: 'approved' }, { ip: '10.9.9.4' });

  // A student of A pays.
  const stu = await call('/api/auth/firebase',
    { idToken: `dev:qa-pay-${stamp}`, fingerprint: 'fp-pay', via: A.slug }, { ip: '10.4.0.1' });
  const cookie = (stu.cookies || []).map((c) => c.split(';')[0]).join('; ');
  const made = await call('/api/payment', { action: 'create', packCode: 'prep' }, { ip: '10.4.0.1', cookie });
  const oid = made.json?.data?.orderId;
  await call('/api/payment',
    { action: 'submit', orderId: oid, walletTxnId: `TXN${stamp}`, payerName: 'QA', payerPhoneSuffix: '1234' },
    { ip: '10.4.0.1', cookie });

  // B must not be able to touch A's order, even holding a valid id.
  const cross = await call('/api/admin',
    { action: 'approvePayment', slug: B.slug, passcode: B.passcode, orderId: oid, confirmedReceived: true },
    { ip: '10.8.8.7' });
  t('E9-cross', cross.code === 404, `consultancy B approving consultancy A's order -> ${cross.code}`);

  // A may approve its own.
  const own = await call('/api/admin',
    { action: 'approvePayment', slug: A.slug, passcode: A.passcode, orderId: oid, confirmedReceived: true },
    { ip: '10.8.8.8' });
  t('E9', own.json?.ok === true && own.json?.data?.granted?.mocks === 3,
    `consultancy A approving its own student -> granted ${own.json?.data?.granted?.mocks} mocks`);

  // Approving twice must not pay twice.
  const again = await call('/api/admin',
    { action: 'approvePayment', slug: A.slug, passcode: A.passcode, orderId: oid, confirmedReceived: true },
    { ip: '10.8.8.9' });
  t('E9-once', again.json?.data?.alreadyVerified === true,
    `second approval -> ${again.json?.data?.alreadyVerified ? 'refused' : 'DOUBLE GRANTED'}`);

  // E10: the super admin approving a consultancy's student must TELL them.
  const stu2 = await call('/api/auth/firebase',
    { idToken: `dev:qa-pay2-${stamp}`, fingerprint: 'fp-pay2', via: A.slug }, { ip: '10.5.0.1' });
  const ck2 = (stu2.cookies || []).map((c) => c.split(';')[0]).join('; ');
  const made2 = await call('/api/payment', { action: 'create', packCode: 'prep' }, { ip: '10.5.0.1', cookie: ck2 });
  await call('/api/payment',
    { action: 'submit', orderId: made2.json?.data?.orderId, walletTxnId: `TXN2${stamp}`, payerName: 'QA', payerPhoneSuffix: '1234' },
    { ip: '10.5.0.1', cookie: ck2 });
  const beforeN = (await call('/api/admin', { action: 'login', slug: A.slug, passcode: A.passcode }, { ip: '10.7.7.1' })).json?.data?.notifications?.length ?? 0;
  await call('/api/super',
    { action: 'verifyPayment', superKey: SUPER, orderId: made2.json?.data?.orderId, confirmedInWalletLedger: true },
    { ip: '10.9.9.5' });
  const afterLogin = (await call('/api/admin', { action: 'login', slug: A.slug, passcode: A.passcode }, { ip: '10.7.7.2' })).json?.data;
  const afterN = afterLogin?.notifications?.length ?? 0;
  t('E10', afterN === beforeN + 1,
    `super admin approved A's student: A's notifications ${beforeN} -> ${afterN}`);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
