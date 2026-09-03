/**
 * qa/coupon-check.js — THE COUPON LIFECYCLE, END TO END, THE WAY IT WILL BE USED.
 *
 * Written 3 September 2026 for the consultancy coupon model. Every step the
 * client described is driven here against a running server, in his order:
 *
 *   super admin creates a consultancy against money received (and is REFUSED
 *   when the money does not match the coupons)  ->  a generated handover code
 *   ->  the consultancy signs in, sees nothing until they choose their own
 *   passcode, then sees every coupon  ->  a student redeems one on the pricing
 *   route and the pack switches on at once  ->  the same code cannot be used
 *   again by anyone  ->  the consultancy and the super admin both see who used
 *   it, with phone and university  ->  another consultancy sees none of it  ->
 *   more coupons, a passcode reset, a suspension, and the audit trail.
 *
 * The rule for this file, as for pilot-check: a case passes only if the WRONG
 * thing is actually prevented. Asserting the happy path proves nothing about
 * the clever super admin or the clever student.
 *
 * Run:  QA_PORT=3050 node qa/coupon-check.js   (needs `next dev`, never `next start`)
 */
const http = require('http');

const QA_SUPER_KEY = process.env.SUPER_ADMIN_PASSCODE || 'super-dev';
const P = Number(process.env.QA_PORT || 3050);

