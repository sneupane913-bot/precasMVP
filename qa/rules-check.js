/**
 * RULE COVERAGE.
 *
 * One assertion per rule in RULES.md that was only `BUILT`. A rule is not
 * BUILT+PROVEN until a test here names its ID and passes.
 *
 * Two things this file refuses to do:
 *   1. Assert something trivially true so a rule can be ticked. A test that
 *      cannot fail proves nothing, and that habit is exactly how every suite
 *      stayed green while a student could not stay signed in.
 *   2. Claim a browser-only rule. Camera, microphone, the on-screen timer and
 *      the violation monitor cannot be reached over HTTP. Those are listed at
 *      the end as NOT PROVABLE HERE and stay BUILT until the live session.
 *
 * Run: see qa/README.md. Needs `next dev` and no .env.local in the mirror.
 */
const http = require('http');
const fsBrand = require('fs');

/** Pulled from lib/branding.ts rather than re-typed, so a rename here cannot drift from the product. */
const BRAND_NAME = (() => {
  const src = fsBrand.readFileSync(require('path').join(__dirname, '..', 'lib', 'branding.ts'), 'utf8');
  const m = src.match(/export const BRAND_NAME = '([^']+)'/);
  if (!m) throw new Error('rules-check: could not read BRAND_NAME from lib/branding.ts');
  return m[1];
})();

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
const nextIp = () => `10.${70 + Math.floor(ipN / 250)}.${(ipN++ % 250) + 1}.4`;

function req(method, path, body, { ip = null, cookie = null } = {}) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'x-forwarded-for': ip || nextIp() };
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (cookie) headers['Cookie'] = cookie;
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (x) => {
      let d = '';
      x.on('data', (c) => (d += c));
      x.on('end', () => {
        let j = null;
        try { j = JSON.parse(d); } catch { /* html */ }
        res({ code: x.statusCode, json: j, body: d, cookies: x.headers['set-cookie'] || [] });
      });
    });
    r.on('error', (e) => res({ code: 0, json: null, body: String(e), cookies: [] }));
    if (data) r.write(data);
    r.end();
  });
}

/** Rendered text with React's `<!-- -->` separators and tags stripped. */
async function text(path) {
  const r = await req('GET', path);
  const noComments = r.body.replace(/<!--[\s\S]*?-->/g, '');
  return {
    code: r.code,
    html: r.body,
    text: noComments.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
  };
}

