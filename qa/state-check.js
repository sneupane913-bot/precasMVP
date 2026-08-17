/**
 * STATE, AND THE SOFT NO.
 *
 * The client's rule, in his words: "anywhere the state needs to be preserved,
 * we are going to assume the user is going to just do one thing and then come
 * back."
 *
 * There are four such places, and they are the four where losing state costs
 * something real:
 *
 *   1. the free ten           lose it and they lose their only free try
 *   2. a paid mock            lose it and they lose a mock they paid for
 *   3. a practice question    lose it and they lose a practice credit
 *   4. the checkout           lose it and they either pay twice or not at all
 *
 * The second rule: a refusal is always SOFT. A rejected payment must say why in
 * the approver's own words, stay recoverable, and carry a way to reach a person.
 * A student who has sent real money and is told only "we could not match that"
 * has been given no way to help themselves.
 *
 * Every case here DRIVES the running product. None of it reads source.
 *
 * Run:  QA_PORT=3130 node qa/state-check.js
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

const P = Number(process.env.QA_PORT || 3130);
const SU = process.env.SUPER_ADMIN_PASSCODE || QA_SUPER_KEY;

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
    const headers = { 'x-forwarded-for': opts.ip || '203.0.113.170' };
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
          /* */
        }
        res({ code: resp.statusCode, json, body: d, setCookie: resp.headers['set-cookie'] || [] });
      });
    });
    r.on('error', (e) => res({ code: 0, json: null, body: String(e), setCookie: [] }));
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

function answer(sid, qid, cookie, ip) {
  const b = '----st' + Math.random();
  const audio = Buffer.alloc(40 * 1024, 1);
  const payload = Buffer.concat([
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="questionId"\r\n\r\n${qid}\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="durationSeconds"\r\n\r\n30\r\n`),
    Buffer.from(
      `--${b}\r\nContent-Disposition: form-data; name="audio"; filename="a.webm"\r\nContent-Type: audio/webm\r\n\r\n`
    ),
    audio,
    Buffer.from(`\r\n--${b}--\r\n`),
  ]);
  return new Promise((res) => {
    const r = http.request(
      {
        host: '127.0.0.1',
        port: P,
        path: `/api/session/${sid}/answer`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${b}`,
          'Content-Length': payload.length,
          'x-forwarded-for': ip,
          Cookie: cookie,
        },
      },
      (resp) => {
        let d = '';
        resp.on('data', (c) => (d += c));
        resp.on('end', () => res({ code: resp.statusCode, body: d }));
      }
    );
    r.on('error', () => res({ code: 0, body: '' }));
    r.write(payload);
    r.end();
  });
}

/** A signed-in student with their own address and cookie jar. */
async function newStudent(tag, ip) {
  const r = await req('POST', '/api/auth/firebase', { idToken: `dev:${tag}`, fingerprint: tag }, { ip });
  // `cookie` is the name `req` reads. Naming it `jar` here silently sent every
  // later request signed out, which is a good reminder that a test harness can
  // fail in exactly the way the product must not.
  return { cookie: jarOf(r), ip };
}

