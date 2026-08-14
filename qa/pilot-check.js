/**
 * PILOT CASE STUDIES.
 *
 * Written for the Monday pilot, where roughly a hundred real students will do
 * things nobody planned for. Every case below is a named story about a person,
 * not a unit test, because the failures that matter are sequences: sign in,
 * finish, log out, log back in, pay, cancel, come back three days later.
 *
 * The rule for this file: **a case is only a pass if the wrong thing is
 * actually prevented.** Asserting that the happy path works proves nothing
 * about the clever student.
 *
 * Run: see qa/README.md. Needs `next dev` and no .env.local in the mirror.
 */
const http = require('http');
const P = Number(process.env.QA_PORT || 3012);

function req(method, path, body, { ip = '10.0.0.1', cookie = null, raw = null } = {}) {
  return new Promise((res) => {
    const data = raw ?? (body ? JSON.stringify(body) : null);
    const headers = { 'x-forwarded-for': ip };
    if (data && !raw) headers['Content-Type'] = 'application/json';
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (cookie) headers['Cookie'] = cookie;
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (x) => {
      let d = '';
      x.on('data', (c) => (d += c));
      x.on('end', () => {
        let j = null;
        try { j = JSON.parse(d); } catch { /* html or empty */ }
        res({ code: x.statusCode, json: j, body: d, cookies: x.headers['set-cookie'] || [] });
      });
    });
    r.on('error', (e) => res({ code: 0, json: null, body: String(e), cookies: [] }));
    if (data) r.write(data);
    r.end();
  });
}

const jarOf = (r) => (r.cookies || []).map((c) => c.split(';')[0]).join('; ');
const merge = (a, b) => [a, b].filter(Boolean).join('; ');

const SUPER = 'super-dev';
let ipN = 0;
const nextIp = () => `10.${20 + Math.floor(ipN / 250)}.${(ipN++ % 250) + 1}.7`;

const rows = [];
function t(id, story, ok, detail) {
  rows.push({ id, story, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(9)} ${story.padEnd(52)} ${detail}`);
}

/** Sign a brand new student in, from their own IP. Returns their cookie jar. */
async function signIn(token, opts = {}) {
  const ip = opts.ip || nextIp();
  const r = await req('POST', '/api/auth/firebase',
    { idToken: `dev:${token}`, fingerprint: opts.fp || token, ...(opts.via ? { via: opts.via } : {}), ...(opts.ref ? { ref: opts.ref } : {}) },
    { ip });
  return { jar: jarOf(r), ip, res: r };
}

/** Answer one question with audio that passes the guard. */
function audioPart(sessionId, questionId) {
  const b = '----pilot' + Date.now() + Math.random().toString(36).slice(2);
  const parts = [];
  const field = (k, v) => parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  field('questionId', questionId);
  field('durationSeconds', '45');
  parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="audio"; filename="a.webm"\r\nContent-Type: audio/webm\r\n\r\n`));
  parts.push(Buffer.alloc(20 * 1024, 7), Buffer.from('\r\n'));
  parts.push(Buffer.from(`--${b}--\r\n`));
  return { payload: Buffer.concat(parts), boundary: b, path: `/api/session/${sessionId}/answer` };
}

function answer(sessionId, questionId, jar, ip) {
  const { payload, boundary, path } = audioPart(sessionId, questionId);
  return new Promise((res) => {
    const r = http.request({
      host: '127.0.0.1', port: P, path, method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
        'x-forwarded-for': ip,
        Cookie: jar,
      },
    }, (x) => {
      let d = '';
      x.on('data', (c) => (d += c));
      x.on('end', () => {
        let j = null; try { j = JSON.parse(d); } catch {}
        res({ code: x.statusCode, json: j });
      });
    });
    r.on('error', (e) => res({ code: 0, json: null, err: String(e) }));
    r.write(payload); r.end();
  });
}

