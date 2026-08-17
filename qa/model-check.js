/**
 * THE 13 AUGUST MODEL — Part 12 of RULES.md.
 *
 * Written before the code, so the first run tells us what is genuinely missing
 * rather than confirming what we happened to build. Failures here are the
 * work list.
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
let ipN = 0;
const nextIp = () => `10.${120 + Math.floor(ipN / 250)}.${(ipN++ % 250) + 1}.6`;

function req(method, path, body, { ip = null, cookie = null } = {}) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'x-forwarded-for': ip || nextIp() };
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    if (cookie) headers['Cookie'] = cookie;
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (x) => {
      let d = ''; x.on('data', (c) => (d += c));
      x.on('end', () => { let j = null; try { j = JSON.parse(d); } catch {}
        res({ code: x.statusCode, json: j, body: d, cookies: x.headers['set-cookie'] || [] }); });
    });
    r.on('error', (e) => res({ code: 0, json: null, body: String(e), cookies: [] }));
    if (data) r.write(data); r.end();
  });
}
const jarOf = (r) => (r.cookies || []).map((c) => c.split(';')[0]).join('; ');
const merge = (...a) => a.filter(Boolean).join('; ');

function answer(sessionId, questionId, jar, ip) {
  const b = '----m' + Date.now() + Math.random().toString(36).slice(2);
  const parts = [];
  const f = (k, v) => parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  f('questionId', questionId); f('durationSeconds', '45');
  parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="audio"; filename="a.webm"\r\nContent-Type: audio/webm\r\n\r\n`));
  parts.push(Buffer.alloc(20 * 1024, 7), Buffer.from('\r\n'));
  parts.push(Buffer.from(`--${b}--\r\n`));
  const payload = Buffer.concat(parts);
  return new Promise((res) => {
    const r = http.request({ host: '127.0.0.1', port: P, path: `/api/session/${sessionId}/answer`, method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${b}`, 'Content-Length': payload.length, 'x-forwarded-for': ip, Cookie: jar } },
      (x) => { let d = ''; x.on('data', (c) => (d += c)); x.on('end', () => { let j = null; try { j = JSON.parse(d); } catch {} res({ code: x.statusCode, json: j }); }); });
    r.on('error', () => res({ code: 0 })); r.write(payload); r.end();
  });
}

const rows = [];
const t = (rule, claim, ok, detail) => { rows.push({ rule, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${rule.padEnd(6)} ${claim.padEnd(56)} ${detail}`); };

async function signInSeat(token, via, seat) {
  const ip = nextIp();
  const r = await req('POST', '/api/auth/firebase',
    { idToken: `dev:${token}`, fingerprint: token, via, seat }, { ip });
  return { jar: jarOf(r), ip, res: r };
}

async function signIn(token, opts = {}) {
  const ip = opts.ip || nextIp();
  const r = await req('POST', '/api/auth/firebase',
    { idToken: `dev:${token}`, fingerprint: opts.fp || token, ...(opts.via ? { via: opts.via } : {}) }, { ip });
  return { jar: jarOf(r), ip, res: r };
}

(async () => {
  const S = Date.now().toString(36);
  const fs = require('fs');

  console.log('\n=== RESUMING AN UNFINISHED MOCK ===\n');

  const a = await signIn(`m1-${S}`);
  const s1 = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: a.ip, cookie: a.jar });
  a.jar = merge(a.jar, jarOf(s1));
  const sid = s1.json?.data?.sessionId;
  const qs = s1.json?.data?.questions ?? [];

  // Answer two, then walk away.
  await answer(sid, qs[0].id, a.jar, a.ip);
  await answer(sid, qs[1].id, a.jar, a.ip);

  const reopened = await req('GET', `/api/session/${sid}`, null, { ip: a.ip, cookie: a.jar });
  const sess = reopened.json?.data?.session;
  t('N-44', 'Coming back lands on the next unanswered question', sess?.currentIndex === 2,
    `answered 2 of ${qs.length} -> resumes at index ${sess?.currentIndex}`);
  t('N-45', 'The paper is never handed back fresh',
    (sess?.answers?.length ?? 0) === 2 &&
    (reopened.json?.data?.questions ?? []).map((q) => q.id).join(',') === qs.map((q) => q.id).join(','),
    `${sess?.answers?.length} answers kept, identical question plan`);

  const meMid = await req('GET', '/api/me', null, { ip: a.ip, cookie: a.jar });
  t('N-46', 'An unfinished sitting costs one credit, not a wasted mock',
    meMid.json?.data?.entitlement?.mocksLeft === 0,
    `one credit taken on the first answer; the remaining ${qs.length - 2} questions stay theirs`);

  const acct = await req('GET', '/api/account', null, { ip: a.ip, cookie: a.jar });
  const unfinished = (acct.json?.data?.sessions ?? []).find((x) => x.id === sid);
  t('N-47', 'The unfinished sitting is on the dashboard with a way back',
    !!unfinished && unfinished.status !== 'completed' && unfinished.answered === 2 && 'resumeHref' in (unfinished ?? {}),
    unfinished ? `status=${unfinished.status} answered=${unfinished.answered} resumeHref=${unfinished.resumeHref ?? 'MISSING'}` : 'not listed');

  console.log('\n=== QUESTIONS ===\n');

  const b = await signIn(`m2-${S}`);
  const s2 = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: b.ip, cookie: b.jar });
  const setA = qs.map((q) => q.id).join(',');
  const setB = (s2.json?.data?.questions ?? []).map((q) => q.id).join(',');
  t('N-26', 'Two students starting a trial get different question sets', setA !== setB,
    setA === setB ? 'IDENTICAL — every student would memorise the same ten' : 'different sets served');

  const qfile = fs.existsSync('lib/data/questions.ts') ? fs.readFileSync('lib/data/questions.ts', 'utf8') : '';
  t('N-27', 'Randomisation draws only from the vetted bank, never generates',
    /eligiblePool/.test(qfile) && !/generateQuestion|makeUpQuestion|synthesi/i.test(qfile),
    'a student who practises three mocks and then meets nothing familiar has been cheated');
  t('N-29', 'The question bank cites where its questions come from',
    /SOURCES, checked/i.test(qfile) && /https:\/\/www\.brookes\.ac\.uk/.test(qfile) &&
    /THE FIVE TOPIC AREAS/.test(qfile),
    'two named UK university sources, dated, with every category mapped to a published topic area');

  t('Q-1', 'Every category maps to a published Pre-CAS topic area',
    ['why_uk', 'why_university', 'why_course', 'finance', 'future_plans'].every((c) => qfile.includes(c)),
    'the five topic areas the universities themselves publish are all covered');

  t('Q-2', 'The bank encodes what the sources say actually fails a student',
    /not enough to rely on university rankings/i.test(qfile) &&
    /general answers that anyone could give/i.test(qfile),
    'a rankings-only answer must score badly on genuineIntent, not well - taken from the source, not guessed');

  console.log('\n=== PRACTICE ===\n');

  const headerSrc = fs.readFileSync('components/SiteHeader.tsx', 'utf8');
  t('N-33', 'Practice has its own tab', /practi/i.test(headerSrc) && headerSrc.includes('/practice'),
    'header links to /practice');

  const pr = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'practice' }, { ip: b.ip, cookie: b.jar });
  t('N-35', 'Practice spends a practice credit, never a mock credit',
    pr.code === 402 && /practice/i.test(pr.json?.error?.userMessage ?? ''),
    `trial student with 0 practice -> ${pr.code} "${(pr.json?.error?.userMessage ?? '').slice(0, 44)}"`);

  console.log('\n=== CHOOSING A UNIVERSITY ===\n');

  const uni = await req('GET', '/universities');
  t('N-38', 'The university list is searchable', /type="search"|placeholder="[^"]*[Ss]earch/.test(uni.body),
    /search/i.test(uni.body) ? 'a search control is rendered' : 'NO SEARCH — a long list is a wall');
  t('N-39', 'The most applied-to are pinned first', /most applied/i.test(uni.body),
    /most applied/i.test(uni.body) ? 'featured section present' : 'no pinned section');
  // Source-level: the empty-search branch only renders once a student has
  // typed something with no matches, so it is not in the first paint.
  const uniSrc = fs.readFileSync('app/(student)/universities/page.tsx', 'utf8');
  t('N-40', 'A student whose university is missing can still start',
    /not on our list/i.test(uniSrc) && /Practise the general UK interview/i.test(uniSrc),
    /Practise the general UK interview/i.test(uniSrc)
      ? 'the no-results branch offers the general UK paper, not a shrug'
      : 'DEAD END for anyone not on the list');

  console.log('\n=== THE KILL SWITCH ===\n');

  const own = process.env.OWNER_KEY || QA_OWNER_KEY;
  const on = await req('POST', '/api/platform', { action: 'setMaintenance', ownerKey: own, enabled: true, contactName: 'Umanga', contactPhone: '9800000000' });
  const paths = ['/api/me', '/api/account', '/api/payment', '/api/session/create'];
  const codes = [];
  for (const p of paths) codes.push((await req(p === '/api/me' || p === '/api/account' ? 'GET' : 'POST', p, p.includes('payment') ? { action: 'status', orderId: 'x' } : {}, { ip: a.ip, cookie: a.jar })).code);
  t('N-41', 'While closed, every student API refuses', codes.every((c) => c === 503),
    `${paths.join(' ')} -> ${codes.join(', ')}`);
  const superWhileDown = await req('POST', '/api/super', { action: 'overview', superKey: QA_SUPER_KEY });
  t('N-42', 'Even the back office is closed, so there is no workaround',
    superWhileDown.code === 503,
    `/api/super while paused -> ${superWhileDown.code} (must be 503)`);
  await req('POST', '/api/platform', { action: 'setMaintenance', ownerKey: own, enabled: false });
  const backUp = await req('GET', '/api/me', null, { ip: a.ip, cookie: a.jar });
  const stillThere = await req('GET', `/api/session/${sid}`, null, { ip: a.ip, cookie: a.jar });
  t('N-43', 'Nothing was deleted while it was closed',
    backUp.json?.data?.signedIn === true && (stillThere.json?.data?.session?.answers?.length ?? 0) === 2,
    `session survived with ${stillThere.json?.data?.session?.answers?.length} answers`);

  console.log('\n=== SUPER ADMIN VISIBILITY ===\n');

  const dev = await req('POST', '/api/super', { action: 'flaggedTrials', superKey: QA_SUPER_KEY });
  t('N-17', 'Devices running many Google accounts reach a human queue',
    dev.json?.ok === true, `queue reachable, ${Array.isArray(dev.json?.data) ? dev.json.data.length : '?'} entries`);

  console.log('\n=== SEATS (N-1) ===\n');

  const direct2 = await signIn(`n4d-${S}`);
  const stu2Ip = direct2.ip, stu2Jar = direct2.jar;

  const SU = QA_SUPER_KEY;
  const cs = `n1-${S}`;
  const mk = await req('POST', '/api/platform',
    { action: 'createConsultancy', superKey: SU, name: cs, slug: cs, seatsTotal: 20, paidNpr: 6000, passcode: 'handover-n1' });
  // 20, not 5: this block signs up seven students and an earlier version ran
  // the consultancy out of seats halfway through, so seat10 came back as the
  // bare trial and looked like a broken seat size. It was a broken test.
  await req('POST', '/api/platform',
    { action: 'setConsultancyStatus', superKey: SU, consultancyId: mk.json?.data?.id, status: 'approved' });
  // The handover code opens the door once and nothing else. Replace it first.
  await req('POST', '/api/admin',
    { action: 'changePasscode', slug: cs, passcode: 'handover-n1', newPasscode: 'n1pass123' });

  // Three students through three DIFFERENT seat-size links from one consultancy.
  const sizes = [['seat3', 3], ['seat6', 6], ['seat10', 10]];
  const got = [];
  for (const [code] of sizes) {
    const st = await signIn(`n1-${code}-${S}`, { via: cs });
    const m = await req('GET', '/api/me', null, { ip: st.ip, cookie: st.jar });
    got.push(m.json?.data?.entitlement?.mocksLeft);
  }
  // Without a seat param every link gives the default (10) + 1 trial = 11.
  t('N-1a', 'A link with no size gives the default seat', got.every((g) => g === 11),
    `three default links -> ${got.join(', ')} mocks each (10 seat + 1 trial)`);

  const sized = [];
  for (const [code, mocks] of sizes) {
    const st = await signInSeat(`n1s-${code}-${S}`, cs, code);
    const m = await req('GET', '/api/me', null, { ip: st.ip, cookie: st.jar });
    sized.push([code, m.json?.data?.entitlement?.mocksLeft, mocks + 1]);
  }
  t('N-1', 'A consultancy can hand out 3, 6 and 10 mock seats side by side',
    sized.every(([, actual, want]) => actual === want),
    sized.map(([c, a, w]) => `${c}:${a}(want ${w})`).join('  '));

  const forged = await signInSeat(`n1x-${S}`, cs, 'seat9999');
  const fm = await req('GET', '/api/me', null, { ip: forged.ip, cookie: forged.jar });
  t('N-1b', 'An invented seat size in the URL grants the default, not itself',
    fm.json?.data?.entitlement?.mocksLeft === 11,
    `?seat=seat9999 -> ${fm.json?.data?.entitlement?.mocksLeft} mocks (falls back, never trusts the URL)`);

  // N-4. A seat-backed student is never sold to.
  const seated = await signInSeat(`n4-${S}`, cs, 'seat6');
  const seatedMe = await req('GET', '/api/me', null, { ip: seated.ip, cookie: seated.jar });
  const seatedAcct = await req('GET', '/api/account', null, { ip: seated.ip, cookie: seated.jar });
  t('N-4', 'A consultancy student is marked seat-backed and never sold to',
    seatedMe.json?.data?.seatBacked === true && seatedAcct.json?.data?.seatBacked === true,
    `me.seatBacked=${seatedMe.json?.data?.seatBacked} account.seatBacked=${seatedAcct.json?.data?.seatBacked}, mocks ${seatedMe.json?.data?.entitlement?.mocksLeft}`);

  const payingMe = await req('GET', '/api/me', null, { ip: stu2Ip, cookie: stu2Jar });
  t('N-4b', 'A student who pays us directly is NOT marked seat-backed',
    payingMe.json?.data?.seatBacked === false,
    `direct student seatBacked=${payingMe.json?.data?.seatBacked} (so they still see prices)`);

  // N-5. The consultancy tops a student up, and it costs them a seat.
  const before = await req('POST', '/api/admin', { action: 'login', slug: cs, passcode: 'n1pass123' });
  const seatsUsedBefore = before.json?.data?.stats?.seatsUsed;
  const target = (before.json?.data?.students ?? []).find((x) => x.mocksLeft === 7);
  const renew = await req('POST', '/api/admin',
    { action: 'renewStudent', slug: cs, passcode: 'n1pass123', studentId: target?.id, seatSize: 'seat3' });
  const after = await req('POST', '/api/admin', { action: 'login', slug: cs, passcode: 'n1pass123' });
  const renewed = (after.json?.data?.students ?? []).find((x) => x.id === target?.id);
  t('N-5', 'A consultancy renewal ADDS credits and costs one seat',
    renew.json?.ok === true && renewed?.mocksLeft === 10 &&
    after.json?.data?.stats?.seatsUsed === seatsUsedBefore + 1,
    `student 7 -> ${renewed?.mocksLeft} mocks (7 kept + 3 added, never replaced); seats ${seatsUsedBefore} -> ${after.json?.data?.stats?.seatsUsed}`);

  const otherCs = `n5o-${S}`;
  const mk2 = await req('POST', '/api/platform',
    { action: 'createConsultancy', superKey: SU, name: otherCs, slug: otherCs, seatsTotal: 5, paidNpr: 6000, passcode: 'handover-n5' });
  await req('POST', '/api/platform',
    { action: 'setConsultancyStatus', superKey: SU, consultancyId: mk2.json?.data?.id, status: 'approved' });
  await req('POST', '/api/admin',
    { action: 'changePasscode', slug: otherCs, passcode: 'handover-n5', newPasscode: 'n5pass123' });
  const cross = await req('POST', '/api/admin',
    { action: 'renewStudent', slug: otherCs, passcode: 'n5pass123', studentId: target?.id });
  t('N-5b', 'One consultancy cannot top up another\'s student', cross.code === 404,
    `renewing a stranger's student -> ${cross.code}`);

  console.log('\n=== QR, CONTACT AND WHATSAPP ===\n');

  const set = await req('POST', '/api/super', {
    action: 'setPaymentSettings', superKey: SU,
    payQrImageUrl: 'https://example.test/qr.png', payWalletName: 'eSewa',
    payWalletNumber: '9800000001', payAccountName: 'PreCAS', supportWhatsapp: '9779800000002',
  });
  const payer = await signIn(`n11-${S}`);
  const ord = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: payer.ip, cookie: payer.jar });
  const pd = ord.json?.data;
  t('N-11', 'The super admin can change the QR and wallet without a deploy',
    set.json?.ok === true && pd?.payTo?.qrImageUrl === 'https://example.test/qr.png' && pd?.payTo?.walletNumber === '9800000001',
    `checkout now shows qr=${pd?.payTo?.qrImageUrl} wallet=${pd?.payTo?.walletNumber}`);
  t('N-20', 'The support number is editable and reaches the student',
    pd?.supportWhatsapp === '9779800000002',
    `supportWhatsapp=${pd?.supportWhatsapp}`);
  t('N-12', 'The WhatsApp message is written for them, not by them',
    /problem with my payment/i.test(pd?.supportMessage ?? '') && (pd?.supportMessage ?? '').includes(String(pd?.orderId).slice(0, 8)),
    `"${(pd?.supportMessage ?? '').slice(0, 62)}..." carries their reference`);

  const adminTry = await req('POST', '/api/admin',
    { action: 'setPaymentSettings', slug: cs, passcode: 'n1pass123', payWalletNumber: '9779999999' });
  t('N-11b', 'A consultancy admin cannot change the QR or the wallet',
    adminTry.code === 400 || adminTry.json?.ok !== true,
    `admin attempting setPaymentSettings -> ${adminTry.code} (no such action on their route)`);

  await req('POST', '/api/payment',
    { action: 'submit', orderId: pd?.orderId, walletTxnId: `N11${S}`, payerName: 'Phone Test', payerPhoneSuffix: '4321' },
    { ip: payer.ip, cookie: payer.jar });
  const queue = await req('POST', '/api/super', { action: 'orders', superKey: SU });
  const mineQ = (queue.json?.data ?? []).find((o) => o.walletTxnId === `N11${S}`.toUpperCase());
  t('N-13', 'Every approval request carries a number to ring',
    !!mineQ && 'payerPhone' in mineQ && mineQ.payerPhoneSuffix === '4321',
    `queue item has payerPhone field and the last 4 digits (${mineQ?.payerPhoneSuffix})`);

  // N-9. Order on the page, checked by position in the source: QR, then the
  // wallet details, then the form, then the optional photo, then the button.
  const co = fs.readFileSync('app/(student)/checkout/page.tsx', 'utf8');
  /**
   * ANCHOR ON MARKUP, NOT ON PROSE.
   *
   * N-9 asserts the order of things ON THE SCREEN using their order in the
   * file, and it was matching bare sentences. Two of them also appear in
   * comments: the long note explaining why we ask for a whole WhatsApp number
   * quotes a student saying "I have paid", so `indexOf` found the BUTTON above
   * the receipt field and reported a correctly ordered checkout as wrong.
   *
   * The obvious repair - strip the comments first, per REDESIGN.md Part 7 -
   * does not work here, and the reason is worth recording because it will bite
   * again. This page contains an accept attribute whose value is the two
   * characters "image" followed by a slash and a star. To a regex hunting for a
   * comment opener, that string literal OPENS one, which then runs to the next
   * comment closer and swallows the submit button whole. A comment stripper
   * that does not understand string literals is not a comment stripper.
   *
   * This very comment had to be reworded for the same reason: describing the
   * closing marker literally would have ended the comment describing it.
   *
   * So this anchors on things that cannot occur in prose: the quoted string the
   * button actually renders, and the label attribute of the field. Prose can
   * quote a sentence; it does not quote it with its JSX punctuation attached.
   */
  const pos = (needle) => co.indexOf(needle);
  t('N-9', 'The checkout is laid out for one hand and one phone',
    pos('qrImageUrl') < pos('label="Transaction number"') &&
    pos('label="Transaction number"') < pos('label="Picture of the receipt') &&
    pos('label="Picture of the receipt') < pos("'I have paid'"),
    'QR -> wallet number -> details -> optional photo -> pay, in that order');
  /**
   * N-9b. This used to search the checkout source for the literal sentence
   * "Something wrong? Message us on WhatsApp". That inline markup was replaced
   * by <ContactUs/>, which is strictly better, and the test went red while the
   * product got safer. A test that matches a string rather than a guarantee
   * fails the day somebody improves the thing it was protecting.
   *
   * So it now checks the guarantee itself, in two halves: the escape hatch is
   * BELOW the button that can fail, and the escape hatch is not merely a
   * button. A WhatsApp link is a bet that one app on one phone opens. If it
   * does not, a student who has just sent real money has nothing. The number
   * has to be on the screen as dialable text as well.
   */
  const contact = fs.readFileSync('components/ContactUs.tsx', 'utf8');
  // `pos` is indexOf, and the FIRST <ContactUs/> on this page is the one on the
  // money-in-flight screen, which sits above the form. The guarantee is that
  // there is ALSO one after the button, so search forward from the button.
  t('N-9b', 'The WhatsApp escape sits under the button that might fail',
    co.indexOf('<ContactUs', pos("'I have paid'")) !== -1,
    'a student who has sent money and hit a problem does not have to hunt for us');
  t('N-9c', 'And the escape is not just a button: the number is dialable text',
    /href={`tel:\+\$\{digits\}`}/.test(contact) && /wa\.me\/\$\{digits\}/.test(contact),
    'if WhatsApp does not open, a button is nothing. The number must be readable and callable.');

  console.log('\n=== SEATS FOR CONSULTANCIES (N-6) ===\n');

  const buy = await req('POST', '/api/admin',
    { action: 'buySeats', slug: cs, passcode: 'n1pass123', bundleCode: 'b20' });
  t('N-6', 'A consultancy buys more seats the same way a student pays',
    buy.json?.ok === true && buy.json?.data?.seats === 20 && buy.json?.data?.amountNpr === 6000 &&
    'qrImageUrl' in (buy.json?.data?.payTo ?? {}),
    `20 seats for NPR ${buy.json?.data?.amountNpr}, same QR and same super-admin queue`);
  const badBundle = await req('POST', '/api/admin',
    { action: 'buySeats', slug: cs, passcode: 'n1pass123', bundleCode: 'b9999' });
  t('N-6b', 'An invented bundle code is refused', badBundle.code === 400,
    `bundleCode=b9999 -> ${badBundle.code}, the server owns the price (G-2)`);

  console.log('\n=== QUESTION AUTHORING ===\n');

  const addQ = await req('POST', '/api/super',
    { action: 'addQuestion', superKey: SU, category: 'finance',
      text: 'Who exactly is paying your tuition, and where is that money now?',
      intent: 'Checks the funding story holds together and names a real source.' });
  t('N-25', 'The super admin adds a question with no deploy',
    addQ.json?.ok === true && typeof addQ.json?.data?.total === 'number',
    `added ${addQ.json?.data?.id}, bank now has ${addQ.json?.data?.total} extra question(s)`);

  const junk = await req('POST', '/api/super', { action: 'addQuestion', superKey: SU, category: 'x', text: 'no', intent: 'no' });
  t('N-25b', 'A half-written question is refused', junk.code === 400,
    `two-character question -> ${junk.code}`);

  const poor = await signIn(`n28a-${S}`);
  const poorTry = await req('POST', '/api/me',
    { ownQuestions: ['Why did you choose to study in the United Kingdom rather than Australia?'] },
    { ip: poor.ip, cookie: poor.jar });
  t('N-28', 'Own questions are refused below the top pack',
    poorTry.json?.error?.code === 'NOT_ON_TOP_PACK' &&
    /keeps working/i.test(poorTry.json?.error?.userMessage ?? ''),
    `trial student -> ${poorTry.json?.error?.code}, and told nothing else is taken away`);

  const rich = await signIn(`n28b-${S}`);
  const richOrd = await req('POST', '/api/payment', { action: 'create', packCode: 'serious' }, { ip: rich.ip, cookie: rich.jar });
  await req('POST', '/api/payment',
    { action: 'submit', orderId: richOrd.json?.data?.orderId, walletTxnId: `N28${S}`, payerName: 'Top Pack', payerPhoneSuffix: '9090' },
    { ip: rich.ip, cookie: rich.jar });
  await req('POST', '/api/super',
    { action: 'verifyPayment', superKey: SU, orderId: richOrd.json?.data?.orderId, confirmedInWalletLedger: true });
  const richTry = await req('POST', '/api/me',
    { ownQuestions: ['Why did you choose to study in the United Kingdom rather than Australia?'] },
    { ip: rich.ip, cookie: rich.jar });
  t('N-28b', 'A student on the 799 pack can add their own questions',
    richTry.json?.ok === true && richTry.json?.data?.added === 1,
    `after buying the top pack -> added ${richTry.json?.data?.added}`);

  console.log('\n=== PRACTICE ===\n');

  const advSrc = fs.readFileSync('lib/advice.ts', 'utf8');
  t('N-36', 'Practice aims at their weakest ASSESSED sub-score by default',
    /weakestCategoryFor/.test(advSrc) && /CATEGORY_FOR_SUBSCORE/.test(advSrc) &&
    fs.readFileSync('app/api/session/create/route.ts', 'utf8').includes('weakestCategoryFor'),
    'the drill continues the report instead of starting over; null when nothing is scored');

  const acctSrc2 = fs.readFileSync('app/api/account/route.ts', 'utf8');
  t('N-37', 'Practice is marked in history and never distorts the mock trend',
    /isPractice/.test(acctSrc2) && /mode !== 'practice'/.test(acctSrc2),
    'a ONE-question drill averaged with a 17-question mock would swing the trend on a single answer');

  const seatedPractice = await req('POST', '/api/session/create',
    { institution: 'bpp-university', mode: 'practice' }, { ip: seated.ip, cookie: seated.jar });
  t('N-34', 'Practice is one question at a time, from a practice credit',
    (seatedPractice.json?.data?.questions ?? []).length === 1,
    `seat-backed student with practice credits -> ${(seatedPractice.json?.data?.questions ?? []).length} question`);

  console.log('\n=== SUPER ADMIN DIRECTORY ===\n');

  // A student pays and volunteers their details at that moment.
  const dirStu = await signIn(`n22-${S}`);
  const dirOrd = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: dirStu.ip, cookie: dirStu.jar });
  await req('POST', '/api/payment', {
    action: 'submit', orderId: dirOrd.json?.data?.orderId, walletTxnId: `N22${S}`,
    payerName: 'Directory Test', payerPhoneSuffix: '7788',
    whatsappNumber: '9779812345678', whatsappConfirmed: true,
    city: 'Pokhara', level: 'masters', targetUniversity: 'Coventry University',
  }, { ip: dirStu.ip, cookie: dirStu.jar });

  const dir = await req('POST', '/api/super', { action: 'directory', superKey: SU });
  const dd = dir.json?.data;
  const row = (dd?.students ?? []).find((x) => x.city === 'Pokhara');
  t('N-21', 'Students and consultancies are listed separately',
    Array.isArray(dd?.students) && Array.isArray(dd?.consultancies),
    `${dd?.students?.length} students and ${dd?.consultancies?.length} consultancies, in two lists`);
  t('N-22', 'Level, university and a CONFIRMED WhatsApp number are captured',
    row?.level === 'masters' && row?.targetUniversity === 'Coventry University' &&
    row?.whatsappNumber === '9779812345678' && row?.whatsappConfirmed === true,
    `level=${row?.level} uni=${row?.targetUniversity} whatsapp=${row?.whatsappNumber} confirmed=${row?.whatsappConfirmed}`);
  t('N-23', 'City only, volunteered at payment, never GPS',
    row?.city === 'Pokhara' && !('latitude' in (row ?? {})) && !('gps' in (row ?? {})),
    `city=${row?.city}, and no coordinate field exists anywhere on the record`);
  const csRow = (dd?.consultancies ?? []).find((x) => x.slug === cs);
  t('N-24', 'Per consultancy: seats given out, renewals, students from the link',
    csRow && typeof csRow.seatsGivenOut === 'number' && typeof csRow.renewals === 'number' && typeof csRow.studentsFromLink === 'number',
    `${cs}: given ${csRow?.seatsGivenOut}/${csRow?.seatsTotal}, renewals ${csRow?.renewals}, students ${csRow?.studentsFromLink}`);
  t('N-21b', 'The directory still carries no transcript, at any level',
    !JSON.stringify(dd ?? {}).includes('transcript'),
    'G-8 holds for the super admin too');

  console.log('\n=== DEVICE SOFT-BLOCK ===\n');

  const blockedFp = `blocked-device-${S}`;
  const before18 = await signIn(`n18a-${S}`, { fp: blockedFp });
  const blk = await req('POST', '/api/super', { action: 'setDeviceBlock', superKey: SU, fingerprint: blockedFp, blocked: true });
  const after18 = await signIn(`n18b-${S}`, { fp: blockedFp });
  t('N-18', 'A hand-blocked device stops getting free trials',
    blk.json?.ok === true &&
    before18.res.json?.data?.trial?.outcome === 'granted' &&
    after18.res.json?.data?.trial?.outcome === 'soft_denied',
    `same device: before=${before18.res.json?.data?.trial?.outcome} after=${after18.res.json?.data?.trial?.outcome}`);

  const msg = after18.res.json?.data?.trial?.message ?? '';
  t('N-19', 'A blocked student is told how to reach us, never called a cheat',
    /still buy a pack/i.test(msg) && !/ban|fraud|cheat/i.test(msg),
    `"${msg.slice(0, 78)}..."`);

  const stillIn = await req('GET', '/api/me', null, { ip: after18.ip, cookie: after18.jar });
  t('N-18b', 'A soft block is SOFT: they are still signed in and can still pay',
    stillIn.json?.data?.signedIn === true,
    `blocked student still signed in (mocks ${stillIn.json?.data?.entitlement?.mocksLeft}), never banned`);

  const unblk = await req('POST', '/api/super', { action: 'setDeviceBlock', superKey: SU, fingerprint: blockedFp, blocked: false });
  const after19 = await signIn(`n18c-${S}`, { fp: blockedFp });
  t('N-18c', 'Unblocking releases the device immediately',
    unblk.json?.ok === true && after19.res.json?.data?.trial?.outcome === 'granted',
    `after release -> ${after19.res.json?.data?.trial?.outcome}`);

  const tg = fs.readFileSync('lib/trial-gate.ts', 'utf8');
  t('N-19b', 'The WhatsApp appeal link is pre-filled',
    /blockedWhatsappLink/.test(tg) && /wa\.me/.test(tg) && /My name is/.test(tg),
    'a wrongly flagged student never has to compose an appeal in English on a phone');

  console.log('\n=== UPGRADE, RENEWAL AND INSTALL ===\n');

  const lowStu = await signIn(`n15-${S}`);
  const lowAcct = await req('GET', '/api/account', null, { ip: lowStu.ip, cookie: lowStu.jar });
  t('N-14', 'A paying student is always offered a way to buy more',
    lowAcct.json?.data?.offerUpgrade === true,
    `offerUpgrade=${lowAcct.json?.data?.offerUpgrade} for a student who pays us`);
  t('N-15', 'The top-up appears at two mocks or fewer, not at zero',
    lowAcct.json?.data?.offerRenew === true && lowAcct.json?.data?.entitlement?.mocksLeft <= 2,
    `mocksLeft=${lowAcct.json?.data?.entitlement?.mocksLeft} -> offerRenew=${lowAcct.json?.data?.offerRenew}`);
  t('N-15b', 'The checkout can be pre-filled from their last payment',
    'lastPayer' in (lowAcct.json?.data ?? {}),
    `lastPayer=${JSON.stringify(lowAcct.json?.data?.lastPayer)} (null until they have paid once)`);

  const seatAcct = await req('GET', '/api/account', null, { ip: seated.ip, cookie: seated.jar });
  t('N-14b', 'A seat-backed student is never offered a price',
    seatAcct.json?.data?.offerUpgrade === false && seatAcct.json?.data?.offerRenew === false,
    `seat-backed: offerUpgrade=${seatAcct.json?.data?.offerUpgrade} offerRenew=${seatAcct.json?.data?.offerRenew}`);

  const acctSrc = fs.readFileSync('app/(student)/account/page.tsx', 'utf8');
  t('N-16', 'The install prompt is on the page they come BACK to',
    /InstallPrompt/.test(acctSrc),
    'dashboard offers install, not only the report they see once');

  console.log('\n=== PRICING ===\n');

  const plans = fs.readFileSync('lib/data/plans.ts', 'utf8');
  const prep = (plans.match(/code: 'prep'[\s\S]*?costNpr: (\d+)/) || [])[0] || '';
  const serious = (plans.match(/code: 'serious'[\s\S]*?costNpr: (\d+)/) || [])[0] || '';
  t('M-8', 'NPR 449 buys 3 mocks and 15 practice',
    /priceNpr: 449/.test(prep) && /mockInterviews: 3/.test(prep) && /practiceSessions: 15/.test(prep),
    'prep = 449 / 3 mocks / 15 practice, costs us ~NPR 30');
  t('M-9', 'NPR 799 buys 10 mocks and 20 practice',
    /priceNpr: 799/.test(serious) && /mockInterviews: 10/.test(serious) && /practiceSessions: 20/.test(serious),
    'serious = 799 / 10 mocks / 20 practice, costs us ~NPR 98');
  t('M-10', 'A seat is derived from the 799 pack and cannot drift',
    /SEAT_PLAN\.mockInterviews/.test(plans) && /SEAT_PLAN\.practiceSessions/.test(plans),
    'SEAT_GRANT reads the plan rather than repeating its numbers');

  const cmp = fs.readFileSync('components/PricingPacks.tsx', 'utf8');
  // Strip comments first: the file EXPLAINS why the per-mock rate is not shown,
  // and grepping the raw file matches that explanation. Fourth time this class
  // of mistake has appeared - assert on code, never on prose.
  const cmpCode = cmp.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  t('M-12', 'No per-mock rate is rendered anywhere',
    !/per mock interview|perMockNpr\(/.test(cmpCode) && /Entry pack/.test(cmpCode),
    'at 449 for 3 mocks we are NPR 150/mock vs their 143-160; the page compares entry price and free trial instead');

  const pricingPage = await req('GET', '/pricing');
  t('G-9b', 'The live pricing page makes no per-mock claim',
    !/per mock/i.test(pricingPage.body),
    /per mock/i.test(pricingPage.body) ? 'STILL CLAIMS a per-mock rate' : 'no per-mock rate rendered anywhere');

  console.log('\n=== THE AI CONTRACT ===\n');

  const c = fs.readFileSync('lib/ai/contract.ts', 'utf8');
  t('AI-1', 'The evaluator input is fixed and narrow',
    /previousTranscripts/.test(c) && /durationSeconds/.test(c) && /institution/.test(c),
    'question, category, intent, transcript, duration, university, level, prior answers');
  // Check the INTERFACE BODY, not the file. The file explains in prose what is
  // deliberately not sent, and an earlier version of this assertion matched
  // that explanation and failed - the same mistake as S-16.
  const inputBody = (c.match(/export interface EvaluationInput \{([\s\S]*?)\n\}/) || [])[1] || '';
  const leaks = ['email', 'phone', 'name', 'consultancy', 'payer', 'referral', 'studentId']
    .filter((f) => new RegExp(`^\\s*(?:/\\*\\*)?\\s*${f}\\w*\\s*[?:]`, 'im').test(inputBody));
  t('AI-2', 'Nothing identifying is ever sent to a provider', leaks.length === 0,
    leaks.length ? `LEAKS: ${leaks.join(', ')}` : 'the input shape carries no identifying field at all');
  t('AI-3', 'Output is PEE + wrap-up + Nepali + nullable sub-scores',
    /point:/.test(c) && /evidence:/.test(c) && /explanation:/.test(c) && /wrapUp:/.test(c) && /number \| null/.test(c),
    'nulls allowed so a dimension we could not judge is never scored 0');
  t('AI-4', 'Contradiction across answers is a first-class output', /contradiction: string \| null/.test(c),
    'the highest-value thing the AI can find, and invisible to a single-answer grader');
  t('AI-5', 'The system prompt is in code, not a provider console',
    /EVALUATOR_SYSTEM_PROMPT/.test(c), 'versioned and diffable like everything else');
  t('AI-6', 'Accent and grammar are never penalised', /DO NOT PENALISE ACCENT/.test(c),
    'only vagueness, contradiction, bad numbers and recited answers');
  t('AI-7', 'Transcription carries a language and vocabulary hint',
    /VOCABULARY_HINT/.test(c) && /languageHint/.test(c),
    'stops the model inventing words it then quotes back as evidence');
  t('AI-8', 'Generic output is rejected at runtime, never shipped',
    /looksGeneric/.test(c) && /FEEDBACK_UNAVAILABLE/.test(c),
    'evidence must overlap the transcript; failure drops the prose and says so');

  const pass = rows.filter((r) => r.ok).length;
  console.log(`\n  ${pass} passed, ${rows.length - pass} failed, ${rows.length} rules\n`);
  process.exit(0); // first run is a survey, not a gate
})();