(async () => {
  console.log('\n=== STATE IS PRESERVED, AND NO IS ALWAYS SOFT ===\n');
  const S = Date.now().toString(36);

  // ================================================================ ST-1..4
  // 1. THE FREE TEN. Answer one, walk away, come back.
  {
    const s = await newStudent(`st-trial-${S}`, '203.0.113.171');
    const c = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, s);
    s.cookie = merge(s.cookie, jarOf(c));
    const sid = c.json?.data?.sessionId;
    const qs = c.json?.data?.questions ?? [];

    await req('POST', `/api/session/${sid}/consent`, { version: '2026-08-10.1' }, s);
    await answer(sid, qs[0].id, s.cookie, s.ip);

    // He closes the tab. Coming back is a fresh page load: /api/me, then start.
    const me = await req('GET', '/api/me', null, s);
    const ip1 = me.json?.data?.entitlement?.inProgress;
    t(
      'ST-1',
      'One answer in, the product knows exactly where he is',
      ip1 && ip1.sessionId === sid && ip1.answered === 1 && ip1.total === 10,
      `inProgress = ${JSON.stringify(ip1)}`
    );

    const back = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, s);
    t(
      'ST-2',
      'Coming back hands him the SAME sitting, not a new one',
      back.json?.data?.sessionId === sid && back.json?.data?.resumed === true,
      `same session ${back.json?.data?.sessionId === sid}, resumed ${back.json?.data?.resumed}`
    );
    t(
      'ST-3',
      'And it tells the screen he has 1 of 10 done, so 9 are left',
      back.json?.data?.answered === 1,
      `answered = ${back.json?.data?.answered}. Without this the screen would start him at question one again.`
    );

    const meAfter = await req('GET', '/api/me', null, s);
    t(
      'ST-4',
      'Coming back did NOT cost him a second credit',
      meAfter.json?.data?.entitlement?.mocksLeft === 0,
      `mocksLeft ${meAfter.json?.data?.entitlement?.mocksLeft}. He spent one on the sitting he is still in.`
    );

    // The answer he already gave is still there, not silently dropped.
    const sess = await req('GET', `/api/session/${sid}`, null, s);
    t(
      'ST-5',
      'The answer he already gave is still recorded, and the room knows where to restart',
      sess.json?.data?.answeredCount === 1 && sess.json?.data?.resumeIndex === 1,
      `answeredCount ${sess.json?.data?.answeredCount}, resumeIndex ${sess.json?.data?.resumeIndex}. The room needs both: what is done, and which question to open.`
    );
  }

  // ================================================================ ST-6..9
  // 2 and 3. A PAID student, mid-mock and mid-practice.
  {
    const s = await newStudent(`st-paid-${S}`, '203.0.113.172');

    // Spend the trial properly so the paid path is the one under test.
    const t1 = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, s);
    s.cookie = merge(s.cookie, jarOf(t1));
    const tid = t1.json?.data?.sessionId;
    await req('POST', `/api/session/${tid}/consent`, { version: '2026-08-10.1' }, s);
    await answer(tid, t1.json.data.questions[0].id, s.cookie, s.ip);
    await req('POST', `/api/session/${tid}/complete`, {}, s);

    const order = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, s);
    const oid = order.json?.data?.orderId;
    await req(
      'POST',
      '/api/payment',
      { action: 'submit', orderId: oid, walletTxnId: `ST${S}`, payerName: 'Ram', payerPhoneSuffix: '5222' },
      s
    );
    await req('POST', '/api/super', { action: 'verifyPayment', superKey: SU, orderId: oid, confirmedInWalletLedger: true }, { ip: '198.51.120.5' });

    // Mid-mock.
    const m = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, s);
    const mid = m.json?.data?.sessionId;
    await req('POST', `/api/session/${mid}/consent`, { version: '2026-08-10.1' }, s);
    await answer(mid, m.json.data.questions[0].id, s.cookie, s.ip);
    const beforeLeave = (await req('GET', '/api/me', null, s)).json?.data?.entitlement?.mocksLeft;

    const backM = await req('POST', '/api/session/create', { institution: 'coventry-university', mode: 'test' }, s);
    t(
      'ST-6',
      'A paid mock resumes too, even from a different university',
      backM.json?.data?.sessionId === mid && backM.json?.data?.resumed === true,
      `same session ${backM.json?.data?.sessionId === mid}, resumed ${backM.json?.data?.resumed}`
    );
    t(
      'ST-7',
      'And it names the university the sitting really belongs to',
      backM.json?.data?.institutionName === 'BPP University',
      `named "${backM.json?.data?.institutionName}". Tapping Coventry must not silently answer BPP questions.`
    );
    const afterLeave = (await req('GET', '/api/me', null, s)).json?.data?.entitlement?.mocksLeft;
    t(
      'ST-8',
      'Leaving and returning cost him nothing',
      beforeLeave === afterLeave,
      `mocks ${beforeLeave} -> ${afterLeave}`
    );

    await req('POST', `/api/session/${mid}/complete`, {}, s);

    // Mid-practice.
    const p1 = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'practice' }, s);
    const pid = p1.json?.data?.sessionId;
    const pBefore = (await req('GET', '/api/me', null, s)).json?.data?.entitlement?.practiceLeft;
    const p2 = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'practice' }, s);
    t(
      'ST-9',
      'Reopening practice gives back the SAME question, not a new one',
      p2.json?.data?.sessionId === pid && p2.json?.data?.reopened === true,
      `same session ${p2.json?.data?.sessionId === pid}. Otherwise every reload leaves an orphan sitting behind.`
    );
    const pAfter = (await req('GET', '/api/me', null, s)).json?.data?.entitlement?.practiceLeft;
    t('ST-10', 'And practice was not charged twice', pBefore === pAfter, `practice ${pBefore} -> ${pAfter}`);

    // A practice sitting must never swallow a mock.
    t(
      'ST-11',
      'An open PRACTICE sitting does not block starting a mock',
      (await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, s)).code === 200,
      'the two are separate purses and separate sittings'
    );
  }

  // ============================================================== ST-12..18
  // 4. THE CHECKOUT, and the soft no.
  {
    const s = await newStudent(`st-pay-${S}`, '203.0.113.173');
    const c1 = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, s);
    s.cookie = merge(s.cookie, jarOf(c1));
    const oid = c1.json?.data?.orderId;

    t(
      'ST-12',
      'The checkout tells the student how long a person will take',
      typeof c1.json?.data?.waitHours === 'number' && c1.json.data.waitHours >= 1,
      `waitHours = ${c1.json?.data?.waitHours}. "It can take a little time" tells somebody who has sent money nothing at all.`
    );

    // He reaches the QR, thinks better of it, and closes the tab.
    const c2 = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, s);
    t(
      'ST-13',
      'Coming back to the checkout resumes the same payment',
      c2.json?.data?.orderId === oid,
      `order ${c2.json?.data?.orderId === oid ? 'reused' : 'DUPLICATED'}`
    );
    const meNo = await req('GET', '/api/me', null, s);
    t(
      'ST-14',
      'And reaching the QR without sending money grants nothing',
      meNo.json?.data?.entitlement?.hasPaid === false,
      `hasPaid = ${meNo.json?.data?.entitlement?.hasPaid}`
    );

    // Now he really pays, and we cannot find it.
    await req(
      'POST',
      '/api/payment',
      { action: 'submit', orderId: oid, walletTxnId: `STP${S}`, payerName: 'Hari', payerPhoneSuffix: '1111' },
      s
    );
    const reason = 'The transaction number is one digit short. Please check it in your wallet app.';
    await req(
      'POST',
      '/api/super',
      { action: 'rejectPayment', superKey: SU, orderId: oid, reason },
      { ip: '198.51.120.6' }
    );

    const status = await req('POST', '/api/payment', { action: 'status', orderId: oid }, s);
    t(
      'ST-15',
      'A rejected student is told WHY, in the approver own words',
      status.json?.data?.rejectedReason === reason,
      `got "${status.json?.data?.rejectedReason}". "We could not match it" is not something a student can act on.`
    );
    t(
      'ST-16',
      'And is given a number to reach a person on',
      typeof status.json?.data?.supportWhatsapp === 'string',
      'a refusal with no way to reach anybody is a dead end'
    );

    const retry = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, s);
    t(
      'ST-17',
      'The no is SOFT: he can immediately start again',
      retry.code === 200 && retry.json?.data?.orderId,
      `-> ${retry.code}. A rejection he cannot work around would strand somebody who really did pay.`
    );
    t(
      'ST-18',
      'And starting again gives him a FRESH order, not the rejected one',
      retry.json?.data?.orderId !== oid,
      'reusing a rejected order would carry its rejection forward'
    );

    // The corrected number goes through.
    const fixed = await req(
      'POST',
      '/api/payment',
      {
        action: 'submit',
        orderId: retry.json.data.orderId,
        walletTxnId: `STP${S}-FIXED`,
        payerName: 'Hari',
        payerPhoneSuffix: '1111',
      },
      s
    );
    t('ST-19', 'The corrected number is accepted', fixed.code === 200, `-> ${fixed.code}`);

    await req(
      'POST',
      '/api/super',
      { action: 'verifyPayment', superKey: SU, orderId: retry.json.data.orderId, confirmedInWalletLedger: true },
      { ip: '198.51.120.7' }
    );
    const paid = await req('GET', '/api/me', null, s);
    /**
     * The pack size is read from what the checkout OFFERED, never typed here.
     *
     * This assertion originally hard-coded 6 and went red the moment the packs
     * were repriced to 3 mocks. A number typed into a test is the same
     * two-sources-of-truth fault that `copy-check` fails the build for in the
     * product, and a test is not exempt from its own rule.
     */
    const promised = retry.json?.data?.mocks ?? c1.json?.data?.mocks ?? 0;
    t(
      'ST-20',
      'Approval is INSTANT: the credits offered are there on the very next request',
      promised > 0 && (paid.json?.data?.entitlement?.mocksLeft ?? 0) >= promised,
      `the checkout promised ${promised} mocks, the account has ${paid.json?.data?.entitlement?.mocksLeft}. No queue, no delay, no "wait five minutes".`
    );
  }

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
