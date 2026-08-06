import type { TranscriptStatus } from '@/lib/types';

export interface TranscriptionResult {
  status: TranscriptStatus;
  transcript: string;
  confidence: number;
  wordCount: number;
  provider: 'deepgram' | 'mock';
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
  mimeType: string
): Promise<TranscriptionResult> {
  const key = process.env.DEEPGRAM_API_KEY;

  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      // Never silently fake a transcript in production. Fail loudly.
      return { status: 'failed', transcript: '', confidence: 0, wordCount: 0, provider: 'mock' };
    }
    return mockTranscribe(audio);
  }

  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'en',
    smart_format: 'true',
    punctuate: 'true',
    filler_words: 'true', // we want "um" and "uh": they reveal hesitation
    detect_language: 'false',
  });

  try {
    const res = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: 'POST',
      headers: { Authorization: `Token ${key}`, 'Content-Type': mimeType },
      body: audio,
    });

    if (!res.ok) {
      return { status: 'failed', transcript: '', confidence: 0, wordCount: 0, provider: 'deepgram' };
    }

    const json = (await res.json()) as DeepgramResponse;
    const alt = json.results?.channels?.[0]?.alternatives?.[0];
    const transcript = (alt?.transcript ?? '').trim();
    const confidence = alt?.confidence ?? 0;
    const wordCount = transcript ? transcript.split(/\s+/).length : 0;

    return { ...classify(transcript, wordCount), confidence, provider: 'deepgram' };
  } catch {
    return { status: 'failed', transcript: '', confidence: 0, wordCount: 0, provider: 'deepgram' };
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
function mockTranscribe(audio: ArrayBuffer): TranscriptionResult {
  const kb = audio.byteLength / 1024;
  if (kb < 8) {
    return { status: 'silent', transcript: '', confidence: 0, wordCount: 0, provider: 'mock' };
  }
  if (kb < 20) {
    return {
      status: 'too_short',
      transcript: 'Yes sir.',
      confidence: 0.6,
      wordCount: 2,
      provider: 'mock',
    };
  }
  const transcript =
    '[DEMO TEXT, NOT YOUR VOICE] Um, my name is Sujan Neupane and I am from Butwal in ' +
    'Nepal. I completed my bachelor degree in business administration in 2023 from ' +
    'Tribhuvan University. After that I worked for about two years in a trading company ' +
    'as a sales officer. I have applied for the MSc Management course because I want to ' +
    'move into a management role when I go back to Nepal.';
  return {
    status: 'ok',
    transcript,
    confidence: 0.91,
    wordCount: transcript.split(/\s+/).length,
    provider: 'mock',
  };
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
  return !process.env.DEEPGRAM_API_KEY;
}

export function redact(text: string): string {
  return text
    .replace(/\b[A-Z]{1,2}\d{6,9}\b/g, '[document number removed]')
    .replace(/\b\d{9,18}\b/g, '[account number removed]')
    .replace(/\b(?:\+?977[-\s]?)?9[678]\d{8}\b/g, '[phone number removed]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, '[email removed]');
}
