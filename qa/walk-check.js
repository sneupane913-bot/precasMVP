/**
 * THE WALKS.
 *
 * Not a list of endpoints. A list of PEOPLE, each walked from their first click
 * to their last, in the order they actually click, with the wrong turns and the
 * bad wifi included.
 *
 * The client's brief, in his words: "think that you are a student who came from
 * the advertisement... he clicks on the buttons... the ten interviews is done...
 * he goes back and tries to get into the same access... he signs out and signs
 * in again... then from another Gmail... every time he clicks on something he is
 * just told to pay... he clicks pay, goes to the QR page, and cancels... then he
 * genuinely pays and clicks send, and his wifi is bad so he clicks send send
 * send."
 *
 * Every assertion below is one of those moments. A walk fails if a real person
 * would be confused, stuck, cheated, or able to cheat.
 *
 * Run:  QA_PORT=3040 node qa/walk-check.js
 */
const http = require('http');

const P = Number(process.env.QA_PORT || 3040);
const SUPER = process.env.SUPER_ADMIN_PASSCODE || 'super-dev';
const OWNER = process.env.OWNER_PASSCODE || 'owner-dev';

// --------------------------------------------------------------- plumbing ---

let jar = {};
function absorb(h) {
  (h['set-cookie'] || []).forEach((c) => {
    const [kv] = c.split(';');
    const i = kv.indexOf('=');
    const k = kv.slice(0, i);
    const v = kv.slice(i + 1);
    if (v === '' || /Max-Age=0/i.test(c) || /Expires=Thu, 01 Jan 1970/i.test(c)) delete jar[k];
    else jar[k] = v;
  });
}
function req(method, path, body, opts = {}) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {};
    if (data) headers['Content-Type'] = 'application/json';
    if (!opts.noCookie && Object.keys(jar).length)
      headers['Cookie'] = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
    headers['x-forwarded-for'] = opts.ip ?? studentIp;
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (resp) => {
      absorb(resp.headers);
      let d = '';
      resp.on('data', (c) => (d += c));
      resp.on('end', () => res({ code: resp.statusCode, body: d, headers: resp.headers }));
    });
    r.on('error', (e) => res({ code: 0, body: String(e) }));
    if (data) r.write(data);
    r.end();
  });
}
const J = (s) => { try { return JSON.parse(s); } catch { return null; } };

/**
 * Each walked student gets their own address, because each real student has
 * one. Sharing one address across ten lifecycles would trip the per-IP limits
 * that exist to stop scripts, and the suite would then be measuring its own
 * impatience instead of the product.
 */
let studentIp = '203.0.113.1';
let ipN = 0;
function newStudentIp() {
  ipN += 1;
  studentIp = `192.0.2.${(ipN % 250) + 1}`;
  return studentIp;
}

let pass = 0, fail = 0;
const bugs = [];
let walk = '';
function W(name) { walk = name; console.log(`\n${name}`); }
function t(step, ok, detail = '') {
  if (ok) { pass += 1; console.log(`  ok    ${step}`); }
  else {
    fail += 1;
    bugs.push({ walk, step, detail });
    console.log(`  BUG   ${step}\n        ${detail}`);
  }
}

async function signIn(handle, opts = {}) {
  jar = {};
  if (opts.ip) studentIp = opts.ip;
  else newStudentIp();
  const r = await req('POST', '/api/auth/firebase',
    { idToken: `dev:${handle}`, fingerprint: opts.fingerprint, via: opts.via, ref: opts.ref }, opts);
  return J(r.body);
}
const signOut = () => req('DELETE', '/api/me');
const me = async () => J((await req('GET', '/api/me')).body)?.data;

/**
 * Staff endpoints are throttled at 5 attempts per 5 minutes per IP, which is
 * correct and must stay. A test that walks ten lifecycles would trip it in the
 * first walk, so each staff call is made from its own address, exactly as ten
 * real members of staff on ten real connections would.
 */
let staffN = 0;
function staff(path, body) {
  staffN += 1;
  return req('POST', path, body, { ip: `198.51.100.${(staffN % 250) + 1}` });
}

