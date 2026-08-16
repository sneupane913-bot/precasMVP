import type { TranscriptStatus } from '@/lib/types';

export interface TranscriptionResult {
  status: TranscriptStatus;
  transcript: string;
  confidence: number;
  wordCount: number;
  provider: 'groq' | 'deepgram' | 'mock';
  /**
   * True when we clearly caught less than the student said.
   *
   * The client's point, and it is the single most important thing about serving
   * Nepali students: many of them speak English hesitantly, quietly, or with an
   * accent the model handles poorly. Some of what they say will not be picked
   * up. That is OUR limitation, not theirs, and a product that responds to it
   * by grading them on the fragment it heard is telling them their English is
   * worse than it is.
   *
   * So we detect it, we say so plainly in our own name, and we still give them
   * whatever useful feedback the part we did hear supports.
   */
  partial: boolean;
  /** Words per second we captured. Roughly 2 to 3 is ordinary speech. */
  wordsPerSecond: number;
}

/**
 * Below this, we clearly missed a lot.
 *
 * Ordinary conversational speech is about 2 to 3 words a second, and a nervous
 * student reading carefully still manages well over 1. Under 0.8 for a recording
 * of real length means the words were said and we did not get them.
 *
 * Deliberately generous. A false "we missed some of that" costs a sentence of
 * honesty; a false silence costs a student their confidence.
 */
const MIN_WORDS_PER_SECOND = 0.8;
/** Too short to judge coverage at all. Two words in two seconds is fine. */
const MIN_DURATION_FOR_COVERAGE = 8;

function coverage(
  wordCount: number,
  durationSeconds: number
): { partial: boolean; wordsPerSecond: number } {
  const wps = durationSeconds > 0 ? wordCount / durationSeconds : 0;
  if (durationSeconds < MIN_DURATION_FOR_COVERAGE) return { partial: false, wordsPerSecond: wps };
  return { partial: wps < MIN_WORDS_PER_SECOND, wordsPerSecond: wps };
}

/** Below this, we treat the answer as unusable and refuse to score it. */
const MIN_WORDS = 5;

/**
 * Speech to text.
 *
 * Deepgram Nova-3 in BATCH mode. Batch is $0.0043/min against $0.0077/min for
 * streaming, a 78% saving on the single largest cost line in the product.
 * Do not switch this to streaming without re-running docs/UNIT_ECONOMICS.md.
 */
export async function transcribe(
  audio: ArrayBuffer,
  mimeType: string,
  durationSeconds = 0
): Promise<TranscriptionResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const deepgramKey = process.env.DEEPGRAM_API_KEY;

  /**
   * Two providers, and a REAL fallback between them.
   *
   * This used to be "use Groq if the key exists, otherwise Deepgram", with no
   * path from one to the other. So a Groq outage, or simply hitting the free
   * tier's 7,200 audio-seconds-per-hour ceiling during a busy evening, meant
   * the student got nothing at all even when a perfectly good Deepgram key was
   * sitting in the environment unused.
   *
   * That is the single-supplier risk the client named: Groq's paid Developer
   * tier is currently closed to new upgrades, so the cheap provider is one he
   * cannot pay and therefore cannot lean on alone.
   *
   * Now: try Groq, and if it comes back failed for any reason, try Deepgram
   * before giving up. Set both keys and neither provider can take the product
   * down on its own. Silence and too-short answers are NOT failures and are
   * returned as they are, because retrying a quiet recording on a second paid
   * provider would just spend money to reach the same honest answer.
   */
  if (groqKey) {
    const first = await transcribeGroq(audio, mimeType, groqKey, durationSeconds);
    if (first.status !== 'failed' || !deepgramKey) return first;
    return transcribeDeepgram(audio, mimeType, deepgramKey, durationSeconds);
  }
  if (deepgramKey) return transcribeDeepgram(audio, mimeType, deepgramKey, durationSeconds);

  if (process.env.NODE_ENV === 'production') {
    // Never silently fake a transcript in production. Fail loudly.
    return {
      status: 'failed', transcript: '', confidence: 0, wordCount: 0, provider: 'mock',
      partial: false, wordsPerSecond: 0,
    };
  }
  return mockTranscribe(audio, durationSeconds);
}

/**
 * Groq, running Whisper Large v3. Our default.
 *
 * $0.111 per hour against Deepgram's $0.258, so it more than halves our single
 * largest cost line. The price is verified.
 *
 * NOT VERIFIED: that Whisper is more accurate than Deepgram on Nepali-accented
 * English. That was asserted without evidence and QA was right to challenge it.
 * It must be benchmarked on real Nepali student audio, on a real mid-range
 * Android and an iPhone, before it is treated as a quality decision rather
 * than purely a cost decision. Deepgram remains one environment variable away.
 *
 * We deliberately do NOT use whisper-large-v3-turbo at $0.04/hr. The saving is
 * about four rupees per interview and it is less accurate. Mis-hearing a
 * nervous student is not worth four rupees.
 */
