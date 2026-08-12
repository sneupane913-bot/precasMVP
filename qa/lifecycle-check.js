const http = require('http');
const P = Number(process.env.QA_PORT || 3012);
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
/** Minimal multipart POST, so the screenshot endpoint is tested the way a phone actually calls it. */
function upload(path, fields, file) {
  return new Promise(res => {
    const b = '----qa' + Date.now();
    const parts = [];
    for (const [k, v] of Object.entries(fields)) {
      parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }
    if (file) {
      const field = file.field || 'screenshot';
      parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${field}"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`));
      parts.push(file.bytes, Buffer.from('\r\n'));
    }
    parts.push(Buffer.from(`--${b}--\r\n`));
    const payload = Buffer.concat(parts);
    const headers = { 'Content-Type': `multipart/form-data; boundary=${b}`, 'Content-Length': payload.length };
    if (Object.keys(jar).length) headers['Cookie'] = cookieHeader();
    const r = http.request({ host: '127.0.0.1', port: P, path, method: 'POST', headers }, resp => {
      absorb(resp.headers);
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => res({ code: resp.statusCode, body: d }));
    });
    r.on('error', e => res({ code: 0, body: String(e) }));
    r.write(payload); r.end();
  });
}
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

  // E5 pay-to block always complete, never a broken QR
  t('E5', pay?.data?.payTo && 'qrImageUrl' in pay.data.payTo && pay.data.payTo.walletName,
    `payTo has qrImageUrl=${JSON.stringify(pay?.data?.payTo?.qrImageUrl)} (null is correct when unset)`);

  // E5 receipt upload: guards, and never blocks the payment
  const oid = pay?.data?.orderId;
  const png = Buffer.from('89504e470d0a1a0a', 'hex');
  const notMine = await upload('/api/payment/screenshot', { orderId: 'someone-elses-order' }, { name: 'r.png', type: 'image/png', bytes: png });
  t('E5-own', notMine.code === 404, `upload to another student's order -> ${notMine.code}`);
  const badType = await upload('/api/payment/screenshot', { orderId: oid }, { name: 'r.exe', type: 'application/x-msdownload', bytes: png });
  t('E5-type', J(badType.body)?.error?.code === 'BAD_TYPE', `executable upload -> ${J(badType.body)?.error?.code || badType.code}`);
  const tooBig = await upload('/api/payment/screenshot', { orderId: oid }, { name: 'r.png', type: 'image/png', bytes: Buffer.alloc(3 * 1024 * 1024) });
  t('E5-size', J(tooBig.body)?.error?.code === 'TOO_LARGE', `3 MB upload -> ${J(tooBig.body)?.error?.code || tooBig.code}`);
  const okShot = await upload('/api/payment/screenshot', { orderId: oid }, { name: 'r.png', type: 'image/png', bytes: png });
  t('E5-ok', J(okShot.body)?.ok === true, `valid receipt -> ${okShot.code}`);

  // E6 unique wallet txn
  await req('POST', '/api/payment', { action: 'submit', orderId: oid, walletTxnId: 'TXNQA1', payerName: 'QA', payerPhoneSuffix: '1234' });
  const pay2 = J((await req('POST', '/api/payment', { action: 'create', packCode: 'serious' })).body);
  const dup = J((await req('POST', '/api/payment', { action: 'submit', orderId: pay2?.data?.orderId, walletTxnId: 'TXNQA1', payerName: 'QA', payerPhoneSuffix: '1234' })).body);
  t('E6', dup?.error?.code === 'TXN_ALREADY_USED', `reused txn -> ${dup?.error?.code || 'ACCEPTED (DEFECT)'}`);

  // E8 idempotent allocation
  const v1 = J((await req('POST', '/api/super', { action: 'verifyPayment', superKey: 'super-dev', orderId: oid, confirmedInWalletLedger: true })).body);
  const v2 = J((await req('POST', '/api/super', { action: 'verifyPayment', superKey: 'super-dev', orderId: oid, confirmedInWalletLedger: true })).body);
  t('E8', v1?.data?.granted?.mocks === 6 && v2?.data?.alreadyVerified === true,
    `first grant=${v1?.data?.granted?.mocks} second=${v2?.data?.alreadyVerified ? 'refused' : 'DOUBLE GRANTED'}`);

  // D16/D17 paying lifts the question allowance
  const me2 = J((await req('GET', '/api/me')).body);
  t('D16/D17', me2?.data?.entitlement?.questionsAllowed === 17 && me2?.data?.entitlement?.hasPaid === true,
    `after paying questionsAllowed=${me2?.data?.entitlement?.questionsAllowed} hasPaid=${me2?.data?.entitlement?.hasPaid}`);

  // I-spend: one sitting costs exactly one mock credit, however many questions it has.
  // The bug this guards against is the obvious one: debiting on every answer,
  // so a 17-question mock silently eats 17 credits.
  const before = J((await req('GET', '/api/me')).body)?.data?.entitlement?.mocksLeft;
  const s2 = J((await req('POST', '/api/session/create', { institution: 'bpp-university' })).body);
  await req('POST', `/api/session/${s2?.data?.sessionId}/consent`, { version: '2026-08-10.1' });
  const audio = { name: 'a.webm', type: 'audio/webm', bytes: Buffer.alloc(20 * 1024, 7) };
  for (const q of (s2?.data?.questions ?? []).slice(0, 3)) {
    await upload(`/api/session/${s2.data.sessionId}/answer`,
      { questionId: q.id, durationSeconds: '45' },
      { ...audio, field: 'audio' });
  }
  const after = J((await req('GET', '/api/me')).body)?.data?.entitlement?.mocksLeft;
  t('I-spend', typeof before === 'number' && after === before - 1,
    `3 answers in one sitting: mocksLeft ${before} -> ${after} (must drop by exactly 1)`);

  const pub = J((await req('GET', '/api/platform')).body);
  t('K8', Object.keys(pub?.data || {}).length === 1, `public read = ${JSON.stringify(pub?.data)}`);

  console.log(`\n  ${pass} passed, ${fail} failed`);
})();
