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
  /**
   * `max-w-` IS THE FIX, NOT THE BUG.
   *
   * This pattern used to be /(?:min-)?w-\[(\d{3,})px\]/, which matches the
   * substring `w-[1120px]` inside `max-w-[1120px]` — so the page frame that
   * KEEPS the layout phone-safe was reported as the thing breaking it, eight
   * times on the home page alone.
   *
   * It is the R-6 lesson a second time: the extractor gets fixed, the rule does
   * not get relaxed. A check that cries wolf is worse than no check, because
   * the next real finding is read as more noise. Confirmed against a real
   * 390px viewport, where none of these pages moves sideways by a pixel.
   *
   * A genuine `w-[420px]` or `min-w-[640px]` is still caught.
   */
  const wide = html.match(/(?<!max-)\b(?:min-)?w-\[(\d{3,})px\]/g) || [];
  for (const w of wide) {
    const n = Number(w.match(/(\d{3,})/)[1]);
    if (n > 360) problems.push(`fixed width ${w}`);
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

  // 3b -------------------------------------------------- the welcome form
  // N-30: mandatory since 21 Aug. The journey now includes the form, because
  // a student cannot start an interview without it and neither can this test.
  const noProfile = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' });
  t('3b. cannot start before giving name and WhatsApp number',
    noProfile.code === 403, `code ${noProfile.code}`);
  const prof = J((await req('POST', '/api/student/profile',
    { fullName: 'Journey Student', whatsappNumber: '9812345678' })).body);
  t('    gives name and WhatsApp number', prof?.ok === true);

  // 4 ------------------------------------------------------------ catalogue
  const unis = await req('GET', '/universities');
  t('4. can browse universities', unis.code === 200);
  /**
   * U-1 IS ABOUT REACHING YOUR UNIVERSITY, NOT ABOUT THE FIRST SCREENFUL.
   *
   * This used to assert that "Manchester Metropolitan" appeared in the
   * catalogue's HTML. It stopped being true when "See all" landed: the page
   * deliberately renders six universities and a control that opens the rest,
   * which the client asked for and approved, with two guards already written
   * into the page — a search or a filter shows EVERYTHING and makes the control
   * disappear, and the count is derived rather than typed.
   *
   * So the old assertion was reporting an approved design as a defect. The
   * resolution is not to soften it. It is to assert what REDESIGN.md U-1
   * actually promises, whose falsifier is "a known university is not found by
   * its common short form": there must be a way to every university, and the
   * count offered must be real.
   *
   * WORTH KNOWING, and the reason this is asserted on the count rather than
   * quietly deleted: this suite speaks HTTP and never runs the page's
   * JavaScript, and the slice happens before render. So without JavaScript the
   * remaining universities are not merely hidden, they are absent. The search
   * box and the "See all" control are both real elements in the HTML, and the
   * number beside "See all" is the honest total — that is what is checked here.
   */
  // React splits `See all {n} universities` into separate text nodes and marks
  // the boundaries with `<!-- -->`, so the rendered HTML is literally
  // "See all <!-- -->87<!-- --> universities". Matching the plain sentence finds
  // nothing and would fail for a reason that has nothing to do with the product.
  const seeAll = unis.body.replace(/<!--[\s\S]*?-->/g, '').match(/See all\s*(\d+)\s*universities/);
  const hasSearch = /aria-label="Search universities"/.test(unis.body);
  t('   offers a real route to every university',
    Boolean(seeAll) && Number(seeAll[1]) > 6 && hasSearch,
    seeAll
      ? `search box ${hasSearch ? 'present' : 'MISSING'}, "See all ${seeAll[1]}"`
      : 'no "See all N universities" control in the catalogue');
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
