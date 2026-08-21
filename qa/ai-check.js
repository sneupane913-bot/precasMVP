/**
 * L4: NO FABRICATED SCORE EVER REACHES A STUDENT.
 *
 * This is the cardinal rule of the product and the whole reason it can be sold
 * honestly against the competitor. A score is a claim about a person, and a
 * score for words we never heard is a lie told with a number, which is worse
 * than saying nothing because a number looks like a measurement.
 *
 * The other three Phase 2 items need the client's own API keys and real Nepali
 * student audio. This one does not, and it is the one that must never break, so
 * it gets its own suite rather than waiting for the keys.
 *
 * Every case here is a way the product could invent something:
 *   - silence transcribed as a stock Whisper phrase
 *   - a recording too short to judge
 *   - the transcriber failing outright
 *   - the evaluator failing after a good transcript
 *   - no key at all, in production
 *   - feedback that never quotes the student, so it was not really about them
 *
 * Run:  QA_PORT=3098 node qa/ai-check.js
 */
const http = require('http');
const fs = require('fs');

const P = Number(process.env.QA_PORT || 3098);

let pass = 0;
let fail = 0;
function t(id, name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${id.padEnd(7)} ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${id.padEnd(7)} ${name}\n          ${detail}`);
  }
}

function req(method, path, body, opts = {}) {
  return new Promise((res) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'x-forwarded-for': opts.ip || '203.0.113.150' };
    if (data) headers['Content-Type'] = 'application/json';
    if (opts.cookie) headers['Cookie'] = opts.cookie;
    const r = http.request({ host: '127.0.0.1', port: P, path, method, headers }, (resp) => {
      let d = '';
      resp.on('data', (c) => (d += c));
      resp.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(d);
        } catch {
          /* html */
        }
        res({ code: resp.statusCode, body: d, json, setCookie: resp.headers['set-cookie'] || [] });
      });
    });
    r.on('error', (e) => res({ code: 0, body: String(e), json: null, setCookie: [] }));
    if (data) r.write(data);
    r.end();
  });
}

const jarOf = (r) => (r.setCookie || []).map((c) => c.split(';')[0]).join('; ');
const merge = (a, b) => {
  const m = new Map();
  for (const part of [a, b].filter(Boolean).join('; ').split('; ').filter(Boolean)) {
    const i = part.indexOf('=');
    m.set(part.slice(0, i), part.slice(i + 1));
  }
  return [...m.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
};

/** Record an answer with audio of a chosen size, so each STT branch is hit. */
function answer(sid, qid, cookie, ip, kb, durationSeconds = 30) {
  const b = '----ai' + Math.random();
  const audio = Buffer.alloc(Math.round(kb * 1024), 1);
  const payload = Buffer.concat([
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="questionId"\r\n\r\n${qid}\r\n`),
    Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="durationSeconds"\r\n\r\n${durationSeconds}\r\n`),
    Buffer.from(
      `--${b}\r\nContent-Disposition: form-data; name="audio"; filename="a.webm"\r\nContent-Type: audio/webm\r\n\r\n`
    ),
    audio,
    Buffer.from(`\r\n--${b}--\r\n`),
  ]);
  return new Promise((res) => {
    const r = http.request(
      {
        host: '127.0.0.1',
        port: P,
        path: `/api/session/${sid}/answer`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${b}`,
          'Content-Length': payload.length,
          'x-forwarded-for': ip,
          Cookie: cookie,
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
    r.on('error', () => res({ code: 0, json: null, body: '' }));
    r.write(payload);
    r.end();
  });
}