async function answerOnce(sid, qid) {
  const b = '----qa' + Date.now() + Math.random();
  const audio = Buffer.alloc(40 * 1024, 1);
  const payload = Buffer.concat([
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="questionId"\r\n\r\n${qid}\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="durationSeconds"\r\n\r\n30\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="audio"; filename="a.webm"\r\nContent-Type: audio/webm\r\n\r\n`),
    audio, Buffer.from(`\r\n--${b}--\r\n`),
  ]);
  return new Promise((res) => {
    const r = http.request({
      host: '127.0.0.1', port: P, path: `/api/session/${sid}/answer`, method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${b}`,
        'Content-Length': payload.length,
        // Same address as the rest of this student's clicks. Without it every
        // walk would share one throttle bucket and the suite would measure its
        // own speed instead of the product.
        'x-forwarded-for': studentIp,
        Cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; '),
      },
    }, (resp) => { let d = ''; resp.on('data', c => d += c); resp.on('end', () => res({ code: resp.statusCode, body: d })); });
    r.on('error', () => res({ code: 0, body: '' }));
    r.write(payload); r.end();
  });
}

/** Sit a whole mock: consent, answer every question, complete. */
async function sitWholeMock(uni = 'bpp-university') {
  const s = J((await req('POST', '/api/session/create', { institution: uni, mode: 'test' })).body);
  const sid = s?.data?.sessionId;
  if (!sid) return { sid: null, questions: 0, error: s?.error };
  await req('POST', `/api/session/${sid}/consent`, { version: '2026-08-10.1' });
  for (const q of s.data.questions) await answerOnce(sid, q.id);
  await req('POST', `/api/session/${sid}/complete`, {});
  return { sid, questions: s.data.questions.length };
}

/**
 * Open a mock and answer one question: enough to consume the credit, which is
 * what the exhaustion walk is measuring. Sitting eight full seventeen question
 * mocks inside one minute would trip the answer limit, and no real student does
 * that anyway.
 */
async function burnOneMock(uni = 'bpp-university') {
  const s = J((await req('POST', '/api/session/create', { institution: uni, mode: 'test' })).body);
  const sid = s?.data?.sessionId;
  if (!sid) return { sid: null, error: s?.error };
  await req('POST', `/api/session/${sid}/consent`, { version: '2026-08-10.1' });
  const a = await answerOnce(sid, s.data.questions[0].id);
  await req('POST', `/api/session/${sid}/complete`, {});
  return { sid, answerCode: a.code };
}

/** Buy a pack end to end, approved by the super admin. */
async function buyPack(packCode = 'prep', txn = 'WALK-' + Date.now() + Math.floor(Math.random() * 1e6)) {
  const order = J((await req('POST', '/api/payment', { action: 'create', packCode })).body);
  const id = order?.data?.orderId;
  await req('POST', '/api/payment', {
    action: 'submit', orderId: id, walletTxnId: txn,
    payerName: 'QA Walker', payerPhoneSuffix: '5222',
  });
  const keep = { ...jar };
  await staff('/api/super', {
    action: 'verifyPayment', superKey: SUPER, orderId: id, confirmedInWalletLedger: true,
  });
  jar = keep;
  return id;
}

// ============================================================== THE WALKS ===

