/**
 * PASSCODES: THE HANDOVER PROBLEM, AND CHANGING YOUR OWN.
 *
 * The flaw the client named himself: the super admin sets a consultancy's first
 * passcode, so the super admin knows it. A secret two organisations share is not
 * a password. If a consultancy's student list ever leaked, neither side could
 * say which of them leaked it.
 *
 * So the first code is a HANDOVER code. It gets them in exactly once, and the
 * portal refuses every other action until they replace it. Not a banner they can
 * dismiss, because a banner leaves the shared secret in force for as long as
 * they ignore it.
 *
 * The super admin had the opposite problem: their passcode could only be changed
 * by editing an environment variable and redeploying, which in practice means it
 * never gets changed. Not when a laptop is lost, not when somebody leaves, not
 * after it has been read out over the phone to unstick somebody.
 *
 * Every case here DRIVES the running product. None of it reads source.
 *
 * Run:  QA_PORT=3120 node qa/passcode-check.js
 */
const http = require('http');

const P = Number(process.env.QA_PORT || 3120);
const SU = process.env.SUPER_ADMIN_PASSCODE || 'super-dev';

let pass = 0;
let fail = 0;
function t(id, name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${id.padEnd(8)} ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${id.padEnd(8)} ${name}\n          ${detail}`);
  }
}

let ipN = 0;
function req(path, body, ip) {
  ipN += 1;
  return new Promise((res) => {
    const data = JSON.stringify(body);
    const r = http.request(
      {
        host: '127.0.0.1',
        port: P,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Staff endpoints throttle failed guesses per address, which is
          // correct and must stay. Each call comes from its own desk.
          'x-forwarded-for': ip || `198.51.110.${(ipN % 240) + 1}`,
        },
      },
      (resp) => {
        let d = '';
        resp.on('data', (c) => (d += c));
        resp.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(d);
          } catch {
            /* */
          }
          res({ code: resp.statusCode, json, body: d });
        });
      }
    );
    r.on('error', (e) => res({ code: 0, json: null, body: String(e) }));
    r.write(data);
    r.end();
  });
}

(async () => {
  console.log('\n=== PASSCODES: HANDOVER, AND CHANGING YOUR OWN ===\n');
  const S = Date.now().toString(36);
  const slug = `pass-${S}`;
  const handover = 'handover-code-1';
  const chosen = 'theirOwn2026secret';

  // ---------------------------------------------------------------- setup
  const made = await req('/api/platform', {
    action: 'createConsultancy',
    superKey: SU,
    name: `Passcode Hub ${S}`,
    slug,
    contactName: 'Sita',
    contactPhone: '+97798',
    seatsTotal: 20,
    paidNpr: 0,
    passcode: handover,
  });
  const cid = made.json?.data?.id;
  await req('/api/platform', {
    action: 'setConsultancyStatus',
    superKey: SU,
    consultancyId: cid,
    status: 'approved',
  });

  // ----------------------------------------------------------------- PC-1
  const first = await req('/api/admin', { action: 'login', slug, passcode: handover });
  t(
    'PC-1',
    'The handover code lets them in',
    first.code === 200 || first.json?.error?.code === 'PASSCODE_MUST_CHANGE',
    `login -> ${first.code} ${first.json?.error?.code ?? ''}`
  );
  t(
    'PC-2',
    'But the portal shows them NOTHING until they replace it',
    first.code === 403 && first.json?.error?.code === 'PASSCODE_MUST_CHANGE',
    `login returned ${first.code}. While the handover code is in force, we and they share one secret, so neither could be held to account for a leak.`
  );
  t(
    'PC-3',
    'And it says why, in a sentence a person would accept',
    /own passcode|we know it|yours alone/i.test(first.json?.error?.userMessage ?? ''),
    `message: "${first.json?.error?.userMessage ?? ''}"`
  );

  // ----------------------------------------------------------------- PC-4
  // Nothing else works while it is temporary. Not reading, not money.
  for (const [id, action, extra] of [
    ['PC-4', 'buySeats', { bundleCode: 'b20' }],
    ['PC-5', 'updateBranding', { logoUrl: null, primaryColor: '#123456' }],
  ]) {
    const r = await req('/api/admin', { action, slug, passcode: handover, ...extra });
    t(
      id,
      `${action} is refused while the handover code is in force`,
      r.code === 403 && r.json?.error?.code === 'PASSCODE_MUST_CHANGE',
      `-> ${r.code} ${r.json?.error?.code}`
    );
  }

  // ----------------------------------------------------------------- PC-6
  // The change itself, and the guards on it.
  const same = await req('/api/admin', {
    action: 'changePasscode',
    slug,
    passcode: handover,
    newPasscode: handover,
  });
  t(
    'PC-6',
    'Setting it to the SAME code is refused',
    same.code === 400 && same.json?.error?.code === 'SAME_PASSCODE',
    `-> ${same.code} ${same.json?.error?.code}. Otherwise the forced change could be satisfied by doing nothing.`
  );

  const digits = await req('/api/admin', {
    action: 'changePasscode',
    slug,
    passcode: handover,
    newPasscode: '12345678',
  });
  t(
    'PC-7',
    'Digits alone are refused',
    digits.code === 400 && digits.json?.error?.code === 'WEAK_PASSCODE',
    `-> ${digits.code} ${digits.json?.error?.code}`
  );

  const short = await req('/api/admin', {
    action: 'changePasscode',
    slug,
    passcode: handover,
    newPasscode: 'ab12',
  });
  t('PC-8', 'A four character passcode is refused', short.code === 400, `-> ${short.code}`);

  const wrongOld = await req('/api/admin', {
    action: 'changePasscode',
    slug,
    passcode: 'not-the-handover-code',
    newPasscode: chosen,
  });
  t(
    'PC-9',
    'Changing it needs the CURRENT code, so a walk-up cannot lock them out',
    wrongOld.code === 403,
    `-> ${wrongOld.code}. Without this, anyone at an unattended browser could take the account.`
  );

  const changed = await req('/api/admin', {
    action: 'changePasscode',
    slug,
    passcode: handover,
    newPasscode: chosen,
  });
  t('PC-10', 'They can set their own', changed.code === 200, `-> ${changed.code} ${changed.body.slice(0, 120)}`);

  // ---------------------------------------------------------------- PC-11
  const oldStill = await req('/api/admin', { action: 'login', slug, passcode: handover });
  t(
    'PC-11',
    'The handover code stops working the moment they change it',
    oldStill.code === 403 && oldStill.json?.error?.code === 'FORBIDDEN',
    `-> ${oldStill.code} ${oldStill.json?.error?.code}. If the old one still worked, the whole exercise was theatre.`
  );

  const nowIn = await req('/api/admin', { action: 'login', slug, passcode: chosen });
  t(
    'PC-12',
    'And the portal opens fully with the new one',
    nowIn.code === 200 && Array.isArray(nowIn.json?.data?.students),
    `-> ${nowIn.code}`
  );
  t(
    'PC-13',
    'The portal no longer asks them to change it',
    nowIn.json?.data?.passcodeIsTemporary === false,
    `passcodeIsTemporary = ${nowIn.json?.data?.passcodeIsTemporary}`
  );
  t(
    'PC-14',
    'And their passcode is never sent back to the browser',
    !('passcode' in (nowIn.json?.data?.consultancy ?? {})) && !/theirOwn2026secret/.test(nowIn.body),
    'a screen that receives the passcode is a screen that can leak it'
  );

  // ---------------------------------------------------------------- PC-15
  // It is recorded, and the passcode itself is NOT in the record.
  const auditRows = (await req('/api/super', { action: 'audit', superKey: SU })).json?.data ?? [];
  const row = auditRows.find((a) => a.action === 'change_passcode' && a.actorId === cid);
  t('PC-15', 'The change is recorded against them', Boolean(row), `${auditRows.length} audit rows`);
  t(
    'PC-16',
    'And the audit trail does NOT contain the passcode',
    !JSON.stringify(auditRows).includes(chosen) && !JSON.stringify(auditRows).includes(handover),
    'an audit trail holding secrets is a second copy of the secret, somewhere more people can read'
  );

  // ---------------------------------------------------------------- PC-17
  // The SUPER ADMIN can change their own, and the old one stops working.
  const superNew = 'ownerChosen2026key';
  const weak = await req('/api/super', {
    action: 'changeSuperPasscode',
    superKey: SU,
    newPasscode: '1234567890',
  });
  t('PC-17', 'A digits-only super passcode is refused', weak.code === 400, `-> ${weak.code}`);

  const superChanged = await req('/api/super', {
    action: 'changeSuperPasscode',
    superKey: SU,
    newPasscode: superNew,
  });
  t(
    'PC-18',
    'The super admin can change their own passcode without a deploy',
    superChanged.code === 200,
    `-> ${superChanged.code} ${superChanged.body.slice(0, 140)}`
  );

  const oldSuper = await req('/api/super', { action: 'overview', superKey: SU });
  t(
    'PC-19',
    'The old super passcode stops working immediately',
    oldSuper.code === 403,
    `-> ${oldSuper.code}. A change that leaves the old one working is not a change.`
  );

  const newSuper = await req('/api/super', { action: 'overview', superKey: superNew });
  t('PC-20', 'And the new one works', newSuper.code === 200, `-> ${newSuper.code}`);

  const platformToo = await req('/api/platform', { action: 'overview', superKey: superNew });
  t(
    'PC-21',
    'The new passcode works on the platform door too, not just this one',
    platformToo.code === 200,
    `-> ${platformToo.code}. Two doors with two different truths about who you are is how one gets left open.`
  );

  /**
   * PC-22. THE LOCKOUT ESCAPE, and it was broken until this test was written.
   *
   * The message on screen promises: "if you ever forget it, change
   * SUPER_ADMIN_PASSCODE in Netlify and redeploy". That promise was false. The
   * stored passcode took precedence unconditionally, so rotating the deploy key
   * would have changed nothing and the owner would have been locked out of
   * their own product with no way back in.
   *
   * The stored passcode is now stamped with the deploy key it was chosen
   * against, and is ignored the moment that key changes. Simulated here by
   * changing the deploy key on the running server.
   */
  const rotated = await req('/api/qa/rotate-deploy-key', { to: `${SU}-rotated` });
  if (rotated.code === 200) {
    const backIn = await req('/api/super', { action: 'overview', superKey: `${SU}-rotated` });
    t(
      'PC-22',
      'Rotating the deploy key really does hand access back',
      backIn.code === 200,
      `-> ${backIn.code}. Without this the owner could lock themselves out permanently, and the message on screen promises otherwise.`
    );
    const oldChosen = await req('/api/super', { action: 'overview', superKey: superNew });
    t(
      'PC-23',
      'And the forgotten passcode stops working once the key is rotated',
      oldChosen.code === 403,
      `-> ${oldChosen.code}`
    );
    await req('/api/qa/rotate-deploy-key', { to: SU });
  } else {
    t('PC-22', 'Rotating the deploy key really does hand access back', false,
      'the dev-only rotate helper is not available, so the escape hatch is UNPROVEN');
  }

  // Leave the world as we found it, so every other suite still works.
  await req('/api/qa/rotate-deploy-key', { to: SU });
  const restored = await req('/api/super', { action: 'overview', superKey: SU });
  t('PC-24', 'The suite leaves the passcode as it found it', restored.code === 200, `-> ${restored.code}`);

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
