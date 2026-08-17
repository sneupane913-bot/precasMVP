/**
 * Provider-order contract for the real speech-to-text path.
 *
 * This suite never spends provider credit. It replaces fetch, drives the
 * exported transcribe function, and checks the exact requests the app would
 * make when both keys are present and when the primary provider fails.
 *
 * Run: node --experimental-strip-types --no-warnings qa/stt-provider-check.mjs
 */
import { transcribe } from '../lib/ai/stt.ts';

const originalFetch = globalThis.fetch;
const originalDeepgram = process.env.DEEPGRAM_API_KEY;
const originalGroq = process.env.GROQ_API_KEY;
const originalNodeEnv = process.env.NODE_ENV;

let passed = 0;
let failed = 0;

function check(id, message, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${id.padEnd(7)} ${message}`);
    return;
  }
  failed += 1;
  console.log(`  FAIL  ${id.padEnd(7)} ${message}${detail ? `\n          ${detail}` : ''}`);
}

const deepgramOk = {
  ok: true,
  json: async () => ({
    results: {
      channels: [{ alternatives: [{ transcript: 'I chose this university for my course.', confidence: 0.96 }] }],
    },
  }),
};

const groqOk = {
  ok: true,
  json: async () => ({ text: 'I chose this university for my course.' }),
};

function restoreEnvironment() {
  if (originalDeepgram === undefined) delete process.env.DEEPGRAM_API_KEY;
  else process.env.DEEPGRAM_API_KEY = originalDeepgram;
  if (originalGroq === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroq;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  globalThis.fetch = originalFetch;
}

try {
  process.env.NODE_ENV = 'production';
  process.env.DEEPGRAM_API_KEY = 'deepgram-test-key';
  process.env.GROQ_API_KEY = 'groq-test-key';

  // --------------------------------------------------------------- STT-1
  const primaryCalls = [];
  globalThis.fetch = async (url) => {
    primaryCalls.push(String(url));
    return String(url).includes('deepgram.com') ? deepgramOk : groqOk;
  };
  const primary = await transcribe(new ArrayBuffer(4096), 'audio/webm', 10);
  check(
    'STT-1',
    'Deepgram is called first when both keys exist',
    primaryCalls.length === 1 && primaryCalls[0]?.includes('deepgram.com') && primary.provider === 'deepgram',
    `calls=${primaryCalls.join(' -> ') || 'none'}, provider=${primary.provider}`
  );

  // --------------------------------------------------------------- STT-2
  const fallbackCalls = [];
  let groqFields = [];
  globalThis.fetch = async (url, init = {}) => {
    fallbackCalls.push(String(url));
    if (String(url).includes('deepgram.com')) return { ok: false, json: async () => ({}) };
    if (init.body instanceof FormData) groqFields = [...init.body.keys()];
    return groqOk;
  };
  const fallback = await transcribe(new ArrayBuffer(4096), 'audio/webm', 10);
  check(
    'STT-2',
    'Groq is used only after Deepgram fails',
    fallbackCalls.length === 2 &&
      fallbackCalls[0]?.includes('deepgram.com') &&
      fallbackCalls[1]?.includes('groq.com') &&
      fallback.provider === 'groq',
    `calls=${fallbackCalls.join(' -> ') || 'none'}, provider=${fallback.provider}`
  );

  // --------------------------------------------------------------- STT-3
  const silenceCalls = [];
  globalThis.fetch = async (url) => {
    silenceCalls.push(String(url));
    return {
      ok: true,
      json: async () => ({ results: { channels: [{ alternatives: [{ transcript: '', confidence: 0 }] }] } }),
    };
  };
  const silence = await transcribe(new ArrayBuffer(4096), 'audio/webm', 10);
  check(
    'STT-3',
    'A valid silence result is not charged to the fallback too',
    silenceCalls.length === 1 && silenceCalls[0]?.includes('deepgram.com') && silence.status === 'silent',
    `calls=${silenceCalls.join(' -> ') || 'none'}, status=${silence.status}`
  );

  // --------------------------------------------------------------- STT-4
  check(
    'STT-4',
    'Groq receives no conditioning prompt that can leak into the transcript',
    fallbackCalls.some((url) => url.includes('groq.com')) && !groqFields.includes('prompt'),
    `Groq form fields: ${groqFields.join(', ') || 'none'}`
  );
} finally {
  restoreEnvironment();
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