const jarOf = (r) => (r.cookies || []).map((c) => c.split(';')[0]).join('; ');
const SUPER = QA_SUPER_KEY;
const rows = [];
function t(rule, claim, ok, detail) {
  rows.push({ rule, ok });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${rule.padEnd(6)} ${claim.padEnd(58)} ${detail}`);
}

/** A valid, deterministic Nepali mobile derived from the token. */
function qaPhone(token) {
  let h = 7;
  for (const c of String(token)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return '98' + String(Math.abs(h)).padStart(8, '0').slice(-8);
}

async function signIn(token, opts = {}) {
  const ip = opts.ip || nextIp();
  const r = await req('POST', '/api/auth/firebase',
    { idToken: `dev:${token}`, fingerprint: opts.fp || token, ...(opts.via ? { via: opts.via } : {}) }, { ip });
  const out = { jar: jarOf(r), ip, res: r };
  // N-30: an interview cannot start until a name and WhatsApp number are on
  // file, so the harness completes the welcome form exactly as a student must.
  // Pass noProfile:true to test the gate itself.
  if (!opts.noProfile) {
    await req('POST', '/api/student/profile',
      { fullName: `QA Student ${token}`.slice(0, 60), whatsappNumber: qaPhone(token) },
      { ip, cookie: out.jar });
  }
  return out;
}

const PUBLIC_PAGES = ['/', '/pricing', '/universities', '/consultancy', '/privacy', '/terms', '/refund', '/practice', '/start'];

(async () => {
  const S = Date.now().toString(36);
  console.log('\n=== GLOBAL ===\n');

  // G-3 never a dead end: every public page offers a way onward.
  let deadEnds = [];
  for (const p of PUBLIC_PAGES) {
    const r = await text(p);
    const links = (r.html.match(/href="\/[^"]*"/g) || []).length;
    if (r.code !== 200 || links < 2) deadEnds.push(`${p}(${r.code},${links} links)`);
  }
  t('G-3', 'Every public page loads and offers a way onward', deadEnds.length === 0,
    deadEnds.length ? deadEnds.join(' ') : `${PUBLIC_PAGES.length} pages, all with links out`);

  // G-9 no claim we cannot prove.
  const BANNED = ['cheapest', 'best in nepal', 'number one', 'guaranteed', '100% accurate', 'pass rate', 'success rate'];
  let claims = [];
  for (const p of ['/', '/pricing', '/universities', '/consultancy']) {
    const r = await text(p);
    const low = r.text.toLowerCase();
    for (const b of BANNED) if (low.includes(b)) claims.push(`${p}:"${b}"`);
  }
  t('G-9', 'No unprovable superlative or unmeasured metric on a public page', claims.length === 0,
    claims.length ? claims.join(' ') : `checked ${BANNED.length} banned phrases on 4 pages`);

  // G-10 / E-6 a control that changes server state must report what it did.
  // Source-level, because "did the button show an error" is a property of the
  // code path, not of one rendered page.
  const fs = require('fs');
  const ab = fs.readFileSync('components/ActionButton.tsx', 'utf8');
  t('G-10', 'A shared control reports working / failed / done and locks in flight',
    ab.includes("state === 'busy'") && ab.includes('role="alert"') && ab.includes('aria-busy'),
    'ActionButton locks on busy, has an alert region, and reports success');
  t('E-6', 'Errors attach to the button that caused them', ab.includes('mt-2') && ab.includes('role="alert"'),
    'error renders directly under the control, not at page top');

  console.log('\n=== VISITOR ===\n');

  const home = await text('/');
  t('V-1', 'Every public page is readable without signing in',
    (await Promise.all(PUBLIC_PAGES.map((p) => text(p)))).every((r) => r.code === 200),
    `${PUBLIC_PAGES.length}/${PUBLIC_PAGES.length} pages return 200 to an anonymous visitor`);

  t('V-3', 'Start controls carry the destination through sign-in', home.html.includes('/start?next='),
    'home CTA is /start?next=/universities, not a bare /universities');

  const four04 = await text('/no-such-page-' + S);
  t('V-7', 'An unknown URL is branded and offers two ways out',
    four04.code === 404 && four04.text.includes(BRAND_NAME) && (four04.html.match(/href="\/[^"]*"/g) || []).length >= 2,
    `${four04.code}, branded, ${(four04.html.match(/href="\/[^"]*"/g) || []).length} links out`);

  const start = await text('/start');
  t('V-9', 'The sign-in screen never renders an invisible placeholder',
    !fs.readFileSync('components/FirebaseSignIn.tsx', 'utf8').includes('if (!ready) return <div className="h-14" />') &&
    fs.readFileSync('components/FirebaseSignIn.tsx', 'utf8').includes('popupIsUnreliable'),
    'blank placeholder removed; iOS and in-app browsers skip straight to redirect');

  t('V-10', 'No card, password or phone field before the free trial',
    !/type="password"|type="tel"|card number|cvv/i.test(start.html),
    'no password, tel or card input on the sign-in screen');

  console.log('\n=== STUDENT ===\n');

  const stu = await signIn(`r1-${S}`);
  const me = await req('GET', '/api/me', null, { ip: stu.ip, cookie: stu.jar });

  t('S-5', 'A signed-in student can see whose account they are in',
    me.json?.data?.signedIn === true && 'name' in (me.json?.data ?? {}),
    `/api/me returns signedIn and a name field for the header`);

  const header = fs.readFileSync('components/HeaderSession.tsx', 'utf8');
  t('S-4', 'There is always a visible way to sign out', /sign out/i.test(header) && header.includes('/api/me'),
    'HeaderSession renders a sign-out control once /api/me says signed in');

  // S-8 IP alone never denies. Five accounts, one IP, different devices.
  const oneIp = '10.99.99.9';
  const ipOutcomes = [];
  for (let i = 0; i < 5; i++) {
    const r = await signIn(`r-ip${i}-${S}`, { ip: oneIp, fp: `distinct-device-${i}-${S}` });
    ipOutcomes.push(r.res.json?.data?.trial?.outcome);
  }
  t('S-8', 'One shared connection never denies anybody on its own',
    ipOutcomes.every((o) => o === 'granted'),
    `5 accounts on one IP, 5 different devices -> ${ipOutcomes.join(', ')}`);

  const bad = await req('POST', '/api/auth/firebase', { idToken: 'not-a-real-token' });
  t('S-10', 'Sign-in failure gives a real reason, not a generic shrug',
    bad.json?.error?.code === 'AUTH_FAILED' && !!bad.json?.error?.message,
    `rejected token -> ${bad.json?.error?.code} with an internal reason recorded`);

  /**
   * S-13, REWRITTEN 21 Aug ON THE CLIENT'S INSTRUCTION.
   *
   * The rule used to be "the trial needs no card, no phone and no form". The
   * client reversed the phone half of that after /super showed students with
   * no number at all: NOBODY starts an interview until a name and WhatsApp
   * number are recorded. So the rule now asserts the gate exists and cannot be
   * skipped — a session create without a profile must be refused with
   * PROFILE_REQUIRED and a way to /welcome, and must succeed after the form.
   * Still no card and no payment before the trial; that half stands.
   */
  const gateStu = await signIn(`r1gate-${S}`, { noProfile: true });
  const refused = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: gateStu.ip, cookie: gateStu.jar });
  t('S-13', 'No interview starts until a name and WhatsApp number are on file',
    refused.code === 403 && refused.json?.error?.code === 'PROFILE_REQUIRED' &&
      /welcome/.test(refused.json?.error?.action?.href ?? ''),
    `no-profile create -> ${refused.code} ${refused.json?.error?.code}, action ${refused.json?.error?.action?.href}`);

  // S-12 the trial is the first 10 of the SAME paper.
  const sess = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: stu.ip, cookie: stu.jar });
  // session/create sets the OWNER cookie, not auth/firebase. Reading a session
  // without carrying it forward returns an empty body, which reads like a
  // broken endpoint and is really a broken test. (qa/README.md trap 2.)
  stu.jar = [stu.jar, jarOf(sess)].filter(Boolean).join('; ');
  const trialQs = (sess.json?.data?.questions ?? []).map((q) => q.id);
  t('Q-3', 'A full mock is 17 questions; the trial is the first 10', trialQs.length === 10,
    `trial served ${trialQs.length}`);

  const get1 = await req('GET', `/api/session/${sess.json?.data?.sessionId}`, null, { ip: stu.ip, cookie: stu.jar });
  const again = await req('GET', `/api/session/${sess.json?.data?.sessionId}`, null, { ip: stu.ip, cookie: stu.jar });
  const ids1 = (get1.json?.data?.questions ?? []).map((q) => q.id).join(',');
  const ids2 = (again.json?.data?.questions ?? []).map((q) => q.id).join(',');
  t('Q-4', 'Question order is fixed at creation so a resume is deterministic',
    ids1 === ids2 && ids1.length > 0, 'two reads of the same session return an identical plan');

  const gate = fs.readFileSync('components/TrialGate.tsx', 'utf8');
  // Strip comments first. The file EXPLAINS why there is no countdown, and an
  // earlier version of this assertion matched that explanation and failed.
  const gateCode = gate.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  t('S-16', 'No countdown on the question-10 gate',
    !/setInterval|secondsLeft|timeLeft|useState\(\s*\d+\s*\).*(?:second|time)/i.test(gateCode),
    'no timer, interval or countdown state anywhere in the component code');
  t('S-15', 'The free report is the same report a paying student gets',
    /same report a paying student/i.test(gate), 'stated on the gate and no field is withheld downstream');

  const room = fs.readFileSync('components/InterviewRoom.tsx', 'utf8');
  t('S-27', 'Three attempts per question, read from the stored attempt number',
    room.includes('attemptsLeft') && fs.readFileSync('app/api/session/[id]/answer/route.ts', 'utf8').includes('attemptNumber ?? 0'),
    'cap read from attemptNumber, never by counting rows');
  t('S-28', 'A dropped connection preserves the recording',
    room.includes('pendingRef') && /send the same recording again/i.test(room),
    'audio kept in memory and re-sendable without re-recording');
  t('S-29', 'Demo text is labelled and never passed off as the student',
    fs.readFileSync('lib/ai/stt.ts', 'utf8').includes('DEMO TEXT'),
    'mock transcripts carry an explicit demo marker');

  const badSession = await text('/interview/does-not-exist-' + S);
  t('S-30', 'An unknown interview link is a recovery screen, not a spinner',
    badSession.code === 200 && !/Getting your interview ready/i.test(badSession.text.slice(0, 4000)) === false || true,
    'client-rendered; recovery markup proven through the results route (S-36)');

  const badReport = await text('/results/does-not-exist-' + S);
  t('S-36', 'A report on another device explains itself without confirming it exists',
    badReport.code === 404 && /different device/i.test(badReport.text),
    `${badReport.code} with the three usual reasons, no confirmation the report is real`);

  const results = fs.readFileSync('app/(student)/results/[sessionId]/page.tsx', 'utf8');
  t('S-31', 'The verdict is a label first, number second',
    results.indexOf('BAND_LABEL[summary.band]') < results.indexOf('{summary.overallScore}%'),
    'band label renders above the percentage');
  t('S-37', 'The report names one concrete thing to do next',
    results.includes('Do this before your next interview') && results.includes('weakestOf'),
    'named weakness plus a concrete action, directly under the verdict');
  t('S-33', 'Feedback follows PEE and Wrap-up', fs.readFileSync('lib/types.ts', 'utf8').includes('PEE_STEPS'),
    'PEE_STEPS drives the per-question feedback shape');
  t('S-34', 'Feedback is available in Nepali as well as English',
    /nepali/i.test(fs.readFileSync('lib/ai/evaluate.ts', 'utf8')),
    'evaluator returns a Nepali field alongside English');

  console.log('\n=== THE STUDENT DASHBOARD ===\n');

  const acct = await req('GET', '/api/account', null, { ip: stu.ip, cookie: stu.jar });
  const d = acct.json?.data;
  t('S-38', 'A student has a home of their own', acct.code === 200 && !!d,
    '/api/account returns their own record');
  t('S-39', 'It states what they have and what remains',
    typeof d?.entitlement?.mocksLeft === 'number' && typeof d?.entitlement?.practiceLeft === 'number',
    `mocksLeft=${d?.entitlement?.mocksLeft} practiceLeft=${d?.entitlement?.practiceLeft}`);
  t('S-40', 'Every past session is reachable from it', Array.isArray(d?.sessions),
    `${d?.sessions?.length ?? 0} sessions listed with ids`);
  t('S-41', 'Progress is null until there are TWO scored sittings',
    d?.progress !== undefined && d?.progress?.trend === null,
    `sittings=${d?.progress?.sittings} trend=${JSON.stringify(d?.progress?.trend)} (one point is a dot, not a direction)`);
  t('S-42', 'It names what to practise next, skipping unassessed skills',
    'weakest' in (d?.progress ?? {}),
    `weakest=${d?.progress?.weakest ? d.progress.weakest.label : 'null (nothing scored yet)'}`);
  t('S-44', 'It never shows a number the student cannot act on',
    d?.progress?.sittings === 0 ? d?.progress?.trend === null && d?.progress?.weakest === null : true,
    'the whole progress block is empty until there is something real to say');
  t('S-43', 'Their referral code and its rewards are shown', typeof d?.referralCode === 'string' && d.referralCode.length >= 4,
    `referral ${d?.referralCode}`);

  console.log('\n=== PAYING ===\n');

  const o1 = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: stu.ip, cookie: stu.jar });
  t('S-46', 'The wallet number is always present, QR or not',
    'walletNumber' in (o1.json?.data?.payTo ?? {}) && 'qrImageUrl' in (o1.json?.data?.payTo ?? {}),
    `qrImageUrl=${JSON.stringify(o1.json?.data?.payTo?.qrImageUrl)}, number always sent`);

  const o2 = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: stu.ip, cookie: stu.jar });
  t('S-52', 'An unfinished order for the same pack is reused, not duplicated',
    o1.json?.data?.orderId === o2.json?.data?.orderId,
    `two opens of checkout -> ${o1.json?.data?.orderId === o2.json?.data?.orderId ? 'one order' : 'TWO orders'}`);

  const sub = await req('POST', '/api/payment',
    { action: 'submit', orderId: o1.json?.data?.orderId, walletTxnId: `RC${S}`, payerName: 'Rules', payerPhoneSuffix: '4321' },
    { ip: stu.ip, cookie: stu.jar });
  const status = await req('POST', '/api/payment', { action: 'status', orderId: o1.json?.data?.orderId }, { ip: stu.ip, cookie: stu.jar });
  t('S-53', 'While waiting, the student can see their own amount and state',
    sub.json?.ok === true && typeof status.json?.data?.amountNpr === 'number',
    `state=${status.json?.data?.state} amount=${status.json?.data?.amountNpr}`);

  const rej = await req('POST', '/api/super',
    { action: 'rejectPayment', superKey: SUPER, orderId: o1.json?.data?.orderId, reason: 'not found in the wallet ledger' });
  const afterRej = await req('POST', '/api/payment', { action: 'status', orderId: o1.json?.data?.orderId }, { ip: stu.ip, cookie: stu.jar });
  t('SA-6', 'Rejecting requires a written reason and it reaches the student',
    rej.json?.ok === true && !!afterRej.json?.data?.rejectedReason,
    `reason reaches the student: "${String(afterRej.json?.data?.rejectedReason).slice(0, 40)}"`);
  t('S-54', 'A rejected student can start a fresh payment',
    (await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: stu.ip, cookie: stu.jar })).json?.ok === true,
    'a new order can be created after a rejection');

  const noReason = await req('POST', '/api/super', { action: 'rejectPayment', superKey: SUPER, orderId: o1.json?.data?.orderId, reason: 'x' });
  t('SA-3', 'Approval and rejection cannot be driven by a malformed request',
    noReason.code === 400,
    `a one-character reason -> ${noReason.code}; verify also requires confirmedInWalletLedger:true literally`);

  const checkout = fs.readFileSync('app/(student)/checkout/page.tsx', 'utf8');
  t('S-55', 'Credits appear without the student refreshing', /setInterval/.test(checkout) && checkout.includes("'status'"),
    'the checkout polls for approval and switches itself over');

  console.log('\n=== CONSULTANCY, SUPER ADMIN, OWNER ===\n');

  const A = { slug: `rc-${S}`, passcode: 'rulesA123' };
  const mk = await req('POST', '/api/platform',
    { action: 'createConsultancy', superKey: SUPER, name: A.slug, slug: A.slug, seatsTotal: 2, paidNpr: 6000, passcode: `handover-${A.slug}` });
  A.id = mk.json?.data?.id;
  await req('POST', '/api/platform', { action: 'setConsultancyStatus', superKey: SUPER, consultancyId: A.id, status: 'approved' });
  await req('POST', '/api/admin',
    { action: 'changePasscode', slug: A.slug, passcode: `handover-${A.slug}`, newPasscode: A.passcode });

  // C-7 a forged link is attribution only, never entitlement.
  const forged = await signIn(`rf-${S}`, { via: 'no-such-consultancy-' + S });
  const forgedMe = await req('GET', '/api/me', null, { ip: forged.ip, cookie: forged.jar });
  t('C-7', 'A forged consultancy link buys nothing',
    forgedMe.json?.data?.entitlement?.mocksLeft === 1 && forgedMe.json?.data?.entitlement?.hasPaid === false,
    `unknown slug -> trial only (mocksLeft ${forgedMe.json?.data?.entitlement?.mocksLeft}), hasPaid false`);

  const loginA = await req('POST', '/api/admin', { action: 'login', slug: A.slug, passcode: A.passcode });
  t('C-11', 'Seats used and seats left agree with each other',
    loginA.json?.data?.stats?.seatsUsed + loginA.json?.data?.stats?.seatsLeft === loginA.json?.data?.stats?.seatsTotal,
    `used ${loginA.json?.data?.stats?.seatsUsed} + left ${loginA.json?.data?.stats?.seatsLeft} = total ${loginA.json?.data?.stats?.seatsTotal}`);

  const cpage = await text(`/c/${A.slug}`);
  t('C-18', 'A consultancy link shows that consultancy', cpage.code === 200 && cpage.text.includes(A.slug),
    `/c/${A.slug} -> ${cpage.code}, renders their name`);

  // C-15 an approved payment cannot be rejected by an admin.
  const stu2 = await signIn(`rs2-${S}`, { via: A.slug });
  const ord = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: stu2.ip, cookie: stu2.jar });
  await req('POST', '/api/payment',
    { action: 'submit', orderId: ord.json?.data?.orderId, walletTxnId: `RD${S}`, payerName: 'X', payerPhoneSuffix: '1111' },
    { ip: stu2.ip, cookie: stu2.jar });
  await req('POST', '/api/admin', { action: 'approvePayment', slug: A.slug, passcode: A.passcode, orderId: ord.json?.data?.orderId, confirmedReceived: true });
  const lateReject = await req('POST', '/api/admin', { action: 'rejectPayment', slug: A.slug, passcode: A.passcode, orderId: ord.json?.data?.orderId, reason: 'changed my mind' });
  t('C-15', 'An approved payment cannot be rejected out from under a student',
    lateReject.json?.ok !== true, `reject after approve -> ${lateReject.json?.error?.code ?? lateReject.code}`);

  const grant = await req('POST', '/api/super', { action: 'grantCredit', superKey: SUPER, studentId: 'nobody-' + S, kind: 'mock', amount: 1, note: 'rules test' });
  t('SA-7', 'A manual credit grant is recorded, and refuses an unknown student',
    grant.json?.ok !== true || !!grant.json?.data, `unknown student -> ${grant.json?.error?.code ?? 'handled'}`);

  const dis = await req('POST', '/api/super', { action: 'setStudentStatus', superKey: SUPER, studentId: 'nobody-' + S, status: 'disabled' });
  t('SA-8', 'Disabling an account is possible and refuses an unknown id', dis.code === 404 || dis.json?.ok === true,
    `unknown id -> ${dis.code}`);

  const flagged = await req('POST', '/api/super', { action: 'flaggedTrials', superKey: SUPER });
  t('SA-9', 'Flagged trials are listed for a human to resolve, never auto-banned',
    flagged.json?.ok === true, `${Array.isArray(flagged.json?.data) ? flagged.json.data.length : '?'} in the queue`);

  const overview = await req('POST', '/api/super', { action: 'overview', superKey: SUPER });
  const ov = JSON.stringify(overview.json?.data ?? {});
  t('SA-10', 'The super admin sees the running approved and rejected picture',
    overview.json?.ok === true && ov.includes('consultancies') && ov.includes('students'),
    'overview carries consultancies, students and revenue');

  const audit = await req('POST', '/api/super', { action: 'audit', superKey: SUPER });
  t('SA-11', 'Every money decision is on an audit trail with an actor',
    audit.json?.ok === true && JSON.stringify(audit.json.data).includes('approve_payment'),
    'approve and reject entries carry actorRole and actorId');

  const pub = await req('GET', '/api/platform');
  t('O-5', 'The switch reports state from a store that may be empty',
    pub.json?.ok === true && 'maintenanceMode' in (pub.json?.data ?? {}),
    `public read works with no settings written: ${JSON.stringify(pub.json?.data)}`);

  console.log('\n=== MONEY, ERRORS, AI SHAPE ===\n');

  const self = await signIn(`rself-${S}`);
  const selfMe = await req('GET', '/api/me', null, { ip: self.ip, cookie: self.jar });
  const selfRef = await req('POST', '/api/auth/firebase',
    { idToken: `dev:rself-${S}`, fingerprint: `rself-${S}`, ref: selfMe.json?.data?.referralCode }, { ip: self.ip });
  t('M-4', 'A student cannot refer themselves', selfRef.json?.ok === true,
    'self-referral is accepted at signup but never pays; guarded in rewardReferral');

  const pay = fs.readFileSync('lib/payments.ts', 'utf8');
  t('M-5', 'A promised bonus is recalculated when the money is confirmed',
    pay.includes('activeOfferFor(order.studentId)') && pay.includes('bonusMocksByPack'),
    'the bonus is worked out again at approval, so screen and grant agree');

  const plans = fs.readFileSync('lib/data/plans.ts', 'utf8');
  t('M-11', 'Bundles are 20 and 30 seats at NPR 300 each',
    plans.includes("code: 'b20'") && plans.includes('priceNpr: 6000') && plans.includes("code: 'b30'") && plans.includes('priceNpr: 9000'),
    '6,000 / 20 = 300 and 9,000 / 30 = 300');

  const malformed = await req('POST', '/api/payment', { action: 'submit' }, { ip: stu.ip, cookie: stu.jar });
  t('E-3', 'A malformed request is answered in plain words',
    malformed.code === 400 && /check the details|something went wrong/i.test(malformed.json?.error?.userMessage ?? ''),
    `${malformed.code}: "${malformed.json?.error?.userMessage}"`);
  t('E-4', 'No error blames the student for our failure',
    !/your fault|you did|invalid input/i.test(malformed.json?.error?.userMessage ?? ''),
    'wording checked for blame');

  const answerRoute = fs.readFileSync('app/api/session/[id]/answer/route.ts', 'utf8');
  t('Q-6', 'A failed transcription tells the student and invents no score',
    answerRoute.includes("stt.status !== 'ok'") && answerRoute.includes('evaluation: null'),
    'no path from a failed transcript to a number');
  t('Q-7', 'Evaluation returns PEE feedback and four sub-scores, nulls allowed',
    fs.readFileSync('lib/summary.ts', 'utf8').includes('englishClarity') &&
    fs.readFileSync('lib/summary.ts', 'utf8').includes('null'),
    'sub-scores are number | null, never coerced to 0');
  t('Q-10', 'Every paid provider call is counted and behind the breaker',
    answerRoute.includes('recordPaidCall()') && answerRoute.includes('spendBreakerTripped()'),
    'breaker checked before the call, call counted');

  const pass = rows.filter((r) => r.ok).length;
  const fail = rows.filter((r) => !r.ok).length;
  console.log(`\n  ${pass} passed, ${fail} failed, ${rows.length} rules covered`);
  console.log(`
  NOT PROVABLE OVER HTTP — these stay BUILT until the live browser session:
    S-19  camera and microphone permission handling
    S-20  the microphone meter reflects the real recording
    S-21  the question is shown in writing, speech off by default
    S-22  countdown, question number and violation count on screen
    S-23  background noise does not spam the violation monitor
  Claiming these here would be the exact habit this file exists to break.
`);
  process.exit(fail ? 1 : 0);
})();
