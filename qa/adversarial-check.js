/**
 * Adversarial checks: the scenarios a student actually tries.
 *
 * Written as a bug hunt, not a confirmation. Each case is something the client
 * named as a way the product could be cheated or could disappoint, and each one
 * asserts the OUTCOME a student experiences, not merely that an endpoint exists.
 *
 * Run:  QA_PORT=3030 node qa/adversarial-check.js
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

const P = Number(process.env.QA_PORT || 3030);
const SUPER = process.env.SUPER_ADMIN_PASSCODE || QA_SUPER_KEY;

let jar = {};
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
    const headers = {};
    if (data) headers['Content-Type'] = 'application/json';
    if (!opts.noCookie && Object.keys(jar).length)
      headers['Cookie'] = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    if (opts.ip) headers['x-forwarded-for'] = opts.ip;
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (resp) => {
      absorb(resp.headers);
      let d = '';
      resp.on('data', (c) => (d += c));
      resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', (e) => res({ code: 0, body: String(e) }));
    if (data) r.write(data);
    r.end();
  });
}
const J = (s) => { try { return JSON.parse(s); } catch { return null; } };

let pass = 0, fail = 0;
const bugs = [];
function t(name, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  PASS  ${name}`); }
  else { fail += 1; bugs.push(`${name} :: ${detail}`); console.log(`  BUG   ${name}\n        ${detail}`); }
}

async function signIn(handle, opts = {}) {
  jar = {};
  const r = await req('POST', '/api/auth/firebase',
    { idToken: `dev:${handle}`, fingerprint: opts.fingerprint, via: opts.via }, opts);
  return J(r.body);
}

/** Answer a question so a mock credit is genuinely consumed. */
async function answerOnce(sid, qid) {
  const b = '----qa' + Date.now();
  const audio = Buffer.alloc(40 * 1024, 1);
  const parts = [
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="questionId"\r\n\r\n${qid}\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="durationSeconds"\r\n\r\n30\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="audio"; filename="a.webm"\r\nContent-Type: audio/webm\r\n\r\n`),
    audio, Buffer.from(`\r\n--${b}--\r\n`),
  ];
  const payload = Buffer.concat(parts);
  return new Promise((res) => {
    const r = http.request({
      host: '127.0.0.1', port: P, path: `/api/session/${sid}/answer`, method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${b}`,
        'Content-Length': payload.length,
        Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '),
      },
    }, (resp) => { let d = ''; resp.on('data', c => d += c); resp.on('end', () => res({ code: resp.statusCode, body: d })); });
    r.on('error', () => res({ code: 0, body: '' }));
    r.write(payload); r.end();
  });
}