function req(method, path, body, { ip = '10.0.0.1', cookie = null, raw = null, headers: extra = {} } = {}) {
  return new Promise((res) => {
    const data = raw ?? (body ? JSON.stringify(body) : null);
    const headers = { 'x-forwarded-for': ip, ...extra };
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
const SUPER = QA_SUPER_KEY;
let ipN = 0;
const nextIp = () => `10.${60 + Math.floor(ipN / 250)}.${(ipN++ % 250) + 1}.9`;

let pass = 0, fail = 0;
function t(id, story, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(7)} ${story.padEnd(64)} ${detail ?? ''}`);
}

/** A brand new student with the mandatory profile filled, from their own IP. */
async function signIn(token, opts = {}) {
  const ip = nextIp();
  const r = await req('POST', '/api/auth/firebase',
    { idToken: `dev:${token}`, fingerprint: opts.fp || token, ...(opts.via ? { via: opts.via } : {}) }, { ip });
  const jar = jarOf(r);
  let h = 7;
  for (const c of String(token)) h = (h * 31 + c.charCodeAt(0)) | 0;
  await req('POST', '/api/student/profile',
    { fullName: opts.name ?? `Coupon ${token}`.slice(0, 60), whatsappNumber: '98' + String(Math.abs(h)).padStart(8, '0').slice(-8),
      targetUniversity: opts.uni ?? 'Coventry University', level: 'masters' },
    { ip, cookie: jar });
  return { jar, ip, res: r };
}

/** Answer one question with audio that passes the size guard. */
function audioPart(sessionId, questionId) {
  const b = '----coupon' + Date.now() + Math.random().toString(36).slice(2);
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
  return req('POST', path, null, { ip, cookie: jar, raw: payload, headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } });
}

const superCall = (body) => req('POST', '/api/super', { superKey: SUPER, ...body }, { ip: nextIp() });
const platformCall = (body) => req('POST', '/api/platform', { superKey: SUPER, ...body }, { ip: nextIp() });
const adminCall = (slug, passcode, body) => req('POST', '/api/admin', { slug, passcode, ...body }, { ip: nextIp() });
const redeem = (st, code) => req('POST', '/api/payment', { action: 'redeemCoupon', code }, { ip: st.ip, cookie: st.jar });
const me = (st) => req('GET', '/api/me', null, { ip: st.ip, cookie: st.jar });
const strip = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ');

(async () => {
  const S = Date.now().toString(36);
  const A = { slug: `hub-a-${S}`, name: `Hub A ${S}`, chosen: 'hubApass2026' };
  const B = { slug: `hub-b-${S}`, name: `Hub B ${S}`, chosen: 'hubBpass2026' };

  console.log('\n=== THE SUPER ADMIN CANNOT ISSUE WHAT WAS NOT PAID FOR ===\n');

  const low = await platformCall({ action: 'createConsultancy', name: A.name, slug: A.slug, coupons: { prep: 5, serious: 2 }, paidNpr: 1500 });
  t('C-1', 'Fewer rupees than the coupons cost is REFUSED, with the working shown',
    low.code === 400 && low.json?.error?.code === 'PRICE_MISMATCH' && /2,900/.test(low.json?.error?.userMessage ?? '') && /1,500/.test(low.json?.error?.userMessage ?? ''),
    `${low.code} ${low.json?.error?.code}: ${(low.json?.error?.userMessage ?? '').slice(0, 110)}`);

  const high = await platformCall({ action: 'createConsultancy', name: A.name, slug: A.slug, coupons: { prep: 5, serious: 2 }, paidNpr: 3000 });
  t('C-1b', 'More rupees than the coupons cost is refused too (the sum must be exact)',
    high.code === 400 && high.json?.error?.code === 'PRICE_MISMATCH', `${high.code}`);

  const none = await platformCall({ action: 'createConsultancy', name: A.name, slug: A.slug, coupons: { prep: 0 }, paidNpr: 0 });
  t('C-2', 'Zero coupons is refused: a consultancy exists to hold coupons',
    none.code === 400, `${none.code} ${(none.json?.error?.userMessage ?? '').slice(0, 80)}`);

  const hidden = await platformCall({ action: 'createConsultancy', name: A.name, slug: A.slug, coupons: { starter: 1 }, paidNpr: 149 });
  t('C-3', 'A hidden pack (Starter) cannot be sold as a coupon',
    hidden.code === 400 && /do not exist/.test(hidden.json?.error?.userMessage ?? ''), `${hidden.code}`);

  const badSlug = await platformCall({ action: 'createConsultancy', name: A.name, slug: 'Hub A', coupons: { prep: 1 }, paidNpr: 300 });
  t('C-5', 'A short name with a capital or a space is refused WITH the rule spelled out',
    badSlug.code === 400 && /lower case/.test(badSlug.json?.error?.userMessage ?? ''),
    `${badSlug.code}: ${(badSlug.json?.error?.userMessage ?? '').slice(0, 90)}`);

  console.log('\n=== CREATION: PAID, APPROVED, HANDED OVER ===\n');

  const made = await platformCall({ action: 'createConsultancy', name: A.name, slug: A.slug, contactName: 'Sita', contactPhone: '9841000000', coupons: { prep: 5, serious: 2 }, paidNpr: 2900 });
  A.id = made.json?.data?.id;
  A.handover = made.json?.data?.handoverPasscode;
  const couponsA = made.json?.data?.coupons ?? [];
  t('C-4', 'The exact amount creates the account and 7 coupons',
    made.code === 200 && couponsA.length === 7 && couponsA.filter((c) => c.packCode === 'prep').length === 5 && couponsA.filter((c) => c.packCode === 'serious').length === 2,
    `${made.code}, ${couponsA.length} coupons (${couponsA.filter((c) => c.packCode === 'prep').length} prep, ${couponsA.filter((c) => c.packCode === 'serious').length} serious)`);
  t('C-4b', 'It is approved on creation, because the money came first',
    made.json?.data?.status === 'approved' && made.json?.data?.paidNpr === 2900, `status ${made.json?.data?.status}, paid ${made.json?.data?.paidNpr}`);
  t('C-4c', 'A handover passcode was GENERATED, not typed, and returned once in its own field',
    typeof A.handover === 'string' && A.handover.length >= 8 && !('passcode' in (made.json?.data ?? {})),
    `handover present, no raw passcode field`);
  t('C-4d', 'Coupon codes are twelve unguessable characters, grouped in fours',
    couponsA.every((c) => /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(c.code)) && new Set(couponsA.map((c) => c.code)).size === 7,
    couponsA.slice(0, 2).map((c) => c.code).join(', '));

  const dup = await platformCall({ action: 'createConsultancy', name: A.name, slug: A.slug, coupons: { prep: 1 }, paidNpr: 300 });
  t('C-6', 'The same short name twice is refused', dup.code === 409, `${dup.code}`);

  console.log('\n=== THE HANDOVER CODE: IN ONCE, THEN NOTHING UNTIL REPLACED ===\n');

  const first = await adminCall(A.slug, A.handover, { action: 'login' });
  t('C-7', 'The handover code opens the door and shows an EMPTY portal',
    first.code === 200 && first.json?.data?.passcodeIsTemporary === true && (first.json?.data?.coupons ?? []).length === 0 && (first.json?.data?.students ?? []).length === 0,
    `${first.code} temp=${first.json?.data?.passcodeIsTemporary} coupons=${(first.json?.data?.coupons ?? []).length}`);
  const dirBefore = await superCall({ action: 'directory' });
  const rowBefore = (dirBefore.json?.data?.consultancies ?? []).find((c) => c.id === A.id);
  t('C-10a', 'The super admin sees them as allocated but NOT yet active', rowBefore?.active === false, `active=${rowBefore?.active}`);

  const chose = await adminCall(A.slug, A.handover, { action: 'changePasscode', newPasscode: A.chosen });
  t('C-9', 'They choose their own passcode', chose.code === 200, `${chose.code}`);
  const oldStill = await adminCall(A.slug, A.handover, { action: 'login' });
  t('C-9b', 'The handover code stops working the moment they do', oldStill.code === 403, `${oldStill.code}`);
  const inA = await adminCall(A.slug, A.chosen, { action: 'login' });
  t('C-9c', 'The portal then shows all 7 coupons, none used',
    inA.code === 200 && (inA.json?.data?.coupons ?? []).length === 7 && inA.json?.data?.stats?.couponsTotal === 7 && inA.json?.data?.stats?.couponsUsed === 0 && inA.json?.data?.stats?.couponsLeft === 7,
    `coupons=${(inA.json?.data?.coupons ?? []).length} stats=${JSON.stringify(inA.json?.data?.stats ?? {}).slice(0, 80)}`);
  const dirAfter = await superCall({ action: 'directory' });
  const rowAfter = (dirAfter.json?.data?.consultancies ?? []).find((c) => c.id === A.id);
  t('C-10b', 'And the super admin now sees them as ACTIVE', rowAfter?.active === true, `active=${rowAfter?.active}`);
  t('C-10c', 'The super admin sees the same 7 coupons, by pack, with wholesale prices',
    rowAfter?.couponsTotal === 7 && rowAfter?.couponsLeft === 7 && (rowAfter?.coupons ?? []).every((c) => (c.packCode === 'prep' ? c.wholesaleNpr === 300 : c.wholesaleNpr === 700)),
    `${rowAfter?.couponsTotal} total, byPack ${JSON.stringify(rowAfter?.couponsByPack ?? [])}`);

  const prepCode = (inA.json?.data?.coupons ?? []).find((c) => c.packCode === 'prep')?.code;
  const seriousCode = (inA.json?.data?.coupons ?? []).find((c) => c.packCode === 'serious')?.code;

  console.log('\n=== A STUDENT REDEEMS: FRESH ACCOUNT, NEVER SAT THE FREE TEN ===\n');

  const stuA = await signIn(`ca-${S}`, { name: 'Anita Coupon', uni: 'BPP University' });
  const beforeA = await me(stuA);
  t('C-11a', 'Before the coupon: one free try, ten questions, has not paid',
    beforeA.json?.data?.entitlement?.mocksLeft === 1 && beforeA.json?.data?.entitlement?.questionsAllowed === 10 && beforeA.json?.data?.entitlement?.hasPaid === false,
    JSON.stringify(beforeA.json?.data?.entitlement ?? {}).slice(0, 90));

  const signedOut = await req('POST', '/api/payment', { action: 'redeemCoupon', code: prepCode }, { ip: nextIp() });
  t('C-24', 'Redeeming while signed out is refused', signedOut.code === 401, `${signedOut.code}`);

  // Typed the way a student types it: lower case, with the dashes, a stray space.
  const red = await redeem(stuA, ` ${prepCode.toLowerCase()} `);
  t('C-11', 'The coupon switches the Prep pack on at once, no approval queue',
    red.code === 200 && red.json?.data?.packName === 'Prep' && red.json?.data?.mocks === 3 && red.json?.data?.redeemed === true,
    `${red.code} ${JSON.stringify(red.json?.data ?? red.json?.error ?? {}).slice(0, 110)}`);
  const afterA = await me(stuA);
  t('C-11b', 'The pack IS the pack: 3 mocks, not 3 plus the unused free try; 17 questions; has paid',
    afterA.json?.data?.entitlement?.mocksLeft === 3 && afterA.json?.data?.entitlement?.practiceLeft === 15 && afterA.json?.data?.entitlement?.questionsAllowed === 17 && afterA.json?.data?.entitlement?.hasPaid === true,
    `mocks ${afterA.json?.data?.entitlement?.mocksLeft} practice ${afterA.json?.data?.entitlement?.practiceLeft} q ${afterA.json?.data?.entitlement?.questionsAllowed} paid ${afterA.json?.data?.entitlement?.hasPaid}`);
  t('C-11c', 'And the student is told their free try is included, in words', red.json?.data?.trialSuperseded === true, `trialSuperseded=${red.json?.data?.trialSuperseded}`);

  const sessA = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: stuA.ip, cookie: stuA.jar });
  t('C-11d', 'The interview they open is the full seventeen', (sessA.json?.data?.questions ?? []).length === 17, `${(sessA.json?.data?.questions ?? []).length} questions`);

  const again = await redeem(stuA, prepCode);
  t('C-12', 'The same student entering the same code again is answered calmly, and gets nothing more',
    again.code === 200 && again.json?.data?.alreadyRedeemed === true && (await me(stuA)).json?.data?.entitlement?.mocksLeft === 3,
    `${again.code} alreadyRedeemed=${again.json?.data?.alreadyRedeemed}`);

  const stuB = await signIn(`cb-${S}`, { name: 'Bikash Coupon' });
  const stolen = await redeem(stuB, prepCode);
  const garbage = await redeem(stuB, 'ZZZZ-ZZZZ-ZZZZ');
  t('C-13', 'ANOTHER student with the same code is refused', stolen.code === 404 && stolen.json?.error?.code === 'COUPON_INVALID', `${stolen.code}`);
  t('C-14', 'A used code and an invented code get the SAME sentence, so the form cannot probe which codes exist',
    garbage.code === 404 && garbage.json?.error?.userMessage === stolen.json?.error?.userMessage, `identical=${garbage.json?.error?.userMessage === stolen.json?.error?.userMessage}`);
  t('C-14b', 'And the refused student was not charged or granted anything', (await me(stuB)).json?.data?.entitlement?.mocksLeft === 1, `mocks ${(await me(stuB)).json?.data?.entitlement?.mocksLeft}`);

  console.log('\n=== A STUDENT WHO SAT THE FREE TEN FIRST, THEN REDEEMED ===\n');

  const stuC = await signIn(`cc-${S}`, { name: 'Chandra Coupon', uni: 'University of Greenwich' });
  const trial = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip: stuC.ip, cookie: stuC.jar });
  stuC.jar = merge(stuC.jar, jarOf(trial));
  const qs = trial.json?.data?.questions ?? [];
  const sidC = trial.json?.data?.sessionId;
  for (const q of qs) await answer(sidC, q.id, stuC.jar, stuC.ip);
  const spent = await me(stuC);
  t('C-15a', 'They sat all ten free questions and the free credit is spent',
    qs.length === 10 && spent.json?.data?.entitlement?.mocksLeft === 0, `served ${qs.length}, mocksLeft ${spent.json?.data?.entitlement?.mocksLeft}`);
  const redC = await redeem(stuC, seriousCode);
  const afterC = await me(stuC);
  t('C-15', 'The Serious coupon gives the full pack ON TOP: the sat trial is not taken back',
    redC.code === 200 && redC.json?.data?.packName === 'Serious' && afterC.json?.data?.entitlement?.mocksLeft === 10 && redC.json?.data?.trialSuperseded === false,
    `mocksLeft ${afterC.json?.data?.entitlement?.mocksLeft}, superseded=${redC.json?.data?.trialSuperseded}`);
  const reopened = await req('GET', `/api/session/${sidC}`, null, { ip: stuC.ip, cookie: stuC.jar });
  t('C-15b', 'And their finished ten-question sitting is unlocked to seventeen, so they finish the remaining seven',
    (reopened.json?.data?.questions ?? []).length === 17 && reopened.json?.data?.session?.isTrial === false && reopened.json?.data?.session?.status === 'in_progress',
    `${(reopened.json?.data?.questions ?? []).length} questions, isTrial=${reopened.json?.data?.session?.isTrial}, ${reopened.json?.data?.session?.status}`);

  console.log('\n=== WHO USED WHAT: THE CONSULTANCY AND THE SUPER ADMIN BOTH SEE IT ===\n');

  const inA2 = await adminCall(A.slug, A.chosen, { action: 'login' });
  const usedRows = (inA2.json?.data?.coupons ?? []).filter((c) => c.status === 'used');
  const anitaRow = usedRows.find((c) => c.code === prepCode);
  t('C-16', 'The consultancy sees 2 used, 5 left, and WHICH student used which coupon, with phone and university',
    inA2.json?.data?.stats?.couponsUsed === 2 && inA2.json?.data?.stats?.couponsLeft === 5 && anitaRow?.student?.name === 'Anita Coupon' && /^98\d{8}$/.test(anitaRow?.student?.phone ?? '') && anitaRow?.student?.targetUniversity === 'BPP University' && typeof anitaRow?.redeemedAt === 'string',
    `used ${inA2.json?.data?.stats?.couponsUsed} left ${inA2.json?.data?.stats?.couponsLeft}; ${anitaRow?.student?.name} ${anitaRow?.student?.phone} ${anitaRow?.student?.targetUniversity}`);
  t('C-16b', 'Used coupons come first, newest first', usedRows.length === 2 && (inA2.json?.data?.coupons ?? [])[0].status === 'used' && usedRows[0].redeemedAt >= usedRows[1].redeemedAt,
    `${(inA2.json?.data?.coupons ?? []).slice(0, 3).map((c) => c.status).join(',')}`);
  const stuRows = inA2.json?.data?.students ?? [];
  const chandra = stuRows.find((x) => x.name === 'Chandra Coupon');
  t('C-16c', 'Their student list carries the coupon used, the tests done and the mocks left',
    stuRows.length === 2 && chandra?.couponCode === seriousCode && chandra?.mocksUsed === 1 && chandra?.mocksLeft === 10 && stuRows[0].createdAt >= stuRows[1].createdAt,
    `${stuRows.length} students; Chandra coupon=${chandra?.couponCode} used=${chandra?.mocksUsed} left=${chandra?.mocksLeft}`);
  t('C-16d', 'And still no transcript reaches the consultancy', !JSON.stringify(inA2.json?.data ?? {}).includes('transcript'), 'G-8 holds');

  const dir = await superCall({ action: 'directory' });
  const dRow = (dir.json?.data?.consultancies ?? []).find((c) => c.id === A.id);
  const dAnita = (dir.json?.data?.students ?? []).find((x) => x.name === 'Anita Coupon');
  t('C-16e', 'The super admin sees the same coupons and students, tagged with the consultancy BY NAME and colour',
    dRow?.couponsUsed === 2 && (dRow?.coupons ?? []).find((c) => c.code === prepCode)?.student?.name === 'Anita Coupon' && dAnita?.consultancyName === A.name && typeof dAnita?.hue === 'number' && dAnita?.couponCode === prepCode,
    `consultancyName=${dAnita?.consultancyName} hue=${dAnita?.hue} coupon=${dAnita?.couponCode}`);
  const dStudents = dir.json?.data?.students ?? [];
  t('C-21b', 'The super admin student list is newest first', dStudents.every((x, i) => i === 0 || dStudents[i - 1].createdAt >= x.createdAt), `${dStudents.length} rows checked`);

  const ov = await superCall({ action: 'overview' });
  const ovAnita = (ov.json?.data?.students ?? []).find((x) => x.name === 'Anita Coupon');
  t('C-21', 'Revenue is split: the consultancy channel carries the NPR 2,900 and the coupon counts are right',
    ov.json?.data?.revenueFromConsultancies >= 2900 && ov.json?.data?.counts?.couponsIssued >= 7 && ov.json?.data?.counts?.couponsRedeemed >= 2 && ovAnita?.consultancyName === A.name,
    `fromConsultancies ${ov.json?.data?.revenueFromConsultancies}, issued ${ov.json?.data?.counts?.couponsIssued}, redeemed ${ov.json?.data?.counts?.couponsRedeemed}`);

  console.log('\n=== ISOLATION: NO CONSULTANCY SEES ANOTHER ===\n');

  const madeB = await platformCall({ action: 'createConsultancy', name: B.name, slug: B.slug, coupons: { serious: 1 }, paidNpr: 700 });
  B.id = madeB.json?.data?.id;
  await adminCall(B.slug, madeB.json?.data?.handoverPasscode, { action: 'changePasscode', newPasscode: B.chosen });
  const inB = await adminCall(B.slug, B.chosen, { action: 'login' });
  const bCodes = (inB.json?.data?.coupons ?? []).map((c) => c.code);
  t('C-17', 'Consultancy B sees only its own coupon and none of A\'s students',
    inB.code === 200 && bCodes.length === 1 && !bCodes.includes(prepCode) && !bCodes.includes(seriousCode) && (inB.json?.data?.students ?? []).length === 0,
    `B coupons=${bCodes.length}, students=${(inB.json?.data?.students ?? []).length}`);
  const inA3 = await adminCall(A.slug, A.chosen, { action: 'login' });
  t('C-17b', 'And A does not see B\'s coupon', !(inA3.json?.data?.coupons ?? []).some((c) => c.code === bCodes[0]), 'no leak');
  const bWithA = await adminCall(B.slug, A.chosen, { action: 'login' });
  t('C-17c', 'A\'s passcode does not open B\'s portal', bWithA.code === 403, `${bWithA.code}`);

  console.log('\n=== MORE COUPONS, A FORGOTTEN PASSCODE, A SUSPENSION ===\n');

  const addBad = await platformCall({ action: 'addCoupons', consultancyId: A.id, coupons: { serious: 1 }, paidNpr: 500 });
  t('C-18', 'Adding coupons with the wrong amount is refused the same way', addBad.code === 400 && addBad.json?.error?.code === 'PRICE_MISMATCH', `${addBad.code}`);
  const addOk = await platformCall({ action: 'addCoupons', consultancyId: A.id, coupons: { serious: 1 }, paidNpr: 700 });
  const inA4 = await adminCall(A.slug, A.chosen, { action: 'login' });
  const dir2 = await superCall({ action: 'directory' });
  const dRow2 = (dir2.json?.data?.consultancies ?? []).find((c) => c.id === A.id);
  t('C-18b', 'The right amount adds the coupon: 8 in the portal, NPR 3,600 paid so far',
    addOk.code === 200 && inA4.json?.data?.stats?.couponsTotal === 8 && dRow2?.paidNpr === 3600, `total ${inA4.json?.data?.stats?.couponsTotal}, paid ${dRow2?.paidNpr}`);

  const reset = await platformCall({ action: 'resetConsultancyPasscode', consultancyId: A.id });
  const newHandover = reset.json?.data?.handoverPasscode;
  const oldChosen = await adminCall(A.slug, A.chosen, { action: 'login' });
  const withNew = await adminCall(A.slug, newHandover, { action: 'login' });
  t('C-19', 'A passcode reset kills the old one and issues a fresh handover code that must be changed again',
    reset.code === 200 && typeof newHandover === 'string' && oldChosen.code === 403 && withNew.code === 200 && withNew.json?.data?.passcodeIsTemporary === true,
    `old -> ${oldChosen.code}, new -> ${withNew.code} temp=${withNew.json?.data?.passcodeIsTemporary}`);
  t('C-19b', 'The new code is not the old code', newHandover !== A.handover, '');
  await adminCall(A.slug, newHandover, { action: 'changePasscode', newPasscode: A.chosen + 'x' });
  A.chosen = A.chosen + 'x';

  const spare = (inA4.json?.data?.coupons ?? []).find((c) => c.status === 'unused' && c.packCode === 'serious')?.code;
  await platformCall({ action: 'setConsultancyStatus', consultancyId: A.id, status: 'suspended' });
  const stuD = await signIn(`cd-${S}`, { name: 'Deepa Coupon' });
  const paused = await redeem(stuD, spare);
  t('C-20', 'A suspended consultancy\'s coupons stop working, and the student is told to ask them',
    paused.code === 409 && paused.json?.error?.code === 'COUPON_CONSULTANCY_PAUSED', `${paused.code} ${paused.json?.error?.code}`);
  const leftBefore = inA4.json?.data?.stats?.couponsLeft;
  const leftAfterRefusal = (await superCall({ action: 'directory' })).json?.data?.consultancies?.find((c) => c.id === A.id)?.couponsLeft;
  t('C-20b', 'And the coupon was NOT consumed by the refusal', leftAfterRefusal === leftBefore, `left ${leftBefore} -> ${leftAfterRefusal}`);
  await platformCall({ action: 'setConsultancyStatus', consultancyId: A.id, status: 'approved' });
  const resumed = await redeem(stuD, spare);
  t('C-20c', 'Reactivated, the same coupon works', resumed.code === 200 && resumed.json?.data?.packName === 'Serious', `${resumed.code}`);

  console.log('\n=== GUESSING, AND THE PAPER TRAIL ===\n');

  const stuE = await signIn(`ce-${S}`);
  let hit429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await redeem(stuE, `GUES-S${String(i).padStart(3, '0')}-XXXX`);
    if (r.code === 429) { hit429 = true; break; }
  }
  t('C-25', 'A student who keeps guessing codes is slowed down', hit429, hit429 ? '429 within 12 attempts' : 'never throttled');

  const au = await superCall({ action: 'audit' });
  const acts = (au.json?.data ?? []).map((a) => a.action);
  t('C-23', 'Creation, issuing, redemption and the reset are all in the audit trail',
    ['create_consultancy', 'issue_coupons', 'redeem_coupon', 'reset_passcode'].every((a) => acts.includes(a)), acts.filter((a) => /coupon|consultancy|passcode/.test(a)).slice(0, 8).join(','));
  t('C-23b', 'And the audit trail holds no passcode, handover or otherwise',
    !JSON.stringify(au.json?.data ?? []).includes(A.handover) && !JSON.stringify(au.json?.data ?? []).includes(newHandover), 'no secret in the trail');

  console.log('\n=== THE PAGES SAY THE RIGHT THING ===\n');

  const partner = await req('GET', '/consultancy', null, { ip: nextIp() });
  const partnerText = strip(partner.body).replace(/\s+/g, ' ');
  t('C-26', '/consultancy sells coupons at the wholesale prices, and shows the retail price beside them',
    partner.code === 200 && /NPR 300/.test(partnerText) && /NPR 700/.test(partnerText) && /NPR 399/.test(partnerText) && /NPR 799/.test(partnerText) && !/per mock/i.test(partnerText),
    `${partner.code}`);
  const pricing = await req('GET', '/pricing', null, { ip: nextIp() });
  const pricingText = strip(pricing.body).replace(/\s+/g, ' ');
  t('C-26b', '/pricing offers the coupon as the second way to pay, and never the wholesale price',
    pricing.code === 200 && /coupon/i.test(pricingText) && /NPR 399/.test(pricingText) && !/NPR 300/.test(pricingText) && !/NPR 700/.test(pricingText),
    `${pricing.code}`);
  t('C-27', 'The footer names the company', /WI Education/.test(pricingText), '');

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
