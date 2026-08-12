const http = require('http');
const P = 3012;
const jar = {};                       // accumulate cookies across the whole journey
function cookieHeader() { return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '); }
function absorb(h) {
  (h['set-cookie'] || []).forEach(c => { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1); });
}
function req(method, path, body, opts = {}) {
  return new Promise(res => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {};
    if (data) headers['Content-Type'] = 'application/json';
    if (!opts.noCookie && Object.keys(jar).length) headers['Cookie'] = cookieHeader();
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, resp => {
      absorb(resp.headers);
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', e => res({ code: 0, body: String(e) }));
    if (data) r.write(data);
    r.end();
  });
}
const J = s => { try { return JSON.parse(s); } catch { return null; } };
let pass = 0, fail = 0;
function t(id, ok, detail) { (ok ? pass++ : fail++); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(12)} ${detail}`); }

(async () => {
  const auth = J((await req('POST', '/api/auth/firebase', { idToken: 'dev:qa1', fingerprint: 'fp_qa1' })).body);
  t('D1/D3', auth?.data?.isNew === true, `sign-in ok, referral ${auth?.data?.referralCode}`);

  const me = J((await req('GET', '/api/me')).body);
  t('D5', me?.data?.entitlement?.mocksLeft === 1 && me?.data?.entitlement?.questionsAllowed === 10,
    `mocksLeft=${me?.data?.entitlement?.mocksLeft} questionsAllowed=${me?.data?.entitlement?.questionsAllowed}`);

  const cj = J((await req('POST', '/api/session/create',
    { institution: 'bpp-university', isTrial: false, maxQuestionsPerMock: 17, mockInterviews: 99, credits: 500 })).body);
  const sid = cj?.data?.sessionId;
  t('I1/D6', cj?.data?.questions?.length === 10, `injection ignored -> ${cj?.data?.questions?.length} questions`);

  const get1 = J((await req('GET', `/api/session/${sid}`)).body);
  t('K6', get1?.data?.session && !('ownerId' in get1.data.session), `ownerId echoed: ${get1?.data?.session ? ('ownerId' in get1.data.session) : 'read failed'}`);

  const stranger = await req('GET', `/api/session/${sid}`, null, { noCookie: true });
  t('D8', stranger.code === 404, `stranger -> ${stranger.code}`);

  const empty = await req('POST', `/api/session/${sid}/answer`, null);
  t('K9', empty.code === 400, `empty body -> ${empty.code} (must be 400 not 500)`);

  const stale = J((await req('POST', `/api/session/${sid}/consent`, { version: '1999-01-01.1' })).body);
  const good = J((await req('POST', `/api/session/${sid}/consent`, { version: '2026-08-10.1' })).body);
  t('D12', stale?.error?.code === 'CONSENT_STALE' && !!good?.data?.consentAt,
    `stale refused=${stale?.error?.code === 'CONSENT_STALE'} recorded=${good?.data?.consentAt ? 'yes' : 'no'}`);

  const done = J((await req('POST', `/api/session/${sid}/complete`, {})).body);
  const ss = done?.data?.subScores;
  t('K7', ss?.interviewBehaviour === 100 && ss?.englishClarity === null,
    `behaviour=${ss?.interviewBehaviour} english=${ss?.englishClarity}`);

  // payment: server owns the price, hidden packs refused
  const pay = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep', amountNpr: 1 })).body);
  t('E2/I1', pay?.data?.amountNpr === 449, `client sent amountNpr:1 -> server ${pay?.data?.amountNpr}`);
  const hidden = J((await req('POST', '/api/payment', { action: 'create', packCode: 'pro' })).body);
  t('QA-207', hidden?.ok === false, `hidden pack -> ${hidden?.error?.code || 'ALLOWED'}`);

  // E6 unique wallet txn
  const oid = pay?.data?.orderId;
  await req('POST', '/api/payment', { action: 'submit', orderId: oid, walletTxnId: 'TXNQA1', payerName: 'QA', payerPhoneSuffix: '1234' });
  const pay2 = J((await req('POST', '/api/payment', { action: 'create', packCode: 'serious' })).body);
  const dup = J((await req('POST', '/api/payment', { action: 'submit', orderId: pay2?.data?.orderId, walletTxnId: 'TXNQA1', payerName: 'QA', payerPhoneSuffix: '1234' })).body);
  t('E6', dup?.error?.code === 'TXN_ALREADY_USED', `reused txn -> ${dup?.error?.code || 'ACCEPTED (DEFECT)'}`);

  // E8 idempotent allocation
  const v1 = J((await req('POST', '/api/super', { action: 'verifyPayment', superKey: 'sup-x', orderId: oid, confirmedInWalletLedger: true })).body);
  const v2 = J((await req('POST', '/api/super', { action: 'verifyPayment', superKey: 'sup-x', orderId: oid, confirmedInWalletLedger: true })).body);
  t('E8', v1?.data?.granted?.mocks === 6 && v2?.data?.alreadyVerified === true,
    `first grant=${v1?.data?.granted?.mocks} second=${v2?.data?.alreadyVerified ? 'refused' : 'DOUBLE GRANTED'}`);

  // D16/D17 paying lifts the question allowance
  const me2 = J((await req('GET', '/api/me')).body);
  t('D16/D17', me2?.data?.entitlement?.questionsAllowed === 17 && me2?.data?.entitlement?.hasPaid === true,
    `after paying questionsAllowed=${me2?.data?.entitlement?.questionsAllowed} hasPaid=${me2?.data?.entitlement?.hasPaid}`);

  const pub = J((await req('GET', '/api/platform')).body);
  t('K8', Object.keys(pub?.data || {}).length === 1, `public read = ${JSON.stringify(pub?.data)}`);

  console.log(`\n  ${pass} passed, ${fail} failed`);
})();
