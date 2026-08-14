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

  if (groqKey) return transcribeGroq(audio, mimeType, groqKey, durationSeconds);
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
    const transcript = (json.text ?? '').trim();
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
    '[DEMO TEXT, NOT YOUR VOICE] Um, my name is Sujan Neupane and I am from Butwal in ' +
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

export function redact(text: string): string {
  return text
    .replace(/\b[A-Z]{1,2}\d{6,9}\b/g, '[document number removed]')
    .replace(/\b\d{9,18}\b/g, '[account number removed]')
    .replace(/\b(?:\+?977[-\s]?)?9[678]\d{8}\b/g, '[phone number removed]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, '[email removed]');
}
