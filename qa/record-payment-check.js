/**
 * A PAYMENT MADE OUTSIDE THE CHECKOUT, RECORDED BY THE SUPER ADMIN.
 *
 * 11 September 2026. Two students paid by a QR sent on WhatsApp, never opened
 * the pricing page, and the dashboard said four paying students when the
 * client knew it was six. "Give credit" writes a ledger line and nothing else,
 * so the money stayed invisible. `recordPayment` writes a verified ORDER, and
 * everything that counts money reads orders.
 *
 * What must be true:
 *   1. recording adds a verified order with a hand-written transaction id
 *   2. revenue, the paying count and the student's Paid column all move
 *   3. the pack is granted through the same path as an approval
 *   4. the same payment sent twice (double click) is recorded once
 *   5. a second, different payment for the same student adds up
 *   6. the audit trail names it as a hand-recorded payment
 *   7. bad input is refused: no confirmation, no amount, unknown student,
 *      a pack that is not sold, a note too short to mean anything
 *
 * Run against a freshly started `next dev`:
 *   QA_PORT=3000 SUPER_ADMIN_PASSCODE=... node qa/record-payment-check.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const P = Number(process.env.QA_PORT || 3000);
const SU = process.env.SUPER_ADMIN_PASSCODE || 'super-dev';
const plans = fs.readFileSync(path.join(__dirname, '..', 'lib/data/plans.ts'), 'utf8');
const mocksOf = (code) => Number(new RegExp(`code:\\s*'${code}'[\\s\\S]*?mockInterviews:\\s*(\\d+)`).exec(plans)[1]);
const PREP_MOCKS = mocksOf('prep');
const SERIOUS_MOCKS = mocksOf('serious');

function req(m, p, b, ip = '198.51.77.5', cookie) {
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

(async () => {
  const S = Date.now().toString(36);
  const PHONE = '98' + String(Date.now()).slice(-8);
  console.log('\n--- a student who signed in once and paid on WhatsApp ---');
  const st = await req('POST', '/api/auth/firebase', { idToken: 'dev:rp_' + S, fingerprint: 'rp' + S }, '198.51.77.9');
  t('the student can sign in', st.code === 200, `${st.code} ${st.body.slice(0, 100)}`);
  const prof = await req('POST', '/api/student/profile', { fullName: 'Rekha Paid ' + S, whatsappNumber: PHONE, whatsappConfirmed: true, level: 'masters', targetUniversity: 'Arden University, London' }, '198.51.77.9', jar(st));
  t('and give us a name and phone number', prof.code === 200, `${prof.code} ${prof.body.slice(0, 160)}`);
  const dir0 = await sup({ action: 'directory' });
  const me = (dir0.json?.data?.students ?? []).find((x) => x.name === 'Rekha Paid ' + S);
  t('they are in the directory with NPR 0 paid', !!me && me.paidNpr === 0, JSON.stringify(me).slice(0, 160));
  const ov0 = await sup({ action: 'overview' });
  const rev0 = ov0.json?.data?.revenueFromStudents ?? 0;
  const paying0 = ov0.json?.data?.counts?.paying ?? 0;
  const mocks0 = me?.mocksLeft ?? 0;

  console.log('\n--- record the payment ---');
  const rec = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'prep', amountNpr: 400, paidOn: '2026-09-10', note: 'Paid by eSewa QR sent on WhatsApp', confirmedReceived: true });
  t('recording returns an order id and says the pack was added', rec.code === 200 && rec.json?.data?.orderId && rec.json?.data?.duplicate === false, `${rec.code} ${rec.body.slice(0, 200)}`);
  t('and the mocks granted equal the pack, through the same path as an approval', rec.json?.data?.granted?.mocks === PREP_MOCKS, JSON.stringify(rec.json?.data?.granted));
  const oid = rec.json?.data?.orderId;
  const ords = await sup({ action: 'orders' });
  const mine = (ords.json?.data ?? []).filter((o) => o.studentId === me.id);
  const o1 = mine.find((o) => o.id === oid);
  t('it sits in the payments list as verified, on the day it was received', !!o1 && o1.state === 'verified' && o1.createdAt.startsWith('2026-09-10') && o1.amountNpr === 400, JSON.stringify(o1).slice(0, 200));
  t('its transaction id says on its face that it was typed in by hand', !!o1 && /^manual-20260910-/.test(o1.walletTxnId || ''), o1?.walletTxnId);
  t('the row carries the student name and phone so it links to their details', !!o1 && o1.studentName === 'Rekha Paid ' + S && o1.payerPhone === PHONE, `${o1?.studentName} ${o1?.payerPhone}`);
  const ov1 = await sup({ action: 'overview' });
  t('revenue from students went up by exactly the amount received', (ov1.json?.data?.revenueFromStudents ?? 0) - rev0 === 400, `${rev0} -> ${ov1.json?.data?.revenueFromStudents}`);
  t('and the paying-students count went up by one', (ov1.json?.data?.counts?.paying ?? 0) - paying0 === 1, `${paying0} -> ${ov1.json?.data?.counts?.paying}`);
  const dir1 = await sup({ action: 'directory' });
  const me1 = (dir1.json?.data?.students ?? []).find((x) => x.id === me.id);
  t("the student's Paid column shows it", me1?.paidNpr === 400, JSON.stringify(me1).slice(0, 160));
  t('and their mocks went up by the pack', (me1?.mocksLeft ?? 0) - mocks0 === PREP_MOCKS, `${mocks0} -> ${me1?.mocksLeft}`);
  const au = await sup({ action: 'audit' });
  const row = (au.json?.data ?? []).find((a) => a.action === 'record_payment' && a.subjectId === oid);
  t('the audit trail names it as a hand-recorded payment, with the note', !!row && /Recorded by hand/.test(row.note || '') && /eSewa QR/.test(row.note || ''), JSON.stringify(row).slice(0, 200));

  console.log('\n--- the same click twice, then a genuinely second payment ---');
  const again = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'prep', amountNpr: 400, paidOn: '2026-09-10', note: 'Paid by eSewa QR sent on WhatsApp', confirmedReceived: true });
  t('the same payment sent twice is recorded once and says so', again.code === 200 && again.json?.data?.duplicate === true && again.json?.data?.orderId === oid, `${again.code} ${again.body.slice(0, 160)}`);
  const dir2 = await sup({ action: 'directory' });
  const me2 = (dir2.json?.data?.students ?? []).find((x) => x.id === me.id);
  t('so nothing was added twice', me2?.paidNpr === 400 && me2?.mocksLeft === me1?.mocksLeft, `${me2?.paidNpr} ${me2?.mocksLeft}`);
  const second = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'serious', amountNpr: 700, paidOn: '2026-09-11', note: 'Cash in the office', confirmedReceived: true });
  t('a different payment for the same student is a new order', second.code === 200 && second.json?.data?.duplicate === false && second.json?.data?.orderId !== oid, `${second.code} ${second.body.slice(0, 160)}`);
  const dir3 = await sup({ action: 'directory' });
  const me3 = (dir3.json?.data?.students ?? []).find((x) => x.id === me.id);
  t('and the two add up on the student', me3?.paidNpr === 1100 && (me3?.mocksLeft ?? 0) - (me2?.mocksLeft ?? 0) === SERIOUS_MOCKS, `${me3?.paidNpr} mocks ${me2?.mocksLeft} -> ${me3?.mocksLeft}`);

  console.log('\n--- what is refused ---');
  const noConfirm = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'prep', amountNpr: 400, note: 'Paid by QR' });
  t('without the "I have seen the money" assertion', noConfirm.code === 400, `${noConfirm.code}`);
  const zero = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'prep', amountNpr: 0, note: 'Paid by QR', confirmedReceived: true });
  t('with no amount', zero.code === 400, `${zero.code}`);
  const ghost = await sup({ action: 'recordPayment', studentId: 'nobody-' + S, packCode: 'prep', amountNpr: 400, note: 'Paid by QR', confirmedReceived: true });
  t('for a student who does not exist', ghost.code === 404, `${ghost.code} ${ghost.body.slice(0, 120)}`);
  const free = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'trial', amountNpr: 400, note: 'Paid by QR', confirmedReceived: true });
  t('for a pack that is not sold', free.code === 400, `${free.code} ${free.body.slice(0, 120)}`);
  const terse = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'prep', amountNpr: 400, note: 'ok', confirmedReceived: true });
  t('with a note too short to mean anything', terse.code === 400, `${terse.code}`);
  const future = await sup({ action: 'recordPayment', studentId: me.id, packCode: 'prep', amountNpr: 400, paidOn: '2031-01-01', note: 'Paid by QR', confirmedReceived: true });
  t('with a date in the future', future.code === 400, `${future.code} ${future.body.slice(0, 120)}`);
  const dir4 = await sup({ action: 'directory' });
  const me4 = (dir4.json?.data?.students ?? []).find((x) => x.id === me.id);
  t('and none of those refusals changed the student', me4?.paidNpr === 1100 && me4?.mocksLeft === me3?.mocksLeft, `${me4?.paidNpr} ${me4?.mocksLeft}`);

  console.log(`\n  ${ok} passed, ${bad} bugs\n`);
  process.exit(bad > 0 ? 1 : 0);
})();
