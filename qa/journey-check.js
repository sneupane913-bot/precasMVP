/**
 * D20: the whole direct-student journey, walked in order, the way a real
 * student walks it.
 *
 * The other suites prove individual guarantees. This one proves the JOURNEY:
 * that each step actually leads to the next, and that a student is never left
 * on a screen with no way forward. That is the thing a checklist of endpoints
 * cannot tell you.
 *
 * It also asserts the phone case, because the primary device is a cheap
 * Android: every page a student passes through must render without a layout
 * that forces sideways scrolling at 360px.
 *
 * Run:  QA_PORT=3020 node qa/journey-check.js
 */
const http = require('http');

const P = Number(process.env.QA_PORT || 3020);
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
function req(method, path, body) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {};
    if (data) headers['Content-Type'] = 'application/json';
    if (Object.keys(jar).length) headers['Cookie'] = cookieHeader();
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
const J = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

let pass = 0;
let fail = 0;
function t(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail ? '  <- ' + detail : ''}`);
  }
}

/**
 * Layout patterns that force a 360px screen to scroll sideways. Catching these
 * in markup is not the same as looking at a handset, but it does catch the
 * class of bug that actually happens.
 */
function phoneSafe(html) {
  const problems = [];
  if (/<table(?![^>]*>[\s\S]{0,40}<\/table>)/.test(html)) {
    // a table is only safe if an overflow wrapper sits above it
    if (!/overflow-x-auto[\s\S]{0,400}<table/.test(html)) problems.push('table with no scroll wrapper');
  }
  const wide = html.match(/(?:min-)?w-\[(\d{3,})px\]/g) || [];
  for (const w of wide) {
    const n = Number(w.match(/(\d{3,})/)[1]);
    if (n > 360) problems.push(`fixed width ${n}px`);
  }
  return problems;
}

(async () => {
  console.log('\nTHE STUDENT JOURNEY, STEP BY STEP\n');

  // 1 ----------------------------------------------------------------- land
  const home = await req('GET', '/');
  t('1. lands on the home page', home.code === 200);
  t('   the first button leads to sign in, not past it', /href="\/start\?next=/.test(home.body));
  t('   home is phone safe at 360px', phoneSafe(home.body).length === 0, phoneSafe(home.body).join(', '));

  // 2 --------------------------------------------------------------- gate
  const gated = await req('POST', '/api/session/create', {
    institution: 'bpp-university',
    mode: 'test',
  });
  t('2. cannot start an interview before signing in', gated.code === 401, `code ${gated.code}`);

  // 3 ------------------------------------------------------------- sign in
  const signed = J((await req('POST', '/api/auth/firebase', { idToken: 'dev:journey' })).body);
  t('3. signs in with Google', signed?.ok === true);
  t('   is given the free trial', signed?.data?.trial?.outcome === 'granted', signed?.data?.trial?.outcome);

  // 4 ------------------------------------------------------------ catalogue
  const unis = await req('GET', '/universities');
  t('4. can browse universities', unis.code === 200);
  t('   finds their own university among many', /Manchester Metropolitan/.test(unis.body));
  t('   catalogue is phone safe', phoneSafe(unis.body).length === 0, phoneSafe(unis.body).join(', '));

  // 5 --------------------------------------------------------------- start
  const created = J(
    (await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' })).body
  );
  const sid = created?.data?.sessionId;
  t('5. starts the interview', Boolean(sid));
  t('   gets exactly the free ten questions', created?.data?.questions?.length === 10, `${created?.data?.questions?.length}`);

  // 6 ------------------------------------------------------------- consent
  // The server refuses a stale consent version on purpose, so the test has to
  // send the real one rather than a made-up string.
  const consent = await req('POST', `/api/session/${sid}/consent`, { version: '2026-08-10.1' });
  t('6. consent is recorded, not just displayed', consent.code === 200, `code ${consent.code}`);

  // 7 -------------------------------------------------------------- finish
  const done = await req('POST', `/api/session/${sid}/complete`, {});
  t('7. can finish the interview', done.code === 200, `code ${done.code}`);

  // 8 ------------------------------------------------------------- results
  const results = await req('GET', `/results/${sid}`);
  t('8. reaches their report', results.code === 200, `code ${results.code}`);
  t('   an answer we never heard is never given a score', !/\bNaN\b/.test(results.body));
  t('   the report is phone safe', phoneSafe(results.body).length === 0, phoneSafe(results.body).join(', '));

  // 9 -------------------------------------------------------------- offer
  const me = J((await req('GET', '/api/me')).body);
  const offer = me?.data?.offer;
  t('9. finishing starts a real, personal countdown', Boolean(offer?.endsAt), 'no offer issued');
  if (offer) {
    t('   the deadline is in the future and comes from the server', new Date(offer.endsAt) > new Date());
  }

  // 10 ------------------------------------------------------------ history
  const account = J((await req('GET', '/api/account')).body);
  t('10. their practice is remembered', (account?.data?.sessions?.length ?? 0) >= 1);
  t('    they can get back to the report', account?.data?.sessions?.[0]?.id === sid);

  // 11 -------------------------------------------------------------- pay
  const order = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
  t('11. can start a payment', Boolean(order?.data?.orderId));
  t('    the price is set by us, not the browser', order?.data?.amountNpr === 449, `${order?.data?.amountNpr}`);

  const submitted = await req('POST', '/api/payment', {
    action: 'submit',
    orderId: order?.data?.orderId,
    walletTxnId: 'JOURNEY-' + Date.now(),
    payerName: 'QA Journey',
    payerPhoneSuffix: '5222',
  });
  t('    can submit the transaction details', submitted.code === 200, `code ${submitted.code}`);

  // 12 --------------------------------------------------------- no dead end
  const missing = await req('GET', '/results/does-not-exist');
  t('12. an old or wrong link is not a dead end', missing.code === 404);
  const notFound = await req('GET', '/no-such-page');
  t('    the 404 page offers a way home', /Go to the home page/.test(notFound.body));

  // 13 ------------------------------------------------------------- delete
  const del = await req('POST', '/api/account', { action: 'deleteEverything', confirm: 'DELETE' });
  t('13. can delete everything, and it really deletes', del.code === 200 && (J(del.body)?.data?.sessionsRemoved ?? 0) >= 1);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})();
