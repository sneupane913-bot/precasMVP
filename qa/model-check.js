/**
 * THE 13 AUGUST MODEL — Part 12 of RULES.md.
 *
 * Written before the code, so the first run tells us what is genuinely missing
 * rather than confirming what we happened to build. Failures here are the
 * work list.
 */
const http = require('http');
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
  t('N-29', 'The question bank cites where its questions come from',
    /source|citation|researched|https?:\/\//i.test(qfile),
    /source|https?:\/\//i.test(qfile) ? 'sources present' : 'NO SOURCES — cannot claim these are what universities ask');

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

  const own = process.env.OWNER_KEY || 'owner-dev';
  const on = await req('POST', '/api/platform', { action: 'setMaintenance', ownerKey: own, enabled: true, contactName: 'Umanga', contactPhone: '9800000000' });
  const paths = ['/api/me', '/api/account', '/api/payment', '/api/session/create'];
  const codes = [];
  for (const p of paths) codes.push((await req(p === '/api/me' || p === '/api/account' ? 'GET' : 'POST', p, p.includes('payment') ? { action: 'status', orderId: 'x' } : {}, { ip: a.ip, cookie: a.jar })).code);
  t('N-41', 'While closed, every student API refuses', codes.every((c) => c === 503),
    `${paths.join(' ')} -> ${codes.join(', ')}`);
  const superWhileDown = await req('POST', '/api/super', { action: 'overview', superKey: 'super-dev' });
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

  const dev = await req('POST', '/api/super', { action: 'flaggedTrials', superKey: 'super-dev' });
  t('N-17', 'Devices running many Google accounts reach a human queue',
    dev.json?.ok === true, `queue reachable, ${Array.isArray(dev.json?.data) ? dev.json.data.length : '?'} entries`);

  console.log('\n=== SEATS (N-1) ===\n');

  const SU = 'super-dev';
  const cs = `n1-${S}`;
  const mk = await req('POST', '/api/platform',
    { action: 'createConsultancy', superKey: SU, name: cs, slug: cs, seatsTotal: 20, paidNpr: 6000, passcode: 'n1pass123' });
  // 20, not 5: this block signs up seven students and an earlier version ran
  // the consultancy out of seats halfway through, so seat10 came back as the
  // bare trial and looked like a broken seat size. It was a broken test.
  await req('POST', '/api/platform',
    { action: 'setConsultancyStatus', superKey: SU, consultancyId: mk.json?.data?.id, status: 'approved' });

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
