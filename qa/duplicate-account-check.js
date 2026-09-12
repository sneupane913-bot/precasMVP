/**
 * ONE NUMBER, ONE ACCOUNT — AND TAKING A PAYMENT BACK.
 *
 * 12 September 2026. One student held two Google accounts on one phone number.
 * He took a free mock on each, was credited a paid pack by hand onto the
 * account he had abandoned, saw nothing, complained, was asked to pay through
 * the checkout on the account he really used, and was credited a second time.
 * One payment of NPR 799, two verified orders, two packs, and a payments screen
 * that rendered both rows as the identical line "Nirajan Kc" — there was
 * nothing on it that could tell the two accounts apart.
 *
 * What must be true now:
 *   1. a number that already has an account cannot be used by a second one
 *   2. the refusal names the account it clashes with, masked, so a genuine
 *      student can recognise their own Gmail and go and use it
 *   3. a student re-saving their OWN profile with their OWN number still works
 *   4. a closed account cannot sign in, and is told WHY in words
 *   5. reopening it lets them back in
 *   6. every payment row carries the account email, not just the name
 *   7. an approved payment can be taken back: out of revenue, pack returned
 *   8. taking it back twice takes one pack back, not two
 *   9. a balance is never driven below zero by a void
 *
 * Run against a freshly started `next dev`:
 *   QA_PORT=3097 SUPER_ADMIN_PASSCODE=super-dev node qa/duplicate-account-check.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const P = Number(process.env.QA_PORT || 3000);
const SU = process.env.SUPER_ADMIN_PASSCODE || 'super-dev';
const plans = fs.readFileSync(path.join(__dirname, '..', 'lib/data/plans.ts'), 'utf8');
const mocksOf = (code) => Number(new RegExp(`code:\\s*'${code}'[\\s\\S]*?mockInterviews:\\s*(\\d+)`).exec(plans)[1]);
const PREP_MOCKS = mocksOf('prep');

function req(m, p, b, ip = '198.51.66.5', cookie) {
  return new Promise((r) => {
    const d = b ? JSON.stringify(b) : null;
    const h = { 'x-forwarded-for': ip };
    if (d) h['Content-Type'] = 'application/json';
    if (cookie) h['Cookie'] = cookie;
    const q = http.request({ host: '127.0.0.1', port: P, path: p, method: m, headers: h }, (s) => {
      let x = '';
      s.on('data', (c) => (x += c));
      s.on('end', () => {
        let j = null;
        try { j = JSON.parse(x); } catch {}
        r({ code: s.statusCode, json: j, sc: s.headers['set-cookie'] || [], body: x });
      });
    });
    q.on('error', (e) => r({ code: 0, body: '' + e }));
    if (d) q.write(d);
    q.end();
  });
}
const jar = (r) => (r.sc || []).map((c) => c.split(';')[0]).join('; ');
let ok = 0, bad = 0;
const t = (n, c, d = '') => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  BUG  ' + n + '\n       ' + d); } };
const sup = (b) => req('POST', '/api/super', { superKey: SU, ...b });
const profile = (cookie, phone, name) =>
  req('POST', '/api/student/profile',
    { fullName: name, whatsappNumber: phone, level: 'masters', targetUniversity: 'Arden University, London' },
    '198.51.66.9', cookie);

(async () => {
  const S = Date.now().toString(36);
  const PHONE = '98' + String(Date.now()).slice(-8);
  const OTHER = '97' + String(Date.now() + 7).slice(-8);

  console.log('\n--- one person, two Google accounts, one phone number ---');
  const a = await req('POST', '/api/auth/firebase', { idToken: 'dev:dup_a_' + S, fingerprint: 'da' + S }, '198.51.66.9');
  t('the first account signs in', a.code === 200, `${a.code} ${a.body.slice(0, 120)}`);
  const pa = await profile(jar(a), PHONE, 'Dup One ' + S);
  t('and takes the number', pa.code === 200, `${pa.code} ${pa.body.slice(0, 200)}`);

  const b = await req('POST', '/api/auth/firebase', { idToken: 'dev:dup_b_' + S, fingerprint: 'db' + S }, '198.51.66.9');
  t('the second account signs in fine (the number is the control, not the email)', b.code === 200, `${b.code}`);
  const pb = await profile(jar(b), PHONE, 'Dup Two ' + S);
  t('but it CANNOT take a number that already has an account', pb.code === 409, `${pb.code} ${pb.body.slice(0, 200)}`);
  t('and the refusal is NUMBER_IN_USE', pb.json?.error?.code === 'NUMBER_IN_USE', JSON.stringify(pb.json?.error).slice(0, 200));
  const msg = pb.json?.error?.userMessage ?? '';
  t('it points them at the Google account they already have', /sign in with that Google account/i.test(msg), msg.slice(0, 200));
  t('it shows a masked hint of that account, never the whole address', /\*/.test(msg) && !msg.includes('dup_a'), msg.slice(0, 200));

  const pb2 = await profile(jar(b), OTHER, 'Dup Two ' + S);
  t('a different number is accepted', pb2.code === 200, `${pb2.code} ${pb2.body.slice(0, 160)}`);
  const pa2 = await profile(jar(a), PHONE, 'Dup One Renamed ' + S);
  t('and a student re-saving their OWN number is not blocked by themselves', pa2.code === 200, `${pa2.code} ${pa2.body.slice(0, 160)}`);

  console.log('\n--- the checkout is the other door onto the same field ---');
  // /api/payment also writes whatsappNumber. It used to do so with no
  // uniqueness check and no normalisation at all, so the rule enforced on the
  // profile screen could simply be walked around here.
  const mk = await req('POST', '/api/payment', { action: 'create', packCode: 'prep' }, '198.51.66.9', jar(b));
  t('the second account can start a checkout', mk.code === 200 && mk.json?.data?.orderId, `${mk.code} ${mk.body.slice(0, 200)}`);
  const bOrder = mk.json?.data?.orderId;
  const steal = await req('POST', '/api/payment', {
    action: 'submit', orderId: bOrder, walletTxnId: 'QATXN' + S.toUpperCase(),
    payerName: 'Dup Two', payerPhoneSuffix: '5552', whatsappNumber: PHONE, whatsappConfirmed: true,
  }, '198.51.66.9', jar(b));
  t('but it cannot take the other account\'s number at checkout either', steal.code === 409, `${steal.code} ${steal.body.slice(0, 200)}`);
  t('and it is refused for the right reason', steal.json?.error?.code === 'NUMBER_IN_USE', JSON.stringify(steal.json?.error).slice(0, 160));
  // The refusal must land BEFORE the transaction id is claimed, or an honest
  // retry would be told their own transaction number was already used.
  const retry = await req('POST', '/api/payment', {
    action: 'submit', orderId: bOrder, walletTxnId: 'QATXN' + S.toUpperCase(),
    payerName: 'Dup Two', payerPhoneSuffix: '5552', whatsappNumber: OTHER, whatsappConfirmed: true,
  }, '198.51.66.9', jar(b));
  t('the refusal did not burn their transaction number', retry.code === 200, `${retry.code} ${retry.body.slice(0, 200)}`);

  // A number typed with the country code is the SAME number, and must not be
  // able to sneak past the check by being spelled differently.
  const c = await req('POST', '/api/auth/firebase', { idToken: 'dev:dup_c_' + S, fingerprint: 'dc' + S }, '198.51.66.9');
  const pc = await profile(jar(c), '977' + PHONE, 'Dup Three ' + S);
  t('977 in front of a taken number is still that taken number', pc.code === 409, `${pc.code} ${pc.body.slice(0, 200)}`);

  console.log('\n--- the payments screen must say WHICH account ---');
  const dir0 = await sup({ action: 'directory' });
  const me = (dir0.json?.data?.students ?? []).find((x) => x.whatsappNumber === PHONE);
  t('the paying student is in the directory', !!me, JSON.stringify(me).slice(0, 160));
  const ov0 = await sup({ action: 'overview' });
  const rev0 = ov0.json?.data?.revenueFromStudents ?? 0;
  const rec = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'prep', amountNpr: 400, note: 'Paid by QR on WhatsApp', confirmedReceived: true });
  t('a payment is recorded', rec.code === 200 && rec.json?.data?.orderId, `${rec.code} ${rec.body.slice(0, 200)}`);
  const oid = rec.json?.data?.orderId;
  const ords = await sup({ action: 'orders' });
  const row = (ords.json?.data ?? []).find((o) => o.id === oid);
  t('the payment row carries the ACCOUNT EMAIL, not just the name', !!row && typeof row.studentEmail === 'string' && row.studentEmail.length > 0, JSON.stringify(row?.studentEmail));

  const dir1 = await sup({ action: 'directory' });
  const me1 = (dir1.json?.data?.students ?? []).find((x) => x.id === me.id);
  t('the pack arrived', (me1?.mocksLeft ?? 0) - (me?.mocksLeft ?? 0) === PREP_MOCKS, `${me?.mocksLeft} -> ${me1?.mocksLeft}`);
  const ov1 = await sup({ action: 'overview' });
  t('and revenue moved', (ov1.json?.data?.revenueFromStudents ?? 0) - rev0 === 400, `${rev0} -> ${ov1.json?.data?.revenueFromStudents}`);

  console.log('\n--- taking an approved payment back ---');
  const noReason = await sup({ action: 'voidPayment', orderId: oid, reason: 'x', confirmed: true });
  t('a void with no real reason is refused', noReason.code === 400, `${noReason.code} ${noReason.body.slice(0, 160)}`);
  const v = await sup({ action: 'voidPayment', orderId: oid, reason: 'Duplicate: recorded twice on two accounts.', confirmed: true });
  t('the payment is taken back', v.code === 200, `${v.code} ${v.body.slice(0, 200)}`);
  t('and it says how many mocks came back', v.json?.data?.reversed?.mocks === PREP_MOCKS, JSON.stringify(v.json?.data?.reversed));
  const ords2 = await sup({ action: 'orders' });
  const row2 = (ords2.json?.data ?? []).find((o) => o.id === oid);
  t('the order reads as taken back, and is NOT deleted', !!row2 && row2.state === 'voided', JSON.stringify(row2?.state));
  t('the reason is kept on the record', /Duplicate/.test(row2?.rejectedReason ?? ''), row2?.rejectedReason);
  const ov2 = await sup({ action: 'overview' });
  t('revenue goes back to where it was', (ov2.json?.data?.revenueFromStudents ?? 0) === rev0, `${rev0} vs ${ov2.json?.data?.revenueFromStudents}`);
  const dir2 = await sup({ action: 'directory' });
  const me2 = (dir2.json?.data?.students ?? []).find((x) => x.id === me.id);
  t('the pack is taken off the student', me2?.mocksLeft === me?.mocksLeft, `${me?.mocksLeft} vs ${me2?.mocksLeft}`);
  t('their Paid column clears', me2?.paidNpr === 0, `${me2?.paidNpr}`);
  t('and the balance is never negative', (me2?.mocksLeft ?? 0) >= 0 && (me2?.practiceLeft ?? 0) >= 0, `${me2?.mocksLeft} ${me2?.practiceLeft}`);

  const v2 = await sup({ action: 'voidPayment', orderId: oid, reason: 'Duplicate: recorded twice on two accounts.', confirmed: true });
  t('voiding twice takes one pack back, not two', v2.code === 200 && v2.json?.data?.reversed?.mocks === 0, `${v2.code} ${JSON.stringify(v2.json?.data?.reversed)}`);
  const dir3 = await sup({ action: 'directory' });
  const me3 = (dir3.json?.data?.students ?? []).find((x) => x.id === me.id);
  t('so the student is unchanged by the second void', me3?.mocksLeft === me2?.mocksLeft, `${me2?.mocksLeft} vs ${me3?.mocksLeft}`);

  console.log('\n--- a closed account is turned away, and told why ---');
  const REASON = 'Closed because you already have an account on this phone number. Please sign in with your other Gmail.';
  const dis = await sup({ action: 'setStudentStatus', studentId: me.id, status: 'disabled', reason: REASON });
  t('the account is closed', dis.code === 200, `${dis.code} ${dis.body.slice(0, 160)}`);
  const back = await req('POST', '/api/auth/firebase', { idToken: 'dev:dup_a_' + S, fingerprint: 'da' + S }, '198.51.66.9');
  t('signing in again is refused', back.code === 403, `${back.code} ${back.body.slice(0, 200)}`);
  t('with the exact sentence the owner wrote', back.json?.error?.userMessage === REASON, (back.json?.error?.userMessage ?? '').slice(0, 200));
  t('and no session is handed out', (back.sc || []).length === 0, JSON.stringify(back.sc).slice(0, 160));

  const en = await sup({ action: 'setStudentStatus', studentId: me.id, status: 'active' });
  t('reopening the account works', en.code === 200, `${en.code}`);
  const back2 = await req('POST', '/api/auth/firebase', { idToken: 'dev:dup_a_' + S, fingerprint: 'da' + S }, '198.51.66.9');
  t('and they can sign in again', back2.code === 200, `${back2.code} ${back2.body.slice(0, 160)}`);

  console.log(`\n  ${ok} passed, ${bad} bugs\n`);
  process.exit(bad > 0 ? 1 : 0);
})();
