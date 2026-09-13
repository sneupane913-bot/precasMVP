/**
 * THE INTERVIEW YOU CANNOT OPEN, AND CANNOT ESCAPE.
 *
 * 13 September 2026. A real student picked "Arden University, London", tapped
 * start, and landed on "We could not open this interview / We could not find
 * that interview. Please start a new one." She pressed "Start a new
 * interview", which returns her to the catalogue, tapped Arden again, and got
 * the identical page. Every single time. There is no way out of it from
 * inside the product.
 *
 * The loop, and it is a loop by construction:
 *
 *   1. /api/session/create finds she already has an OPEN sitting and, rightly,
 *      hands that one back instead of spending a second credit. It checks that
 *      the sitting belongs to her STUDENT id.
 *   2. GET /api/session/{id} refuses to open a sitting unless the caller's
 *      anonymous owner cookie (precas_uid) equals the sitting's ownerId. That
 *      cookie is per BROWSER, not per student.
 *   3. So the moment the two disagree — she signed in on a second device, or
 *      cleared her browsing data, or the cookie was never set — create keeps
 *      handing back an id that GET will always refuse, and "start a new
 *      interview" cannot break out because create never makes a new one.
 *
 * Nothing about this is Arden's fault; Arden is simply where she happened to
 * have an open sitting. Any university reproduces it.
 *
 * The rule this suite defends: IF THE SERVER HANDS A STUDENT A SESSION ID, THE
 * STUDENT MUST BE ABLE TO OPEN IT. A resume that cannot be opened is worse
 * than a refusal, because a refusal can be recovered from.
 *
 * Run:  QA_PORT=3099 node qa/resume-owner-check.js
 */
const http = require('http');

const P = Number(process.env.QA_PORT || 3099);
const UNI = process.env.QA_UNI || 'arden-university-london';

function req(method, path, body, ip, cookie) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'x-forwarded-for': ip };
    if (data) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch {}
        resolve({ code: res.statusCode, json, raw, setCookie: res.headers['set-cookie'] || [] });
      });
    });
    r.on('error', (e) => resolve({ code: 0, raw: String(e), setCookie: [] }));
    if (data) r.write(data);
    r.end();
  });
}

/** A browser: its own cookie jar, its own IP. */
function device(ip) {
  const jar = new Map();
  return {
    ip,
    cookies: () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ') || undefined,
    has: (name) => jar.has(name),
    forget: (name) => jar.delete(name),
    async send(method, path, body) {
      const res = await req(method, path, body, ip, this.cookies());
      for (const line of res.setCookie) {
        const [pair] = line.split(';');
        const i = pair.indexOf('=');
        if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
      return res;
    },
  };
}

let pass = 0, fail = 0;
const t = (name, ok, detail = '') => {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  BUG  ' + name + (detail ? '\n       ' + detail : '')); }
};

(async () => {
  const S = process.env.QA_TAG || String(process.hrtime.bigint()).slice(-9);
  const idToken = `dev:resume_${S}`;

  console.log(`\n--- one student, two browsers, ${UNI} ---`);

  // ---------------------------------------------------------------- phone --
  const phone = device('198.51.90.11');
  const inA = await phone.send('POST', '/api/auth/firebase', { idToken, fingerprint: `fpa${S}` });
  t('she signs in on her phone', inA.code === 200, `${inA.code} ${inA.raw.slice(0, 120)}`);
  await phone.send('POST', '/api/student/profile', { fullName: 'Resume QA', whatsappNumber: '9810000042' });

  const madeA = await phone.send('POST', '/api/session/create', { institution: UNI, mode: 'test' });
  const firstId = madeA.json?.data?.sessionId;
  t('and starts an interview', madeA.code === 200 && Boolean(firstId), `${madeA.code} ${madeA.raw.slice(0, 160)}`);
  t('the phone was given an owner cookie', phone.has('precas_uid'));

  const openA = await phone.send('GET', `/api/session/${firstId}`);
  t('she can open it on the phone', openA.code === 200, `${openA.code} ${openA.raw.slice(0, 140)}`);

  // ------------------------------------------------------------ her laptop --
  // The same student, a browser that has never seen precas_uid. This is also
  // exactly what "I cleared my browsing data" looks like to the server.
  const laptop = device('198.51.90.12');
  const inB = await laptop.send('POST', '/api/auth/firebase', { idToken, fingerprint: `fpb${S}` });
  t('she signs in again on her laptop', inB.code === 200, `${inB.code} ${inB.raw.slice(0, 120)}`);
  t('the laptop starts with no owner cookie, as a new browser does', !laptop.has('precas_uid'));

  const madeB = await laptop.send('POST', '/api/session/create', { institution: UNI, mode: 'test' });
  const secondId = madeB.json?.data?.sessionId;
  t('tapping the university answers with a session id', madeB.code === 200 && Boolean(secondId), `${madeB.code} ${madeB.raw.slice(0, 200)}`);

  // THE DEFECT. Everything above is correct behaviour; this is the line that
  // strands her, and the two after it are the loop she cannot leave.
  const openB = await laptop.send('GET', `/api/session/${secondId}`);
  t('SHE CAN OPEN THE INTERVIEW THE SERVER JUST GAVE HER',
    openB.code === 200,
    `${openB.code} ${openB.raw.slice(0, 160)}\n       ` +
    `create returned ${secondId === firstId ? 'the sitting from her phone' : 'a new sitting'}, ` +
    `and the laptop ${laptop.has('precas_uid') ? 'does' : 'does NOT'} hold an owner cookie`);

  // "Start a new interview" sends her to the catalogue; tapping again must not
  // hand back the same unopenable id a second time.
  const madeC = await laptop.send('POST', '/api/session/create', { institution: UNI, mode: 'test' });
  const thirdId = madeC.json?.data?.sessionId;
  const openC = await laptop.send('GET', `/api/session/${thirdId}`);
  t('pressing "Start a new interview" and tapping again gets her IN, not the same dead end',
    openC.code === 200,
    `${openC.code}; third id ${thirdId === secondId ? 'is the SAME as the one that just failed' : 'is different'}`);

  // And the guard it must not break: a stranger holding the id still gets 404.
  const stranger = device('198.51.90.13');
  await stranger.send('POST', '/api/auth/firebase', { idToken: `dev:stranger_${S}`, fingerprint: `fpc${S}` });
  const peek = await stranger.send('GET', `/api/session/${firstId}`);
  t('a different student holding the id is still refused', peek.code === 404, `${peek.code}`);

  // Nor may the rescue quietly spend a second credit.
  t('and no extra sitting was invented behind her back',
    [firstId, secondId, thirdId].filter(Boolean).length === 3 && new Set([firstId, secondId, thirdId]).size <= 2,
    `ids: ${firstId} / ${secondId} / ${thirdId}`);

  console.log(`\n  ${pass} passed, ${fail} bugs\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