(async () => {
  console.log('\nADVERSARIAL CHECKS: what a student actually tries\n');

  // ---------------------------------------------------------------- CASE 1
  console.log('CASE 1  Trial student finishes the free ten, then tries a second mock without paying');
  {
    await signIn('adv_trial');
    const s1 = J((await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' })).body);
    const sid = s1?.data?.sessionId;
    const qid = s1?.data?.questions?.[0]?.id;
    t('  free trial gives exactly 10 questions', s1?.data?.questions?.length === 10, `got ${s1?.data?.questions?.length}`);

    await answerOnce(sid, qid);           // burns the single trial mock credit
    await req('POST', `/api/session/${sid}/complete`, {});

    const me = J((await req('GET', '/api/me')).body);
    t('  after the trial, no mocks remain', me?.data?.entitlement?.mocksLeft === 0, `mocksLeft=${me?.data?.entitlement?.mocksLeft}`);
    t('  the product says they cannot start another', me?.data?.entitlement?.canStartMock === false, `canStartMock=${me?.data?.entitlement?.canStartMock}`);

    // THE question the client asked: can they just start another one?
    const s2 = await req('POST', '/api/session/create', { institution: 'coventry-university', mode: 'test' });
    t('  starting a SECOND mock without paying is refused',
      s2.code === 402 || s2.code === 403,
      `create returned ${s2.code}. A student with zero credits can still open a whole interview and is only stopped when they speak.`);
  }

  // ---------------------------------------------------------------- CASE 2
  console.log('\nCASE 2  Student pays, and must then get 17 questions and the pack of mocks');
  {
    await signIn('adv_payer');
    const first = J((await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' })).body);
    await answerOnce(first?.data?.sessionId, first?.data?.questions?.[0]?.id);
    await req('POST', `/api/session/${first?.data?.sessionId}/complete`, {});

    const order = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    await req('POST', '/api/payment', {
      action: 'submit', orderId: order?.data?.orderId,
      walletTxnId: 'ADV-' + Date.now(), payerName: 'QA', payerPhoneSuffix: '5222',
    });
    const payerJar = { ...jar };
    await req('POST', '/api/super', { action: 'verifyPayment', superKey: SUPER, orderId: order?.data?.orderId, confirmedInWalletLedger: true });
    jar = payerJar;

    const me = J((await req('GET', '/api/me')).body);
    // Prep is 3 mocks since the 13 Aug price change (M-8), plus the free trial
    // and possibly the post-trial bonus. This still demanded 6, the old pack
    // size, so it was asserting a product we no longer sell.
    t('  paying grants the pack of mocks', (me?.data?.entitlement?.mocksLeft ?? 0) >= 3, `mocksLeft=${me?.data?.entitlement?.mocksLeft}`);
    t('  entitlement now allows 17 questions', me?.data?.entitlement?.questionsAllowed === 17, `questionsAllowed=${me?.data?.entitlement?.questionsAllowed}`);

    // The one that matters: does a NEW interview actually contain 17 questions?
    const paid = J((await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' })).body);
    t('  a paid mock actually CONTAINS 17 questions',
      paid?.data?.questions?.length === 17,
      `the new session has ${paid?.data?.questions?.length} questions. The student paid for the remaining 7 and did not receive them.`);
  }

  // ---------------------------------------------------------------- CASE 3
  console.log('\nCASE 3  Same device, same network, a second Gmail, chasing another free ten');
  {
    await signIn('adv_dev_a', { fingerprint: 'fp_same_device', ip: '203.0.113.9' });
    const a = J((await req('GET', '/api/me')).body);
    t('  first account on the device gets its trial', (a?.data?.entitlement?.mocksLeft ?? 0) >= 1);

    let last = null;
    for (const n of ['b', 'c', 'd', 'e', 'f']) {
      last = await signIn(`adv_dev_${n}`, { fingerprint: 'fp_same_device', ip: '203.0.113.9' });
    }
    t('  repeat accounts on one device are eventually held back',
      last?.data?.trial?.outcome === 'soft_denied',
      `the sixth Google account on the same device and IP was still granted a free trial (outcome=${last?.data?.trial?.outcome})`);
    t('  and holding back is never a ban: they can still browse and buy',
      (await req('GET', '/pricing')).code === 200);
  }

  // ---------------------------------------------------------------- CASE 4
  console.log('\nCASE 4  Practice is a paid feature, and must say so honestly');
  {
    await signIn('adv_practice');
    // A trial student has no practice credits: the free try is the ten
    // question mock, and the packs are what carry practice.
    const denied = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'practice' });
    t('  a trial student is refused practice, cleanly', denied.code === 402, `code ${denied.code}`);
    const msg = J(denied.body)?.error?.userMessage ?? '';
    t('  and is NOT told they used something they never had',
      !/used all/i.test(msg),
      `message reads: "${msg}"`);

    // After paying, practice must actually work.
    const order = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    await req('POST', '/api/payment', {
      action: 'submit', orderId: order?.data?.orderId,
      walletTxnId: 'ADVP-' + Date.now(), payerName: 'QA', payerPhoneSuffix: '5222',
    });
    const jarKeep = { ...jar };
    await req('POST', '/api/super', { action: 'verifyPayment', superKey: SUPER, orderId: order?.data?.orderId, confirmedInWalletLedger: true });
    jar = jarKeep;

    const p = J((await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'practice' })).body);
    t('  a paying student can practise', Boolean(p?.data?.sessionId), JSON.stringify(p?.error));
    t('  practice is ONE question, not a full mock', p?.data?.questions?.length === 1, `got ${p?.data?.questions?.length}`);

    const before = J((await req('GET', '/api/me')).body)?.data?.entitlement;
    await answerOnce(p?.data?.sessionId, p?.data?.questions?.[0]?.id);
    const after = J((await req('GET', '/api/me')).body)?.data?.entitlement;
    t('  practice does NOT spend a mock credit',
      after?.mocksLeft === before?.mocksLeft,
      `mocks went ${before?.mocksLeft} -> ${after?.mocksLeft}`);
    t('  practice DOES spend a practice credit',
      (after?.practiceLeft ?? 0) === (before?.practiceLeft ?? 0) - 1,
      `practice went ${before?.practiceLeft} -> ${after?.practiceLeft}`);
  }

  // ---------------------------------------------------------------- CASE 5
  console.log('\nCASE 5  Any university a student picks must work, not just the featured six');
  {
    await signIn('adv_uni');
    const far = await req('POST', '/api/session/create', { institution: 'manchester-metropolitan-university', mode: 'test' });
    t('  a non-featured UK university can be practised', far.code === 200, `code ${far.code}`);
    const bogus = await req('POST', '/api/session/create', { institution: 'not-a-real-university', mode: 'test' });
    t('  an invented university is refused cleanly', bogus.code === 404, `code ${bogus.code}`);
  }

  console.log(`\n${pass} passed, ${fail} bugs found\n`);
  if (bugs.length) {
    console.log('BUGS:');
    bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));
  }
  process.exit(0);
})();