(async () => {
  console.log('\n=========================================================');
  console.log(' THE WALKS: every actor, every click, in order');
  console.log('=========================================================');

  // ------------------------------------------------------------- WALK 1 ----
  W('WALK 1  A student arrives from the advertisement and never pays');
  {
    // He lands. Every link in the header and footer must go somewhere real.
    const home = await req('GET', '/');
    t('1.1  the advert lands him on a page that loads', home.code === 200, `code ${home.code}`);

    const links = [...new Set((home.body.match(/href="(\/[^"#?]*)"/g) || [])
      .map((h) => h.slice(6, -1)))].filter((h) => !h.startsWith('/api'));
    const dead = [];
    for (const href of links) {
      const r = await req('GET', href);
      if (r.code >= 400) dead.push(`${href} -> ${r.code}`);
    }
    t('1.2  every link on the landing page leads somewhere real', dead.length === 0, dead.join(', '));

    // He clicks the big button before signing in.
    const gated = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' });
    t('1.3  he cannot start an interview before signing in', gated.code === 401, `code ${gated.code}`);

    // He signs in with Google.
    const s = await signIn('walk_ad', { fingerprint: 'fp_walk_1', ip: '203.0.113.50' });
    t('1.4  Google sign in works and gives him the free try',
      s?.data?.trial?.outcome === 'granted', `outcome ${s?.data?.trial?.outcome}`);

    // He sits the whole free interview.
    const sat = await sitWholeMock();
    t('1.5  the free interview is exactly ten questions', sat.questions === 10, `${sat.questions}`);

    // The gate after question ten. He clicks "See my report".
    const report = await req('GET', `/results/${sat.sid}`);
    t('1.6  "See my report" opens his report', report.code === 200, `code ${report.code}`);
    t('1.7  the free report is not crippled: it scores what he said',
      !/\bNaN\b/.test(report.body) && report.body.length > 2000, `length ${report.body.length}`);

    // He goes back and tries the same interview again.
    const again = await req('POST', `/api/session/${sat.sid}/answer`, {});
    t('1.8  he cannot reopen the finished interview and answer more',
      again.code >= 400, `code ${again.code}`);

    // He tries a fresh interview at a different university.
    const second = await req('POST', '/api/session/create', { institution: 'coventry-university', mode: 'test' });
    t('1.9  a second free interview is refused', second.code === 402, `code ${second.code}`);
    const msg9 = J(second.body)?.error?.userMessage ?? '';
    t('1.10 and the refusal tells him what to do about it',
      /pack|buy/i.test(msg9), `message: "${msg9}"`);

    // ---- The refusal must be a way forward, not a red dead end. -----------
    // The catalogue renders this message as bare red text with no control on
    // it. The client's rule is that every blocked click becomes a prompt to
    // pay, so the refusal has to carry somewhere to go.
    const err9 = J(second.body)?.error ?? {};
    t('1.11 the refusal carries a way to pay, not just words',
      typeof err9.action === 'object' && typeof err9.action?.href === 'string',
      'the API returns only a sentence. The catalogue prints it as red text with no button, so a student who has just been refused has nothing to click.');

    // He signs out, then signs back in with the SAME Google account.
    await signOut();
    const afterOut = await me();
    t('1.12 signing out really signs him out', afterOut?.signedIn === false, JSON.stringify(afterOut));

    const back = await signIn('walk_ad', { fingerprint: 'fp_walk_1', ip: '203.0.113.50' });
    t('1.13 signing back in does NOT hand out a second free try',
      back?.data?.trial?.outcome === 'already_claimed', `outcome ${back?.data?.trial?.outcome}`);
    const backEnt = (await me())?.entitlement;
    t('1.14 and he still has nothing left', backEnt?.mocksLeft === 0, `mocksLeft ${backEnt?.mocksLeft}`);

    const stillNo = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' });
    t('1.15 the sign out and back in workaround does not work', stillNo.code === 402, `code ${stillNo.code}`);

    // ---- Signing out must be something he can FIND, not just an endpoint. --
    const anyPage = await req('GET', '/universities');
    t('1.16 a sign out control is on the page, not just in the API',
      /\/signout/.test(anyPage.body),
      'No sign out control exists anywhere in the product. On a consultancy lab machine the next student sits down already signed in as the previous one, sees their report and can spend their credits.');
    const out = await req('GET', '/signout');
    t('1.17 the sign out page works without JavaScript',
      out.code === 200 && /<form[^>]+action="\/api\/signout"[^>]+method="post"/i.test(out.body),
      'signing out depends on a JavaScript bundle loading, on the machines least likely to load it');

    // He browses everything while locked out. Nothing may be a dead end.
    for (const page of ['/pricing', '/universities', '/practice', '/account', '/privacy', '/terms', '/refund']) {
      const r = await req('GET', page);
      t(`1.18 he can still look around: ${page}`, r.code === 200, `code ${r.code}`);
    }

    // Every locked page must offer the way to pay, on the page itself.
    for (const page of ['/practice', '/account']) {
      const r = await req('GET', page);
      t(`1.19 ${page} offers him the way to pay`, /\/pricing/.test(r.body), 'no link to pricing on the page');
    }
  }

  // ------------------------------------------------------------- WALK 2 ----
  W('WALK 2  He tries a second Gmail on the same laptop');
  {
    // One or two more accounts on a device is a family, and must pass.
    let outcomes = [];
    for (const n of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const r = await signIn(`walk_dev_${n}`, { fingerprint: 'fp_walk_shared', ip: '203.0.113.60' });
      outcomes.push(r?.data?.trial?.outcome);
    }
    t('2.1  the first two accounts on a laptop are treated as a family, not fraud',
      outcomes[0] === 'granted' && outcomes[1] === 'granted', outcomes.join(','));
    t('2.2  by the fifth or sixth account the free try stops being handed out',
      outcomes.slice(3).includes('soft_denied'), outcomes.join(','));
    t('2.3  the student is never banned: he can still browse',
      (await req('GET', '/pricing')).code === 200);
    t('2.4  and he can still buy, which is the whole point of a soft deny',
      (await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).code === 200);

    // A consultancy lab is thirty students on one network. It MUST NOT trip.
    const labIp = '203.0.113.77';
    let labDenied = 0;
    for (let i = 0; i < 30; i += 1) {
      const r = await signIn(`walk_lab_${i}`, { fingerprint: `fp_lab_machine_${i}`, ip: labIp });
      if (r?.data?.trial?.outcome !== 'granted') labDenied += 1;
    }
    t('2.5  thirty students in one consultancy lab all get in',
      labDenied === 0, `${labDenied} of 30 real students were refused their free try on a shared lab network`);
  }

  // ------------------------------------------------------------- WALK 3 ----
  W('WALK 3  He clicks Pay, gets to the QR page, and cancels');
  {
    await signIn('walk_abandon', { fingerprint: 'fp_walk_3' });
    await sitWholeMock();

    // Opening the checkout page creates an order. He then closes the tab.
    const o1 = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    t('3.1  opening checkout shows him a real amount set by us', o1?.data?.amountNpr === 449, `${o1?.data?.amountNpr}`);

    const afterAbandon = (await me())?.entitlement;
    t('3.2  abandoning at the QR page grants him nothing',
      afterAbandon?.mocksLeft === 0 && afterAbandon?.hasPaid === false, JSON.stringify(afterAbandon));

    const blocked = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' });
    t('3.3  after cancelling he is still treated as someone who has not paid', blocked.code === 402, `code ${blocked.code}`);

    // He is tricky: opens and abandons the checkout again and again.
    for (let i = 0; i < 6; i += 1) {
      await req('POST', '/api/payment', { action: 'create', packCode: 'prep' });
    }
    const keep3 = { ...jar };
    const all = J((await staff('/api/super', { action: 'orders', superKey: SUPER })).body)?.data ?? [];
    jar = keep3;
    const mineCreated = all.filter((o) => o.state === 'created');
    t('3.4  abandoned checkouts never reach a human to approve',
      all.filter((o) => o.state === 'submitted' || o.state === 'verified')
         .every((o) => o.walletTxnId), 'an order with no transaction number is awaiting approval');
    t('3.5  one student cannot pile up unlimited half-finished payments',
      mineCreated.length <= 4,
      `${mineCreated.length} abandoned orders exist. Every visit to the checkout page writes a new one, so a bored student can grow this table without limit.`);
  }

  // ------------------------------------------------------------- WALK 4 ----
  W('WALK 4  He genuinely pays, and his wifi is bad');
  {
    await signIn('walk_payer', { fingerprint: 'fp_walk_4' });
    await sitWholeMock();

    const order = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    const id = order?.data?.orderId;
    const txn = 'WALK4-' + Date.now();

    // He fills the form and taps "I have paid". The reply is slow, so he taps
    // again. And again. This is the single most common real-world sequence.
    const first = await req('POST', '/api/payment', {
      action: 'submit', orderId: id, walletTxnId: txn, payerName: 'Ram', payerPhoneSuffix: '5222',
    });
    t('4.1  the first tap is accepted', first.code === 200, `code ${first.code}`);

    const second = await req('POST', '/api/payment', {
      action: 'submit', orderId: id, walletTxnId: txn, payerName: 'Ram', payerPhoneSuffix: '5222',
    });
    t('4.2  tapping send again on bad wifi does not show him an error',
      second.code === 200,
      `the second identical tap returns ${second.code} "${J(second.body)?.error?.userMessage}". He has paid real money and the screen turns red, so he concludes it failed.`);

    // He forwards his receipt to a friend, who types the same transaction
    // number. One payment must unlock exactly one account.
    const payerJar = { ...jar };
    await signIn('walk_friend', { fingerprint: 'fp_walk_4_friend' });
    const friendOrder = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    const dup = await req('POST', '/api/payment', {
      action: 'submit', orderId: friendOrder?.data?.orderId, walletTxnId: txn,
      payerName: 'Shyam', payerPhoneSuffix: '9999',
    });
    t('4.3  a forwarded receipt cannot pay for a second account',
      dup.code === 409, `code ${dup.code}  ${dup.body.slice(0, 140)}`);
    jar = payerJar;

    // He opens the checkout a third time meaning to pay again, and would type a
    // slightly different number, which would look like a separate payment.
    const order3 = await req('POST', '/api/payment', { action: 'create', packCode: 'serious' });
    t('4.4  one student cannot have two payments waiting for approval at once',
      order3.code === 409,
      `code ${order3.code}. He paid once but two requests now sit in the approval queue. Whoever is approving sees two and can approve both, granting two packs for one payment.`);
    t('4.4b and he is told his payment is already being checked, not shown an error',
      /already sent us a payment|checking/i.test(J(order3.body)?.error?.userMessage ?? ''),
      `message "${J(order3.body)?.error?.userMessage}"`);

    // A notification must reach whoever is going to approve this.
    const keep4 = { ...jar };
    const over = J((await staff('/api/super', { action: 'overview', superKey: SUPER })).body);
    jar = keep4;
    t('4.5  the person who has to approve it can see it is waiting',
      (over?.data?.counts?.ordersAwaiting ?? 0) >= 1, `ordersAwaiting ${over?.data?.counts?.ordersAwaiting}`);

    // Approved. Credits land, exactly once, and only once.
    const keep4b = { ...jar };
    await staff('/api/super', { action: 'verifyPayment', superKey: SUPER, orderId: id, confirmedInWalletLedger: true });
    await staff('/api/super', { action: 'verifyPayment', superKey: SUPER, orderId: id, confirmedInWalletLedger: true });
    jar = keep4b;

    const ent = (await me())?.entitlement;
    t('4.6  approving gives him the pack', (ent?.mocksLeft ?? 0) >= 6, `mocksLeft ${ent?.mocksLeft}`);
    t('4.7  approving twice does not give him two packs', (ent?.mocksLeft ?? 0) <= 8, `mocksLeft ${ent?.mocksLeft}`);
    t('4.8  he now gets the full seventeen question interview',
      ent?.questionsAllowed === 17, `questionsAllowed ${ent?.questionsAllowed}`);

    const paidMock = J((await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' })).body);
    t('4.9  and the interview he opens really contains seventeen',
      paidMock?.data?.questions?.length === 17, `${paidMock?.data?.questions?.length}`);
  }

  // ------------------------------------------------------------- WALK 5 ----
  W('WALK 5  A student who came through a consultancy link');
  {
    // Set the consultancy up the way the super admin would.
    let keep = { ...jar };
    await staff('/api/platform', {
      action: 'createConsultancy', superKey: SUPER,
      name: 'Walk Hub', slug: 'walk-hub', passcode: 'walk-pass', seatsTotal: 20,
    });
    await staff('/api/platform', {
      action: 'createConsultancy', superKey: SUPER,
      name: 'Rival Hub', slug: 'rival-hub', passcode: 'rival-pass', seatsTotal: 20,
    });
    const list = J((await staff('/api/platform', { action: 'overview', superKey: SUPER })).body);
    const cs = list?.data?.consultancies ?? [];
    const walkHub = cs.find((c) => c.slug === 'walk-hub');
    const rivalHub = cs.find((c) => c.slug === 'rival-hub');
    for (const c of [walkHub, rivalHub]) {
      if (c && c.status !== 'approved') {
        await staff('/api/platform', {
          action: 'setConsultancyStatus', superKey: SUPER, consultancyId: c.id, status: 'approved',
        });
      }
    }
    jar = keep;

    // The student opens the consultancy's own link.
    const landing = await req('GET', '/c/walk-hub');
    t('5.1  the consultancy link opens a real page', landing.code === 200, `code ${landing.code}`);
    t('5.2  and it carries the consultancy through to sign in',
      /via=walk-hub/.test(landing.body), 'the sign in link drops the consultancy, so the student would not be bound to them');

    const s = await signIn('walk_cstudent', { fingerprint: 'fp_walk_5', via: 'walk-hub' });
    t('5.3  he signs up and is bound to that consultancy', s?.ok === true);
    const ent5 = (await me())?.entitlement;
    // A seat is the Serious pack: 12 mocks and 30 practice. He also keeps the
    // free try he would have had anyway, so 13 is right and 12 would be wrong.
    t('5.4  a seat gives him the same product a paying student gets',
      ent5?.mocksLeft === 13 && ent5?.practiceLeft === 30,
      `mocks ${ent5?.mocksLeft}, practice ${ent5?.practiceLeft}`);

    // He buys a pack anyway. The order belongs to his consultancy.
    const o = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    const oid = o?.data?.orderId;
    await req('POST', '/api/payment', {
      action: 'submit', orderId: oid, walletTxnId: 'WALK5-' + Date.now(),
      payerName: 'Sita', payerPhoneSuffix: '1111',
    });
    const studentJar = { ...jar };

    // HIS OWN admin logs in. Can they even SEE the payment they must approve?
    const adminView = J((await staff('/api/admin', {
      action: 'login', slug: 'walk-hub', passcode: 'walk-pass',
    })).body);
    t('5.5  his own consultancy can see him in their student list',
      (adminView?.data?.students ?? []).some((x) => x.email === 'walk_cstudent@dev.local' || x.name),
      JSON.stringify(adminView?.data?.stats));
    t('5.6  his own consultancy can SEE the payment waiting for them to approve',
      Array.isArray(adminView?.data?.orders) &&
        adminView.data.orders.some((x) => x.id === oid && x.state === 'submitted'),
      'The consultancy portal never returns orders and the page has no approval queue. Their student pays, and the only person allowed to approve it cannot see it exists.');

    // A rival consultancy must not be able to touch it.
    const rival = await staff('/api/admin', {
      action: 'approvePayment', slug: 'rival-hub', passcode: 'rival-pass',
      orderId: oid, confirmedReceived: true,
    });
    t('5.7  another consultancy cannot approve it', rival.code === 404, `code ${rival.code}`);

    // His own admin approves it.
    const ok = await staff('/api/admin', {
      action: 'approvePayment', slug: 'walk-hub', passcode: 'walk-pass',
      orderId: oid, confirmedReceived: true,
    });
    t('5.8  his own admin can approve it', ok.code === 200, `code ${ok.code}  ${ok.body.slice(0, 160)}`);

    jar = studentJar;
    const after5 = (await me())?.entitlement;
    t('5.9  approval adds the pack on top of his seat', (after5?.mocksLeft ?? 0) >= 19, `mocksLeft ${after5?.mocksLeft}`);
  }

  // ------------------------------------------------------------- WALK 6 ----
  W('WALK 6  The super admin steps in on a consultancy student');
  {
    const s = await signIn('walk_cstudent2', { fingerprint: 'fp_walk_6', via: 'walk-hub' });
    t('6.1  a second consultancy student signs up', s?.ok === true);

    const o = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    const oid = o?.data?.orderId;
    await req('POST', '/api/payment', {
      action: 'submit', orderId: oid, walletTxnId: 'WALK6-' + Date.now(),
      payerName: 'Hari', payerPhoneSuffix: '2222',
    });

    // Super admin approves instead of the consultancy.
    let keep = { ...jar };
    await staff('/api/super', { action: 'verifyPayment', superKey: SUPER, orderId: oid, confirmedInWalletLedger: true });
    const adminView = J((await staff('/api/admin', {
      action: 'login', slug: 'walk-hub', passcode: 'walk-pass',
    })).body);
    t('6.2  the consultancy is TOLD their student was approved by us',
      (adminView?.data?.notifications ?? []).some((n) => /approved/i.test(n.message)),
      'their numbers moved with no message explaining why');

    // Now a rejection by the super admin.
    jar = keep;
    const s2 = await signIn('walk_cstudent3', { fingerprint: 'fp_walk_6b', via: 'walk-hub' });
    const o2 = J((await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).body);
    const oid2 = o2?.data?.orderId;
    await req('POST', '/api/payment', {
      action: 'submit', orderId: oid2, walletTxnId: 'WALK6B-' + Date.now(),
      payerName: 'Gita', payerPhoneSuffix: '3333',
    });
    keep = { ...jar };
    await staff('/api/super', { action: 'rejectPayment', superKey: SUPER, orderId: oid2, reason: 'no matching transaction' });
    const adminView2 = J((await staff('/api/admin', {
      action: 'login', slug: 'walk-hub', passcode: 'walk-pass',
    })).body);
    t('6.3  the consultancy is also told when we REJECT their student',
      (adminView2?.data?.notifications ?? []).some((n) => /could not confirm|reject/i.test(n.message)),
      'We notify a consultancy when we approve, and say nothing when we reject. Their student is stuck and the only person who could help them was never told.');

    // A verified order must never be quietly flipped to rejected.
    const flip = await staff('/api/super', {
      action: 'rejectPayment', superKey: SUPER, orderId: oid, reason: 'changed my mind',
    });
    t('6.4  an already approved payment cannot be silently rejected',
      flip.code === 409,
      `code ${flip.code}. The order is now marked rejected while the credits stay granted, so the money record and the student record disagree.`);
  }

  // ------------------------------------------------------------- WALK 7 ----
  W('WALK 7  A paying student burns the whole pack in one day');
  {
    await signIn('walk_burner', { fingerprint: 'fp_walk_7' });
    await sitWholeMock();
    await buyPack('prep');

    const granted = (await me())?.entitlement?.mocksLeft ?? 0;
    t('7.1  paying gives him the pack he bought', granted >= 6, `mocksLeft ${granted}`);

    // He sits them one after another until the product stops him. The per
    // minute limits exist to stop scripts, not to stop a student who practises
    // all day, so he moves to a new connection as a real person would over
    // hours rather than fighting a throttle that is doing its job.
    const trail = [];
    let refusal = null;
    for (let i = 0; i < granted + 3; i += 1) {
      if (i > 0 && i % 7 === 0) newStudentIp();
      const r = await burnOneMock();
      const left = (await me())?.entitlement?.mocksLeft;
      trail.push(r.sid ? `sat->${left}` : `refused:${r.error?.code}`);
      if (!r.sid) { refusal = r.error; break; }
    }
    t('7.2  when the pack runs out, he is stopped',
      refusal?.code === 'NO_CREDITS_LEFT' || refusal?.code === 'DAILY_LIMIT',
      `he kept going past the pack he paid for. trail: ${trail.join(' | ')}`);

    const ent = (await me())?.entitlement;
    t('7.3  the count really is zero, not a stale number',
      ent?.mocksLeft === 0 || refusal?.code === 'DAILY_LIMIT',
      `mocksLeft ${ent?.mocksLeft} after ${trail.length} sittings`);

    t('7.4  and the product says plainly that the pack is finished, and offers the way back',
      /used all|pack/i.test(refusal?.userMessage ?? ent?.reason ?? ''),
      `message "${refusal?.userMessage ?? ent?.reason}"`);

    // Practice is a separate purse. Running out of mocks must not lock it.
    newStudentIp();
    const practice = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'practice' });
    t('7.5  the practice he also paid for is NOT locked by the mocks running out',
      practice.code === 200, `code ${practice.code}`);
  }

  // ------------------------------------------------------------- WALK 8 ----
  W('WALK 8  The staff doors: admin, super admin, owner');
  {
    jar = {};
    t('8.1  a wrong consultancy passcode is refused',
      (await staff('/api/admin', { action: 'login', slug: 'walk-hub', passcode: 'wrong' })).code === 403);
    t('8.2  an invented consultancy is refused with the SAME message',
      (await staff('/api/admin', { action: 'login', slug: 'does-not-exist', passcode: 'x' })).code === 403,
      'a different reply here tells an attacker which consultancies exist');
    t('8.3  a wrong super key is refused',
      (await staff('/api/super', { action: 'overview', superKey: 'wrong' })).code === 403);
    t('8.4  a wrong owner key cannot turn the platform off',
      (await staff('/api/platform', { action: 'setMaintenance', ownerKey: 'wrong', enabled: true })).code === 403);
    t('8.5  the super admin cannot use the owner door',
      (await staff('/api/platform', { action: 'setMaintenance', ownerKey: SUPER, enabled: true })).code === 403,
      'the super key opened the owner kill switch, so the two roles are not actually separate');

    const audit = J((await staff('/api/super', { action: 'audit', superKey: SUPER })).body)?.data ?? [];
    t('8.6  every approval left a signed trail',
      audit.some((a) => a.action === 'approve_payment'), `${audit.length} audit rows`);
    t('8.7  a consultancy approval is recorded as their word, not ours',
      audit.some((a) => a.actorRole === 'admin' && /not checked against our wallet/i.test(a.note ?? '')),
      'a consultancy approval is indistinguishable from one we verified ourselves');
    t('8.8  granting credit by hand is recorded as granting credit',
      !audit.some((a) => a.action === 'approve_admin_student' && /^\+\d+ (mock|practice)$/.test(a.after ?? '')),
      'a manual credit grant is filed in the audit trail under approve_admin_student, so the log does not say what actually happened');
  }

  // ------------------------------------------------------------- WALK 9 ----
  W('WALK 9  A student the super admin has disabled');
  {
    await signIn('walk_disabled', { fingerprint: 'fp_walk_9' });
    const before = await me();
    let keep = { ...jar };
    const all = J((await staff('/api/super', { action: 'overview', superKey: SUPER })).body)?.data?.students ?? [];
    const him = all.find((x) => x.email === 'walk_disabled@dev.local') ?? all.find((x) => x.name === before?.name);
    if (him) {
      await staff('/api/super', { action: 'setStudentStatus', superKey: SUPER, studentId: him.id, status: 'disabled' });
    }
    jar = keep;
    t('9.1  a disabled student cannot start an interview',
      (await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' })).code === 401);
    t('9.2  and cannot pay either', (await req('POST', '/api/payment', { action: 'create', packCode: 'prep' })).code === 401);
    t('9.3  but the site does not crash on him', (await req('GET', '/')).code === 200);
  }

  // ------------------------------------------------------------ WALK 10 ----
  W('WALK 10  The owner turns the platform off');
  {
    jar = {};
    await staff('/api/platform', {
      action: 'setMaintenance', ownerKey: OWNER, enabled: true,
      title: 'Back shortly', message: 'We are doing a quick update.',
    });
    const s = await signIn('walk_maint', { fingerprint: 'fp_walk_10' });
    t('10.1 nobody can start anything while it is off',
      (await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' })).code === 503 || s?.ok !== true,
      'work carried on during maintenance');
    const pub = J((await req('GET', '/api/platform')).body);
    t('10.2 students are told why, in words a person wrote',
      pub?.data?.maintenanceMode === true && Boolean(pub?.data?.maintenanceMessage), JSON.stringify(pub?.data));
    await staff('/api/platform', { action: 'setMaintenance', ownerKey: OWNER, enabled: false });
    const back = J((await req('GET', '/api/platform')).body);
    t('10.3 and turning it back on really turns it back on', back?.data?.maintenanceMode === false);
  }

  // ------------------------------------------------------------------ end ---
  console.log('\n=========================================================');
  console.log(` ${pass} steps walked cleanly, ${fail} bugs found`);
  console.log('=========================================================');
  if (bugs.length) {
    console.log('\nBUGS:\n');
    bugs.forEach((b, i) => {
      console.log(`${i + 1}. [${b.walk}]`);
      console.log(`   ${b.step}`);
      console.log(`   ${b.detail}\n`);
    });
  }
  process.exit(0);
})();
