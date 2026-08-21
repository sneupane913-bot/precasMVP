/**
 * Fraud, money and recovery checks.
 *
 * Covers CHECKLIST-DEV I10 (the fraud pass in docs/LIFECYCLE_BUILD_SPEC.md
 * section 5), E11 (the payment journey including rejection and resubmission)
 * and H4 (the kill switch is always recoverable).
 *
 * Every one of these is a way the founder loses money or a student's private
 * answers leak, so a failure here is never cosmetic.
 *
 * Run:  QA_PORT=3012 node qa/fraud-check.js
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
const SUPER = process.env.SUPER_ADMIN_PASSCODE || QA_SUPER_KEY;
const OWNER = process.env.OWNER_ACCESS_KEY || QA_OWNER_KEY;

const jar = {};
function cookieHeader() {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}
function absorb(h) {
  (h['set-cookie'] || []).forEach((c) => {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    jar[kv.slice(0, i)] = kv.slice(i + 1);
  });
}
function req(method, path, body, opts = {}) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    // Every call gets its own source address unless the caller pins one.
    // The payment limiter is 10 per IP per hour and this suite legitimately
    // makes more than that, so sharing one address produced 429s that read
    // like product defects. Real students are not all behind one IP either.
    const headers = { 'x-forwarded-for': opts.ip || `10.60.${ipN >> 8 & 255}.${(ipN++ % 250) + 1}` };
    if (data) headers['Content-Type'] = 'application/json';
    if (!opts.noCookie && Object.keys(jar).length) headers['Cookie'] = cookieHeader();
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (resp) => {
      if (!opts.noCookie) absorb(resp.headers);
      let d = '';
      resp.on('data', (c) => (d += c));
      resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', (e) => res({ code: 0, body: String(e) }));
    if (data) r.write(data);
    r.end();
  });
}
let ipN = 0;
const J = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? '  <- ' + detail : ''}`);
  }
}

async function signIn(handle) {
  for (const k of Object.keys(jar)) delete jar[k];
  const r = await req('POST', '/api/auth/firebase', { idToken: `dev:${handle}` });
  // N-30: the welcome form is mandatory before any interview.
  let h = 7;
  for (const c of String(handle)) h = (h * 31 + c.charCodeAt(0)) | 0;
  await req('POST', '/api/student/profile',
    { fullName: `QA ${handle}`.slice(0, 60), whatsappNumber: '98' + String(Math.abs(h)).padStart(8, '0').slice(-8) });
  return J(r.body);
}

(async () => {
  console.log('\nFRAUD, MONEY AND RECOVERY CHECKS\n');

  // ---------------------------------------------------------------- section 5.2
  console.log('Client cannot buy itself anything (spec 5.2)');
  {
    await signIn('fraudA');
    const r = await req('POST', '/api/session/create', {
      institution: 'bpp-university',
      mode: 'test',
      isTrial: false,
      plan: 'pro',
      credits: 9999,
      maxQuestionsPerMock: 99,
      entitlement: 'unlimited',
    });
    const j = J(r.body);
    const count = j?.ok ? j.data.questions.length : -1;
    check('injected plan/credits ignored, still the trial length', count === 10, `got ${count}`);
  }

  // ---------------------------------------------------------------- section 5.5
  console.log('\nPrivilege climb (spec 5.5)');
  {
    const a = await req('POST', '/api/super', { action: 'overview', superKey: 'definitely-wrong' });
    check('wrong super key refused', a.code === 403, `code ${a.code}`);

    const b = await req('POST', '/api/platform', {
      action: 'setMaintenance',
      ownerKey: SUPER,
      enabled: true,
    });
    check('super passcode cannot work the owner switch', b.code === 403, `code ${b.code}`);

    const c = await req('POST', '/api/super', { action: 'overview', superKey: OWNER });
    check('owner key is not a super key', c.code === 403, `code ${c.code}`);
  }

  // ---------------------------------------------------------------- section 5.3
  console.log('\nPayment: double claim, rejection, resubmission (spec 5.3, E11)');
  {
    await signIn('payer1');
    const created = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    const orderId = created?.data?.orderId;
    check('order created', Boolean(orderId));

    const txn = 'TXN-' + Date.now();
    const s1 = await req('POST', '/api/payment', {
      action: 'submit',
      orderId,
      walletTxnId: txn,
      payerName: 'QA Payer',
      payerPhoneSuffix: '5222',
    });
    check('first submit accepted', s1.code === 200, `code ${s1.code}`);

    // A second student claiming the SAME wallet transaction id is the classic
    // screenshot-reuse fraud.
    await signIn('payer2');
    const other = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    const s2 = await req('POST', '/api/payment', {
      action: 'submit',
      orderId: other?.data?.orderId,
      walletTxnId: txn,
      payerName: 'QA Thief',
      payerPhoneSuffix: '5222',
    });
    check('same wallet txn id cannot be claimed twice', s2.code >= 400 && s2.code < 500, `code ${s2.code}`);

    // Approve once, then again. The second must not hand out a second pack.
    const v1 = await req('POST', '/api/super', {
      action: 'verifyPayment',
      superKey: SUPER,
      orderId,
      confirmedInWalletLedger: true,
    });
    check('approval succeeds', v1.code === 200, `code ${v1.code}`);
    const v2 = await req('POST', '/api/super', {
      action: 'verifyPayment',
      superKey: SUPER,
      orderId,
      confirmedInWalletLedger: true,
    });
    const j2 = J(v2.body);
    check(
      're-approving never grants a second pack',
      v2.code === 200 && j2?.data?.alreadyVerified === true,
      JSON.stringify(j2?.data)
    );

    // Rejection then resubmission.
    await signIn('payer3');
    const o3 = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    await req('POST', '/api/payment', {
      action: 'submit',
      orderId: o3?.data?.orderId,
      walletTxnId: 'TXN-R-' + Date.now(),
      payerName: 'QA Reject',
      payerPhoneSuffix: '5222',
    });
    const rej = await req('POST', '/api/super', {
      action: 'rejectPayment',
      superKey: SUPER,
      orderId: o3?.data?.orderId,
      reason: 'could not find it in the wallet ledger',
    });
    check('rejection works', rej.code === 200, `code ${rej.code}`);

    const o4 = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    const s4 = await req('POST', '/api/payment', {
      action: 'submit',
      orderId: o4?.data?.orderId,
      walletTxnId: 'TXN-R2-' + Date.now(),
      payerName: 'QA Reject',
      payerPhoneSuffix: '5222',
    });
    check('student can submit a fresh payment after rejection', s4.code === 200, `code ${s4.code}`);

    const after = await req('POST', '/api/super', {
      action: 'verifyPayment',
      superKey: SUPER,
      orderId: o3?.data?.orderId,
      confirmedInWalletLedger: true,
    });
    check('a rejected order cannot then be approved', after.code >= 400 && after.code < 500, `code ${after.code}`);
  }

  // --------------------------------------------------------------- section 5.10
  console.log('\nStudent privacy (spec 5.10)');
  {
    const sup = await req('POST', '/api/super', { action: 'overview', superKey: SUPER });
    const leaks = /"transcript"|"answers"|"evaluation"|"modelAnswer"/.test(sup.body);
    check('super admin overview carries no answer content', !leaks);
    check('super admin overview carries no passcode', !/"passcode"/.test(sup.body));
  }

  // ------------------------------------------------------------------------ H4
  console.log('\nKill switch is always recoverable (H4)');
  {
    const on = await req('POST', '/api/platform', {
      action: 'setMaintenance',
      ownerKey: OWNER,
      enabled: true,
      title: 'QA pause',
      message: 'QA is testing the switch.',
      contactName: 'QA',
      contactPhone: '9843805222',
    });
    check('owner can pause the platform', on.code === 200, `code ${on.code}`);

    const blocked = await req('POST', '/api/session/create', {
      institution: 'bpp-university',
      mode: 'test',
    });
    check('student API refuses while paused', blocked.code === 503, `code ${blocked.code}`);

    const off = await req('POST', '/api/platform', {
      action: 'setMaintenance',
      ownerKey: OWNER,
      enabled: false,
    });
    check('owner can resume the platform', off.code === 200, `code ${off.code}`);

    const j = J(off.body);
    check(
      'every toggle is recorded with a time and a source',
      Array.isArray(j?.data?.ownerAudit) && j.data.ownerAudit.length >= 2,
      `entries ${j?.data?.ownerAudit?.length}`
    );

    await signIn('afterResume');
    const back = await req('POST', '/api/session/create', {
      institution: 'bpp-university',
      mode: 'test',
    });
    check('students can practise again after resuming', back.code === 200, `code ${back.code}`);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})();