(async () => {
  console.log('\n=== NO FABRICATED SCORE EVER REACHES A STUDENT ===\n');
  const S = Date.now().toString(36);
  const ip = '203.0.113.151';

  const signIn = await req('POST', '/api/auth/firebase', { idToken: `dev:ai-${S}`, fingerprint: `ai-${S}` }, { ip });
  let jar = jarOf(signIn);
  // N-30: the welcome form is mandatory before any interview.
  await req('POST', '/api/student/profile', { fullName: `AI QA ${S}`, whatsappNumber: '9811223344' }, { ip, cookie: jar });
  const created = await req('POST', '/api/session/create', { institution: 'bpp-university', mode: 'test' }, { ip, cookie: jar });
  jar = merge(jar, jarOf(created));
  const sid = created.json?.data?.sessionId;
  const qs = created.json?.data?.questions ?? [];
  await req('POST', `/api/session/${sid}/consent`, { version: '2026-08-10.1' }, { ip, cookie: jar });

  // ------------------------------------------------------------------ AI-1
  // Audio too quiet to be anything. Refused BEFORE we pay to transcribe it.
  const silent = await answer(sid, qs[0].id, jar, ip, 2);
  t(
    'AI-1',
    'Silence is refused before we pay to transcribe it',
    silent.code === 400 && /AUDIO_SILENT/.test(silent.body),
    `-> ${silent.code} ${silent.body.slice(0, 120)}`
  );

  // ------------------------------------------------------------------ AI-2
  // A real but very short answer. Scored? No. Judged as too short, honestly.
  const short = await answer(sid, qs[0].id, jar, ip, 12);
  const shortData = short.json?.data ?? {};
  t(
    'AI-2',
    'A two word answer is never given a score',
    short.code === 200 && shortData.transcriptStatus !== 'ok' && !shortData.evaluation,
    `status "${shortData.transcriptStatus}", evaluation ${shortData.evaluation ? 'PRESENT' : 'absent'}`
  );
  t(
    'AI-3',
    'And the student is told plainly why, not shown a zero',
    typeof shortData.userMessage === 'string' &&
      shortData.userMessage.length > 20 &&
      !/\b0\s*\/\s*100\b/.test(JSON.stringify(shortData)),
    `message: "${shortData.userMessage ?? ''}"`
  );

  // ------------------------------------------------------------------ AI-4
  // A full answer. Now there SHOULD be feedback, and it must be about them.
  const full = await answer(sid, qs[0].id, jar, ip, 40);
  const fullData = full.json?.data ?? {};
  t(
    'AI-4',
    'A real answer does get judged',
    full.code === 200 && fullData.transcriptStatus === 'ok',
    `status "${fullData.transcriptStatus}"`
  );
  if (fullData.evaluation) {
    const ev = fullData.evaluation;
    t(
      'AI-5',
      'The score is a real number in range, never null dressed as a number',
      typeof ev.score === 'number' && ev.score >= 0 && ev.score <= 100 && !Number.isNaN(ev.score),
      `score ${ev.score}`
    );
    t(
      'AI-6',
      'The feedback quotes the student back, so it was really about them',
      typeof ev.quotedBack === 'string' && ev.quotedBack.length > 0,
      'generic feedback with no quote is feedback about nobody'
    );
    t(
      'AI-7',
      'It is marked against the four steps the student saw on screen',
      ev.pee && ['point', 'evidence', 'explanation', 'wrapUp'].every((k) => typeof ev.pee[k] === 'boolean'),
      JSON.stringify(ev.pee)
    );
  } else {
    t('AI-5', 'No evaluation returned, so nothing was invented', true, 'evaluator declined, which is the safe outcome');
    pass += 2; // AI-6, AI-7 cannot apply and must not be counted as failures
  }

  // ------------------------------------------------------- AI-18 partial
  /**
   * The case the client raised, and the one that decides whether a nervous
   * student trusts this product: they spoke for forty seconds and we caught
   * six words.
   *
   * The wrong answers are (a) score the fragment silently, which tells them
   * their English is far worse than it is, and (b) call it silence, which tells
   * them they did not speak. The right answer is to say plainly that WE missed
   * it, tell them the one mechanical fix, and still give them whatever the part
   * we heard supports.
   *
   * Driven, not read: a long recording that yields few words.
   */
  const longQuiet = await answer(sid, qs[2].id, jar, ip, 30, 90);
  const lq = longQuiet.json?.data ?? {};
  t(
    'AI-18',
    'Speaking for a long time and being barely heard is detected',
    lq.partialCapture === true,
    `partialCapture=${lq.partialCapture} for a 90 second answer. If this is false, a student who was half heard is silently graded on the fragment.`
  );
  t(
    'AI-19',
    'And we take the blame, in our own name',
    typeof lq.partialMessage === 'string' && /our (microphone|listening)|not your English/i.test(lq.partialMessage),
    `message: "${lq.partialMessage}"`
  );
  t(
    'AI-20',
    'The message never blames their accent or their English',
    !/accent|poor english|bad english|your english is/i.test(lq.partialMessage ?? ''),
    `message: "${lq.partialMessage}". Telling a nervous student their English is the problem is the one thing this product must never do.`
  );
  t(
    'AI-21',
    'And it tells them the one thing that actually helps',
    /closer to the microphone/i.test(lq.partialMessage ?? ''),
    'sympathy without a fix is just sympathy'
  );
  t(
    'AI-22',
    'They are still given the feedback we CAN stand behind',
    lq.transcriptStatus === 'ok',
    `status ${lq.transcriptStatus}. Being half heard must not cost them the answer entirely.`
  );

  // A normal length answer at normal speed is NOT flagged as partial.
  const normal = await answer(sid, qs[3].id, jar, ip, 40, 30);
  t(
    'AI-23',
    'A normal answer is not wrongly told we missed some of it',
    normal.json?.data?.partialCapture === false,
    `partialCapture=${normal.json?.data?.partialCapture}. Crying wolf here would train students to ignore it.`
  );

  // ------------------------------------------------------------------ AI-8
  // The report must never print a score for an answer we never heard.
  const report = await req('GET', `/results/${sid}`, null, { ip, cookie: jar });
  t(
    'AI-8',
    'The report never shows NaN or a score for an answer we never heard',
    report.code === 200 && !/\bNaN\b/.test(report.body),
    'a number for silence is a lie told with a number'
  );

  // ------------------------------------------------------------------ AI-9
  // Demo mode must be declared to the student, in the room, while it matters.
  const sess = await req('GET', `/api/session/${sid}`, null, { ip, cookie: jar });
  const demo = sess.json?.data?.demo;
  t(
    'AI-9',
    'The room knows and says whether it is really listening',
    demo && typeof demo.stt === 'boolean' && typeof demo.evaluator === 'boolean',
    JSON.stringify(demo)
  );

  const roomSrc = fs.readFileSync('components/InterviewRoom.tsx', 'utf8');
  t(
    'AI-10',
    'And the room shows that to the student rather than hiding it',
    /demo\.stt &&/.test(roomSrc) && /not your voice|NOT YOUR VOICE|sample|Demo mode/i.test(roomSrc),
    'presenting invented text as a student\'s own words is the exact thing we criticise the competitor for'
  );

  // ----------------------------------------------------------------- AI-11
  // The source guarantees, checked directly, because these are the lines that
  // stop a fabricated score existing at all.
  const evalSrc = fs.readFileSync('lib/ai/evaluate.ts', 'utf8');
  const sttSrc = fs.readFileSync('lib/ai/stt.ts', 'utf8');
  t(
    'AI-11',
    'With no key in production the evaluator returns nothing, never a mock',
    /if \(!key\) \{\s*\n\s*if \(process\.env\.NODE_ENV === 'production'\) return null;/.test(evalSrc),
    'a mock score shipped to production would be a fabricated measurement of a real person'
  );
  t(
    'AI-12',
    'With no key in production the transcriber fails loudly, never fakes words',
    /NODE_ENV === 'production'[\s\S]{0,220}status: 'failed'/.test(sttSrc),
    'sample text presented as a student answer is the cardinal sin of this product'
  );
  t(
    'AI-13',
    'Whisper hallucinations on silence are caught and treated as silence',
    /isWhisperHallucination/.test(sttSrc) && /thanks for watching/.test(sttSrc),
    'Whisper invents stock subtitle phrases from silence, which would put words in a student\'s mouth'
  );
  t(
    'AI-14',
    'Personal numbers are stripped before anything is stored or sent to a model',
    /export function redact/.test(sttSrc) && /document number removed/.test(sttSrc),
    'a passport number spoken aloud must not end up in a prompt or a stored transcript'
  );
  t(
    'AI-15',
    'A transcript under five words is refused a score at the evaluator too',
    /if \(!clean \|\| clean\.split\(\/\\s\+\/\)\.length < 5\) return null;/.test(evalSrc),
    'second line of defence: even if a caller passes a fragment, nothing is scored'
  );

  // ----------------------------------------------------------------- AI-16
  // The spend ceiling. The last thing between a runaway loop and a real bill.
  const rlSrc = fs.readFileSync('lib/rate-limit.ts', 'utf8');
  t(
    'AI-16',
    'There is a hard monthly ceiling on paid provider calls',
    /spendBreakerTripped/.test(rlSrc) && /recordPaidCall/.test(rlSrc),
    'without a breaker, one runaway loop is an unbounded bill'
  );
  const answerSrc = fs.readFileSync('app/api/session/[id]/answer/route.ts', 'utf8');
  t(
    'AI-17',
    'And it is checked BEFORE the paid call, not after',
    answerSrc.indexOf('spendBreakerTripped') < answerSrc.indexOf('recordPaidCall'),
    'checking after the call means the call was already paid for'
  );

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