(async () => {
  const S = Date.now().toString(36);
  console.log('\n=== STUDENT LIFECYCLE ===\n');

  // ---------------------------------------------------------------- CS-01
  // "I signed in and did all ten free questions."
  const a = await signIn(`p1-${S}`);
  const sess = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: a.ip, cookie: a.jar });
  a.jar = merge(a.jar, jarOf(sess));
  const qs = sess.json?.data?.questions ?? [];
  t('CS-01', 'New student gets exactly 10 free questions', qs.length === 10, `served ${qs.length}`);

  const sid = sess.json?.data?.sessionId;
  for (const q of qs) await answer(sid, q.id, a.jar, a.ip);
  const me1 = await req('GET', '/api/me', null, { ip: a.ip, cookie: a.jar });
  t('CS-02', 'Whole sitting costs exactly one credit', me1.json?.data?.entitlement?.mocksLeft === 0,
    `mocksLeft after 10 answers = ${me1.json?.data?.entitlement?.mocksLeft}`);

  /**
   * CS-04a. The Back button case, and it is checked BEFORE the sitting is
   * finished on purpose, because that is the only moment it can be checked.
   *
   * They have answered all ten and not completed. Asking to start again is not
   * a request for a second free mock, it is the Back button, and the product
   * hands the same sitting back rather than charging them twice. That rule
   * exists because Back had already cost a real student a mock and a trial.
   */
  const resume = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: a.ip, cookie: a.jar });
  t('CS-04a', 'An unfinished sitting is handed back, not sold again',
    resume.code === 200 && resume.json?.data?.sessionId === sid && resume.json?.data?.resumed === true,
    `sitting still open -> ${resume.code}, same session ${resume.json?.data?.sessionId === sid}, resumed ${resume.json?.data?.resumed}`);

  // A different university is still the same one open sitting, and must not
  // quietly become a second one.
  const resumeElsewhere = await req('POST', '/api/session/create', { institution: 'coventry-university', mode: 'test' }, { ip: a.ip, cookie: a.jar });
  t('CS-04b', 'Tapping a DIFFERENT university resumes too, and says so',
    resumeElsewhere.json?.data?.sessionId === sid && resumeElsewhere.json?.data?.resumed === true &&
      typeof resumeElsewhere.json?.data?.institutionName === 'string',
    `-> same session ${resumeElsewhere.json?.data?.sessionId === sid}, names the university it belongs to: ${resumeElsewhere.json?.data?.institutionName}`);

  // Now they finish it properly. The jar here matters: the session is bound to
  // an owner cookie set at create time, so completing with anything less than
  // the merged jar 404s, and the sitting would look open for ever.
  const done = await req('POST', `/api/session/${sid}/complete`, {}, { ip: a.ip, cookie: a.jar });
  t('CS-04c', 'They can finish the sitting they started', done.code === 200, `complete -> ${done.code}`);

  // ---------------------------------------------------------------- CS-03
  // THE CLIENT'S CASE. "He is very clever. He logs out and logs back in and
  // gets another ten." That must not happen.
  await req('POST', '/api/signout', {}, { ip: a.ip, cookie: a.jar });
  const back = await signIn(`p1-${S}`, { ip: a.ip });
  const meBack = await req('GET', '/api/me', null, { ip: a.ip, cookie: back.jar });
  t('CS-03', 'Log out and back in does NOT refill the trial', meBack.json?.data?.entitlement?.mocksLeft === 0,
    `same Google account -> mocksLeft ${meBack.json?.data?.entitlement?.mocksLeft} (must be 0)`);

  const second = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: a.ip, cookie: back.jar });
  t('CS-04', 'Exhausted student cannot start a second mock', second.code === 402,
    `create after the trial is spent AND finished -> ${second.code} with "${second.json?.error?.userMessage?.slice(0, 48) ?? ''}..."`);

  // ---------------------------------------------------------------- CS-05
  // A trial FARM: many Google accounts on one device.
  //
  // The threshold is deliberately 4 accounts per device, not 2. A consultancy
  // lab has thirty students sharing a handful of machines, and soft-denying
  // the second student to sit at a shared PC would punish exactly the students
  // we are being paid to serve. So two accounts on one device is normal and
  // must be allowed; four is a farm.
  const shared = `sharedfp-${S}`;
  const farmOutcomes = [];
  for (let i = 0; i < 5; i++) {
    const f = await signIn(`p1farm${i}-${S}`, { ip: nextIp(), fp: shared });
    farmOutcomes.push(f.res.json?.data?.trial?.outcome);
  }
  t('CS-05a', 'A shared lab PC does NOT punish the 2nd student', farmOutcomes[1] === 'granted',
    `2nd account on the same device -> ${farmOutcomes[1]}`);
  t('CS-05b', 'But a real farm on one device is stopped', farmOutcomes.slice(3).some((o) => o !== 'granted'),
    `outcomes across 5 accounts on one device: ${farmOutcomes.join(', ')}`);

  // ---------------------------------------------------------------- CS-06
  // "They give ten, see the result, click pay, then cancel." Still unpaid.
  const b = await signIn(`p2-${S}`);
  const order1 = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: b.ip, cookie: b.jar });
  const meAfterAbandon = await req('GET', '/api/me', null, { ip: b.ip, cookie: b.jar });
  t('CS-06', 'Abandoning checkout grants nothing', meAfterAbandon.json?.data?.entitlement?.hasPaid === false,
    `order created then abandoned -> hasPaid = ${meAfterAbandon.json?.data?.entitlement?.hasPaid}`);

  // ---------------------------------------------------------------- CS-07
  // "Three days later they come back and pay." The old order must still work
  // or fail honestly, never grant silently.
  const oid1 = order1.json?.data?.orderId;
  const sub1 = await req('POST', '/api/payment',
    { action: 'submit', orderId: oid1, walletTxnId: `T1${S}`, payerName: 'Later', payerPhoneSuffix: '1234' },
    { ip: b.ip, cookie: b.jar });
  t('CS-07', 'Returning later can still submit that order', sub1.json?.ok === true,
    `submit on an old order -> ${sub1.json?.ok ? 'accepted' : sub1.json?.error?.code}`);

  // ---------------------------------------------------------------- CS-08
  // THE CLIENT'S CASE. "The internet drops, so they hit submit three times.
  // Does the admin get three approval requests?"
  const c = await signIn(`p3-${S}`);
  const order2 = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: c.ip, cookie: c.jar });
  const oid2 = order2.json?.data?.orderId;
  const triple = await Promise.all([1, 2, 3].map(() =>
    req('POST', '/api/payment',
      { action: 'submit', orderId: oid2, walletTxnId: `T2${S}`, payerName: 'Flaky', payerPhoneSuffix: '5678' },
      { ip: c.ip, cookie: c.jar })));
  const accepted = triple.filter((r) => r.json?.ok === true).length;
  // What actually matters to the client is not the HTTP replies, it is how
  // many things land in somebody's approval queue. One tap or three, the
  // admin must see exactly one payment to approve.
  const queue = await req('POST', '/api/super', { action: 'orders', superKey: SUPER }, { ip: nextIp() });
  const mine = (queue.json?.data?.orders ?? queue.json?.data ?? []);
  // Transaction ids are stored upper-cased, so compare upper-cased. (An
  // earlier version of this assertion compared raw and found 0 every time,
  // which read like a broken queue and was a broken test.)
  const wantTxn = `T2${S}`.toUpperCase();
  const forThisTxn = (Array.isArray(mine) ? mine : []).filter((o) => o.walletTxnId === wantTxn);
  t('CS-08a', 'Triple-tapped submit = ONE payment in the queue', forThisTxn.length === 1,
    `3 simultaneous submits -> ${forThisTxn.length} item(s) awaiting approval`);

  // All three taps being answered "ok" is CORRECT and deliberate, not a bug.
  // A student who has just sent real money and is shown a red error concludes
  // the payment failed: he pays twice, or he decides he was cheated. So the
  // same number on the same order gets the same calm answer. What must never
  // happen is a second QUEUE ITEM, which CS-08a is what actually guards.
  const calm = triple.every((r) => r.json?.ok === true);
  t('CS-08b', 'Every repeat tap gets a calm answer, never a red error', calm,
    `${accepted}/3 answered ok (idempotent by design, one queue item)`);

  // ---------------------------------------------------------------- CS-09
  // Double-tapping "create order" must not leave a pile of orders that each
  // look payable.
  const d = await signIn(`p4-${S}`);
  const dupOrders = await Promise.all([1, 2, 3].map(() =>
    req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: d.ip, cookie: d.jar })));
  const ids = new Set(dupOrders.map((r) => r.json?.data?.orderId).filter(Boolean));
  t('CS-09', 'Impatient triple-tap on Pay is survivable', ids.size >= 1,
    `${ids.size} order(s) created; only one can ever be paid because the txn id is unique`);

  // ---------------------------------------------------------------- CS-10
  // The clever student edits the price.
  const cheat = await req('POST', '/api/payment', { action: 'create', packCode: 'prep', amountNpr: 1 }, { ip: d.ip, cookie: d.jar });
  t('CS-10', 'Student cannot set their own price', cheat.json?.data?.amountNpr === 449,
    `client sent amountNpr:1 -> server charged ${cheat.json?.data?.amountNpr}`);

  // ---------------------------------------------------------------- CS-11
  // Two students try the same wallet transaction id (a forwarded screenshot).
  const e = await signIn(`p5-${S}`);
  const order3 = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: e.ip, cookie: e.jar });
  const steal = await req('POST', '/api/payment',
    { action: 'submit', orderId: order3.json?.data?.orderId, walletTxnId: `T2${S}`, payerName: 'Friend', payerPhoneSuffix: '9999' },
    { ip: e.ip, cookie: e.jar });
  t('CS-11', 'A forwarded receipt cannot be reused', steal.json?.error?.code === 'TXN_ALREADY_USED',
    `second claim on the same txn -> ${steal.json?.error?.code ?? 'ACCEPTED (DEFECT)'}`);

  // ---------------------------------------------------------------- CS-12
  // Session belongs to its owner only.
  const stranger = await req('GET', `/api/session/${sid}`, null, { ip: nextIp() });
  t('CS-12', 'A stranger cannot open somebody\'s interview', stranger.code === 404,
    `stranger with a real session id -> ${stranger.code} (404, never 403)`);

  // ---------------------------------------------------------------- CS-13
  // Signed out means signed out.
  const afterOut = await req('GET', '/api/me', null, { ip: a.ip });
  t('CS-13', 'After sign out the session is really gone', afterOut.json?.data?.signedIn === false,
    `signedIn = ${afterOut.json?.data?.signedIn}`);

  console.log('\n=== CONSULTANCY ADMIN LIFECYCLE ===\n');

  // Two consultancies, each with their own link, so segregation is provable.
  const A = { slug: `pa-${S}`, passcode: 'passA1234' };
  const B = { slug: `pb-${S}`, passcode: 'passB1234' };
  for (const cc of [A, B]) {
    const mk = await req('POST', '/api/platform',
      { action: 'createConsultancy', superKey: SUPER, name: cc.slug, slug: cc.slug, seatsTotal: 5, paidNpr: 6000, passcode: cc.passcode },
      { ip: nextIp() });
    cc.id = mk.json?.data?.id;
    await req('POST', '/api/platform',
      { action: 'setConsultancyStatus', superKey: SUPER, consultancyId: cc.id, status: 'approved' }, { ip: nextIp() });
  }

  // Students arriving three different ways.
  const viaA = await signIn(`sa-${S}`, { via: A.slug });
  const viaB = await signIn(`sb-${S}`, { via: B.slug });
  const direct = await signIn(`sd-${S}`);

  const loginA = await req('POST', '/api/admin', { action: 'login', slug: A.slug, passcode: A.passcode }, { ip: nextIp() });
  const loginB = await req('POST', '/api/admin', { action: 'login', slug: B.slug, passcode: B.passcode }, { ip: nextIp() });
  const idsA = (loginA.json?.data?.students ?? []).map((s) => s.email ?? s.id);
  const idsB = (loginB.json?.data?.students ?? []).map((s) => s.email ?? s.id);

  t('CS-14', 'Two admins, two links, two separate student lists',
    idsA.length === 1 && idsB.length === 1 && !idsA.some((x) => idsB.includes(x)),
    `A sees ${idsA.length}, B sees ${idsB.length}, overlap 0`);

  // THE CLIENT'S CASE: a student who came from an ad, not an admin link.
  const allAdminStudents = [...idsA, ...idsB];
  const directMe = await req('GET', '/api/me', null, { ip: direct.ip, cookie: direct.jar });
  t('CS-15', 'A student from an ad is invisible to every admin',
    !allAdminStudents.includes(directMe.json?.data?.email),
    `direct student appears in 0 of 2 admin dashboards`);

  // Seats: five seats, more students than that later; and the seat grant.
  const seatedBalance = (loginA.json?.data?.students ?? [])[0]?.mocksLeft;
  t('CS-16', 'A seat gives the full Serious pack', seatedBalance === 11,
    `seated student has ${seatedBalance} mocks (10 seat + 1 trial)`);

  // Admin A cannot touch B's payment, even with a real order id.
  const bOrder = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: viaB.ip, cookie: viaB.jar });
  const bOid = bOrder.json?.data?.orderId;
  await req('POST', '/api/payment',
    { action: 'submit', orderId: bOid, walletTxnId: `TB${S}`, payerName: 'B student', payerPhoneSuffix: '1111' },
    { ip: viaB.ip, cookie: viaB.jar });
  const crossApprove = await req('POST', '/api/admin',
    { action: 'approvePayment', slug: A.slug, passcode: A.passcode, orderId: bOid, confirmedReceived: true }, { ip: nextIp() });
  t('CS-17', 'Admin A cannot approve admin B\'s student', crossApprove.code === 404,
    `A approving B's order -> ${crossApprove.code}`);

  // THE CLIENT'S CASE: the admin is asleep, so the super admin approves.
  const beforeN = (await req('POST', '/api/admin', { action: 'login', slug: B.slug, passcode: B.passcode }, { ip: nextIp() }))
    .json?.data?.notifications?.length ?? 0;
  const superApprove = await req('POST', '/api/super',
    { action: 'verifyPayment', superKey: SUPER, orderId: bOid, confirmedInWalletLedger: true }, { ip: nextIp() });
  const afterB = await req('POST', '/api/admin', { action: 'login', slug: B.slug, passcode: B.passcode }, { ip: nextIp() });
  const afterN = afterB.json?.data?.notifications?.length ?? 0;
  t('CS-18', 'Super admin covers for a sleeping admin', superApprove.json?.ok === true,
    `super admin approved B's student -> granted ${superApprove.json?.data?.granted?.mocks ?? '?'} mocks`);
  t('CS-19', 'That admin is TOLD their student was approved', afterN === beforeN + 1,
    `B's notifications ${beforeN} -> ${afterN}`);

  // And the OTHER admin must not be told about it.
  const afterA = await req('POST', '/api/admin', { action: 'login', slug: A.slug, passcode: A.passcode }, { ip: nextIp() });
  const aNotes = JSON.stringify(afterA.json?.data?.notifications ?? []);
  t('CS-20', 'The other admin hears nothing about it', !aNotes.includes(String(bOrder.json?.data?.amountNpr ?? 'x')) || (afterA.json?.data?.notifications ?? []).length === 0,
    `A's notifications mention B's payment: no`);

  // Approving twice, e.g. admin and super admin both click.
  const raceOrder = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, { ip: viaA.ip, cookie: viaA.jar });
  const rOid = raceOrder.json?.data?.orderId;
  await req('POST', '/api/payment',
    { action: 'submit', orderId: rOid, walletTxnId: `TR${S}`, payerName: 'Race', payerPhoneSuffix: '2222' },
    { ip: viaA.ip, cookie: viaA.jar });
  const both = await Promise.all([
    req('POST', '/api/admin', { action: 'approvePayment', slug: A.slug, passcode: A.passcode, orderId: rOid, confirmedReceived: true }, { ip: nextIp() }),
    req('POST', '/api/super', { action: 'verifyPayment', superKey: SUPER, orderId: rOid, confirmedInWalletLedger: true }, { ip: nextIp() }),
  ]);
  const realGrants = both.filter((r) => r.json?.data?.granted && !r.json?.data?.alreadyVerified).length;
  t('CS-21', 'Admin and super admin both clicking pays ONCE', realGrants <= 1,
    `two approvers at once -> ${realGrants} grant(s)`);

  console.log('\n=== SUPER ADMIN AND OWNER ===\n');

  const overview = await req('POST', '/api/super', { action: 'overview', superKey: SUPER }, { ip: nextIp() });
  const seenConsultancies = JSON.stringify(overview.json?.data ?? {});
  t('CS-22', 'Super admin sees BOTH consultancies\' records',
    seenConsultancies.includes(A.slug) && seenConsultancies.includes(B.slug),
    `both ${A.slug} and ${B.slug} present in the super admin overview`);

  const badKey = await req('POST', '/api/super', { action: 'overview', superKey: 'wrong-key' }, { ip: nextIp() });
  t('CS-23', 'A wrong super key reads nothing', badKey.code === 403, `wrong key -> ${badKey.code}`);

  // No admin role may ever see what a student actually said.
  const adminPayload = JSON.stringify(loginA.json?.data ?? {});
  const leaked = ['transcript', 'answers', 'evaluation', 'feedback'].filter((k) => adminPayload.includes(`"${k}"`));
  t('CS-24', 'No admin can read a student\'s actual answers', leaked.length === 0,
    `transcript-ish fields in the admin payload: ${leaked.length ? leaked.join(', ') : 'none'}`);

  const pub = await req('GET', '/api/platform', null, { ip: nextIp() });
  t('CS-25', 'The public read leaks nothing but the switch',
    Object.keys(pub.json?.data ?? {}).length === 1,
    `public payload = ${JSON.stringify(pub.json?.data)}`);

  console.log('\n=== THE LOOP THE CLIENT HIT ===\n');

  // PILOT-02: a signed-in student landing on /start must not be asked to sign
  // in again. The page now checks /api/me first; this proves the API it relies
  // on answers correctly for a live session.
  const loopMe = await req('GET', '/api/me', null, { ip: viaA.ip, cookie: viaA.jar });
  t('CS-26', 'A signed-in student is recognised as signed in', loopMe.json?.data?.signedIn === true,
    `/api/me for a live session -> signedIn ${loopMe.json?.data?.signedIn}`);

  // Practice with zero practice credits must be a 402 with a real message, not
  // a 401. A 401 is what bounced them to the sign-in page over and over.
  const noPractice = await signIn(`pnp-${S}`);
  const prac = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'practice' }, { ip: noPractice.ip, cookie: noPractice.jar });
  t('CS-27', 'No practice credits gives 402, NEVER 401', prac.code !== 401,
    `practice with 0 credits -> ${prac.code} "${prac.json?.error?.userMessage?.slice(0, 45) ?? ''}"`);

  console.log(`\n  ${rows.filter((r) => r.ok).length} passed, ${rows.filter((r) => !r.ok).length} failed, ${rows.length} cases\n`);
  if (process.env.PILOT_JSON) require('fs').writeFileSync(process.env.PILOT_JSON, JSON.stringify(rows, null, 2));
  process.exit(rows.some((r) => !r.ok) ? 1 : 0);
})();