async function transcribeGroq(
  audio: ArrayBuffer,
  mimeType: string,
  key: string,
  durationSeconds = 0
): Promise<TranscriptionResult> {
  try {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mimeType }), 'answer.webm');
    form.append('model', 'whisper-large-v3');
    form.append('language', 'en');
    form.append('response_format', 'verbose_json');
    // Nudges Whisper toward the vocabulary of this exam rather than guessing.
    form.append(
      'prompt',
      'A Nepali student answering a UK university pre-CAS credibility interview about their course, university, tuition fees, sponsor, accommodation and career plans.'
    );

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      return { status: 'failed', transcript: '', confidence: 0, wordCount: 0, provider: 'groq', partial: false, wordsPerSecond: 0 };
    }

    const json = (await res.json()) as GroqResponse;
    const transcript = stripHallucinatedTail((json.text ?? '').trim());
    const wordCount = transcript ? transcript.split(/\s+/).length : 0;

    // Whisper hallucinates stock phrases on silence. Catch the common ones.
    if (isWhisperHallucination(transcript)) {
      return { status: 'silent', transcript: '', confidence: 0, wordCount: 0, provider: 'groq', partial: false, wordsPerSecond: 0 };
    }

    return { ...classify(transcript, wordCount), ...coverage(wordCount, durationSeconds), confidence: 0.9, provider: 'groq' };
  } catch {
    return { status: 'failed', transcript: '', confidence: 0, wordCount: 0, provider: 'groq', partial: false, wordsPerSecond: 0 };
  }
}

/**
 * D-36. FOUND IN THE FIRST REAL INTERVIEW EVER SAT ON THIS PRODUCT.
 *
 * The client spoke a clean 45-second introduction. Whisper transcribed all of
 * it correctly, then appended "NEPALI STUDENT ASKING A QUESTION", which he
 * never said. It then appeared on the results page under the heading
 * "WHAT YOU SAID".
 *
 * That is not a random hallucination. It is OUR OWN `prompt` parameter, the
 * vocabulary hint sent on line 133, bleeding back into the output. Whisper is
 * documented to do this when the audio ends in silence: with nothing left to
 * transcribe it falls back on the conditioning text.
 *
 * Putting words in a student's mouth is the one thing this product must never
 * do, and it is exactly what we criticise the competitor for. So the tail is
 * removed whenever it looks like our prompt rather than like speech.
 *
 * Detection is deliberately conservative, because deleting something a student
 * ACTUALLY said is a worse failure than leaving an artefact in. A trailing
 * fragment is only dropped when it is both short and shouted in capitals, or
 * when it repeats the distinctive words of our own hint.
 */
const PROMPT_WORDS = new Set(
  'nepali student answering uk university precas cas credibility interview about their course tuition fees sponsor accommodation career plans'.split(
    ' '
  )
);

export function stripHallucinatedTail(text: string): string {
  if (!text) return text;

  // Split on sentence ends but keep the punctuation with each piece.
  const parts = text.match(/[^.!?]+[.!?]*/g);
  if (!parts || parts.length < 2) return text;

  let out = [...parts];

  // Only ever consider the LAST fragment. Bleed happens at the end, where the
  // silence is. Mid-answer text is real speech and is never touched.
  for (let guard = 0; guard < 2 && out.length > 1; guard++) {
    const tail = out[out.length - 1].trim();
    const words = tail.replace(/[^A-Za-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) break;

    /**
     * Two different limits, and the first version got this wrong.
     *
     * The first attempt capped BOTH checks at 10 words, so it caught the short
     * shouted form but sailed straight past the full sentence: "NEPALI student
     * answering a UK university pre-CAS credibility interview about their
     * course, university, tuition fees, sponsor, accommodation and career
     * plans." That is 24 words, it is our prompt almost verbatim, and it
     * reached the student's report under the heading "WHAT YOU SAID".
     *
     * A shouted fragment is only suspicious when it is SHORT, because a long
     * capitalised passage is more likely something odd the student really said.
     * A prompt echo is recognised by its words, not its length, so it gets the
     * longer allowance.
     */
    const lettersOnly = tail.replace(/[^A-Za-z]/g, '');
    const shouted =
      words.length <= 10 && lettersOnly.length > 3 && lettersOnly === lettersOnly.toUpperCase();
    const fromOurPrompt =
      words.length <= 40 &&
      words.filter((w) => PROMPT_WORDS.has(w.toLowerCase())).length / words.length >= 0.6;

    if (shouted || fromOurPrompt) {
      out = out.slice(0, -1);
      continue;
    }
    break;
  }

  return out.join('').trim();
}

/**
 * Whisper invents text when given silence, almost always from a small set of
 * stock phrases learned from subtitle training data. Left unchecked this would
 * put words in a student's mouth, which is the one thing this product must
 * never do.
 */
function isWhisperHallucination(text: string): boolean {
  const t = text.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  if (!t) return true;
  const stock = [
    'thank you',
    'thanks for watching',
    'thank you for watching',
    'you',
    'bye',
    'subtitles by the amaracom community',
    'please subscribe',
    'transcription by castingwordscom',
    'copyright',
  ];
  return stock.some((s) => t === s || (t.length < 30 && t.includes(s)));
}

/** Kept as a drop-in fallback. Set DEEPGRAM_API_KEY and leave GROQ_API_KEY empty. */
async function transcribeDeepgram(
  audio: ArrayBuffer,
  mimeType: string,
  key: string,
  durationSeconds = 0
): Promise<TranscriptionResult> {
  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'en',
    smart_format: 'true',
    punctuate: 'true',
    filler_words: 'true',
  });

  try {
    const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': mimeType },
      body: audio,
    });
    if (!res.ok) {
      return { status: 'failed', transcript: '', confidence: 0, wordCount: 0, provider: 'deepgram', partial: false, wordsPerSecond: 0 };
    }
    const json = (await res.json()) as DeepgramResponse;
    const alt = json.results?.channels?.[0]?.alternatives?.[0];
    const transcript = (alt?.transcript ?? '').trim();
    const wordCount = transcript ? transcript.split(/\s+/).length : 0;
    return {
      ...classify(transcript, wordCount),
      ...coverage(wordCount, durationSeconds),
      confidence: alt?.confidence ?? 0,
      provider: 'deepgram',
    };
  } catch {
    return { status: 'failed', transcript: '', confidence: 0, wordCount: 0, provider: 'deepgram', partial: false, wordsPerSecond: 0 };
  }
}

function classify(
  transcript: string,
  wordCount: number
): { status: TranscriptStatus; transcript: string; wordCount: number } {
  if (wordCount === 0) return { status: 'silent', transcript: '', wordCount: 0 };
  if (wordCount < MIN_WORDS) return { status: 'too_short', transcript, wordCount };
  return { status: 'ok', transcript, wordCount };
}

/**
 * Development-only stand-in. Deterministic on audio length so that a short
 * recording behaves like a short recording, which lets the retry path be
 * exercised without a Deepgram key. It cannot reproduce real accent failures,
 * so QA must sign off the feedback quality audit against a real key.
 */
function mockTranscribe(audio: ArrayBuffer, durationSeconds = 0): TranscriptionResult {
  const kb = audio.byteLength / 1024;
  if (kb < 8) {
    return { status: 'silent', transcript: '', confidence: 0, wordCount: 0, provider: 'mock', partial: false, wordsPerSecond: 0 };
  }
  if (kb < 20) {
    return {
      status: 'too_short',
      transcript: 'Yes sir.',
      confidence: 0.6,
      wordCount: 2,
      provider: 'mock',
      ...coverage(2, durationSeconds),
    };
  }
  const transcript =
    DEMO_TRANSCRIPT_MARKER +
    ' Um, my name is Sujan Neupane and I am from Butwal in ' +
    'Nepal. I completed my bachelor degree in business administration in 2023 from ' +
    'Tribhuvan University. After that I worked for about two years in a trading company ' +
    'as a sales officer. I have applied for the MSc Management course because I want to ' +
    'move into a management role when I go back to Nepal.';
  const words = transcript.split(/\s+/).length;
  return {
    status: 'ok',
    transcript,
    confidence: 0.91,
    wordCount: words,
    provider: 'mock',
    ...coverage(words, durationSeconds),
  };
}

interface GroqResponse {
  text?: string;
}

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string; confidence?: number }>;
    }>;
  };
}

/**
 * Strip obvious sensitive numbers before anything is stored or sent to a model.
 * Deliberately conservative: it is better to redact a course code than to store
 * a passport number.
 */
/**
 * True when no Deepgram key is configured, so transcripts are sample text and
 * NOT the student's words. This must be surfaced loudly in the UI. Presenting
 * invented text as a student's own answer is the exact failure we criticise the
 * competitor for, and it is not excused by being a development convenience.
 */
export function sttIsMocked(): boolean {
  return !process.env.GROQ_API_KEY && !process.env.DEEPGRAM_API_KEY;
}

/**
 * The marker every mock transcript carries.
 *
 * Exported because the SUMMARY has to be able to recognise it. Without that,
 * demo text walks straight past the "no transcript, no score" guard in the
 * answer route: that guard only fires when `stt.status !== 'ok'`, and the mock
 * provider returns `ok`. The result was a report telling a student their
 * English clarity was 75% based on a paragraph they never said.
 *
 * Deliberately matched on the STORED TRANSCRIPT rather than on
 * `sttIsMocked()`, so a session sat in demo mode still reports honestly after
 * a real key is added later. What was demo stays demo.
 */
export const DEMO_TRANSCRIPT_MARKER = '[DEMO TEXT, NOT YOUR VOICE]';

/** True when this answer's words came from the mock provider, not the student. */
export function isDemoTranscript(text: string | null | undefined): boolean {
  return typeof text === 'string' && text.startsWith(DEMO_TRANSCRIPT_MARKER);
}

export function redact(text: string): string {
  return text
    .replace(/\b[A-Z]{1,2}\d{6,9}\b/g, '[document number removed]')
    .replace(/\b\d{9,18}\b/g, '[account number removed]')
    .replace(/\b(?:\+?977[-\s]?)?9[678]\d{8}\b/g, '[phone number removed]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, '[email removed]');
}
