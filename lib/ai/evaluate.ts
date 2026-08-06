import type { Band, Evaluation, Question } from '@/lib/types';
import { redact } from '@/lib/ai/stt';

const MAX_TRANSCRIPT_WORDS = Number(process.env.MAX_TRANSCRIPT_WORDS ?? 400);

export const SYSTEM_PROMPT = `You are an experienced UK university admissions interviewer who also coaches Nepali students preparing for the Pre-CAS credibility interview and the UKVI genuine student interview.

You are assessing ONE answer.

WHO YOU ARE TALKING TO
The student is Nepali, aged 20 to 28. Their spoken English is often weak. Many are nervous. Many have memorised answers from a teacher. Many are applying to the UK after being refused or discouraged elsewhere, and they know it.

Your job is to make them better, not to make them feel small.

ABSOLUTE RULES
1. Never invent facts about the student. Use only what is in the transcript.
2. Never coach the student to lie. No invented work experience, no invented finances, no invented reasons. If their true answer is weak, help them present the truth better.
3. Never guarantee, imply or hint at a visa or CAS outcome.
4. Never give immigration legal advice.
5. If the answer concerns a visa refusal, never help the student conceal or soften it. Tell them plainly that UKVI already holds that record.

HOW TO WRITE FEEDBACK
- Quote the student's own words back to them at least once. This is mandatory. It is how they know you actually listened.
- Say one true good thing first. If there is genuinely nothing good, say the attempt itself was worth something. Do not fabricate praise.
- Then give at most three specific fixes. Each fix is one sentence and starts with a verb.
- Use short sentences. A student with weak English must understand every line you write.
- Never use these words: leverage, articulate, robust, comprehensive, demonstrate, utilise, endeavour.

THE HOUSE METHOD: PEE PLUS WRAP-UP
Every answer in this product is taught and marked against these four steps, in this order:

  P  POINT        Answer the question directly, in one sentence. No long introduction.
  E  EVIDENCE     One real, checkable fact: a name, a number, a date, a module title, a place.
  E  EXPLANATION  Why that fact matters to THEM. This is the step students skip most.
  W  WRAP-UP      One sentence linking it to their plan, then stop.

You must judge every answer against these four steps and say which ones are missing, using these exact words. Do not invent your own framework. Do not rename the steps. The student sees the same four labels on the interview screen, so your feedback must line up with what they were looking at while they answered.

The most common failure by far is a student who gives Point and Evidence and then stops, with no Explanation. When you see that, name it plainly: "You gave your point and your evidence, but you did not explain why it matters to you. That is the part the interviewer is listening for."

HOW TO WRITE THE MODEL ANSWER
- Write it in the student's own voice, using their real details from the transcript. Never a generic template.
- Simple vocabulary only. If a word would not appear in a Nepali student's normal spoken English, do not use it.
- Four to six short sentences. No more.
- Follow PEE plus wrap-up exactly, in order.

DETECTING MEMORISATION
If the answer is unusually fluent, uses vocabulary far above conversational level, has no hesitation markers at all, or reads like written prose rather than speech, set soundsMemorised true and tell the student plainly that a real interviewer will notice and will reword the question to test them.

SCORING
Score 0 to 100 on relevance, specificity, personal truth, and English clarity. Be honest and use the whole range. A generic answer scores low even when the English is good. Do not cluster scores around 40 to 50.

Return ONLY valid JSON matching this shape, with no markdown fence:
{"score":0,"band":"needs_practice","soundsMemorised":false,"quotedBack":"","whatWentWell":"","fixes":[""],"modelAnswer":"","nepaliHint":"","flags":[""],"pee":{"point":false,"evidence":false,"explanation":false,"wrapUp":false}}

Set each field in "pee" to true only if the student genuinely did that step. Be strict. A vague gesture at a reason is not an Explanation.

band is one of: ready, almost_ready, needs_practice, risky.
nepaliHint is ONE sentence in Nepali (Devanagari script) giving the single most important fix.`;

/**
 * Evaluate a single answer.
 *
 * Deliberately scoped to ONE answer, never a whole transcript. Two reasons:
 * Netlify functions time out at 10s on the free tier, and per-answer evaluation
 * means results are instant at the end instead of a 40 second spinner.
 *
 * The caller must never invoke this without an 'ok' transcript. The guard here
 * is a second line of defence, not the first.
 */
export async function evaluateAnswer(args: {
  question: Question;
  transcript: string;
  durationSeconds: number;
  previousTranscripts: string[];
}): Promise<Evaluation | null> {
  const clean = redact(args.transcript).split(/\s+/).slice(0, MAX_TRANSCRIPT_WORDS).join(' ');

  // Hard guard. No transcript means no score, under any circumstance.
  if (!clean || clean.split(/\s+/).length < 5) return null;

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') return null;
    return mockEvaluate(args.question, clean, args.durationSeconds);
  }

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
  const userPrompt = [
    `QUESTION (category: ${args.question.category}): ${args.question.text}`,
    `PRIVATE MARKING NOTES (never repeat these to the student): ${args.question.rubricNotes}`,
    `ANSWER LENGTH: ${Math.round(args.durationSeconds)} seconds`,
    args.previousTranscripts.length
      ? `EARLIER ANSWERS IN THIS SESSION, for consistency and fluency comparison:\n${args.previousTranscripts
          .slice(-3)
          .map((t, i) => `(${i + 1}) ${t.slice(0, 400)}`)
          .join('\n')}`
      : '',
    `THE STUDENT'S ANSWER:\n"""${clean}"""`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 900,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!res.ok) return null;

    const json = (await res.json()) as GeminiResponse;
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return null;

    return normalise(JSON.parse(stripFence(raw)) as Partial<Evaluation>, args.question);
  } catch {
    return null;
  }
}

function stripFence(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
}

function bandFor(score: number): Band {
  if (score >= 80) return 'ready';
  if (score >= 65) return 'almost_ready';
  if (score >= 40) return 'needs_practice';
  return 'risky';
}

function normalise(raw: Partial<Evaluation>, question: Question): Evaluation {
  const score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
  return {
    score,
    band: (raw.band as Band) ?? bandFor(score),
    soundsMemorised: Boolean(raw.soundsMemorised),
    quotedBack: String(raw.quotedBack ?? ''),
    whatWentWell: String(raw.whatWentWell ?? ''),
    fixes: Array.isArray(raw.fixes) ? raw.fixes.slice(0, 3).map(String) : [],
    modelAnswer: String(raw.modelAnswer ?? question.modelAnswer),
    nepaliHint: String(raw.nepaliHint ?? ''),
    flags: Array.isArray(raw.flags) ? raw.flags.map(String) : [],
    pee: {
      point: Boolean(raw.pee?.point),
      evidence: Boolean(raw.pee?.evidence),
      explanation: Boolean(raw.pee?.explanation),
      wrapUp: Boolean(raw.pee?.wrapUp),
    },
  };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

/**
 * Development stand-in. Note what it does NOT do: it never returns a score for
 * an empty transcript, because the caller never reaches it in that case, and
 * the guard above stops it anyway. That is the whole product thesis and it is
 * enforced even in the mock.
 */
function mockEvaluate(
  question: Question,
  transcript: string,
  durationSeconds: number
): Evaluation {
  const words = transcript.split(/\s+/);
  const hasNumbers = /\d/.test(transcript);
  const hasFillers = /\b(um|uh|er|you know)\b/i.test(transcript);
  const firstWords = words.slice(0, 9).join(' ');
  const hasProperNoun = /\b[A-Z][a-z]{2,}\b/.test(transcript);
  const hasBecause = /\b(because|so that|which means|that is why|reason)\b/i.test(transcript);

  let score = 45;
  if (words.length > 60) score += 12;
  if (words.length > 110) score += 8;
  if (hasNumbers) score += 10;
  if (durationSeconds > 30) score += 8;
  if (durationSeconds < 15) score -= 15;
  score = Math.max(5, Math.min(92, score));

  const pee = {
    point: words.length > 8,
    evidence: hasNumbers || hasProperNoun,
    explanation: hasBecause && words.length > 45,
    wrapUp: words.length > 70,
  };

  const fixes: string[] = [];
  if (!pee.evidence) {
    fixes.push('Add your Evidence: one real name, number or date. Right now there is none.');
  }
  if (!pee.explanation) {
    fixes.push('Add your Explanation: say why that fact matters to you, not just that it is true.');
  }
  if (!pee.wrapUp) {
    fixes.push('Finish with a Wrap-up: one sentence linking this to your plan, then stop.');
  }
  if (!hasNumbers && ['finance', 'accommodation'].includes(question.category)) {
    fixes.push('Give a real number. The interviewer expects amounts, not "enough money".');
  }
  if (fixes.length === 0) {
    fixes.push('Tighten your Point. Answer the question in your first sentence, before anything else.');
  }

  return {
    score,
    band: bandFor(score),
    soundsMemorised: !hasFillers && words.length > 80,
    quotedBack: firstWords,
    whatWentWell:
      'You answered in full sentences and you kept going without stopping. That is a real strength under pressure.',
    fixes: fixes.slice(0, 3),
    modelAnswer: question.modelAnswer,
    nepaliHint: !pee.explanation
      ? 'तथ्य भन्नु मात्र पुग्दैन। त्यो तथ्य तपाईंका लागि किन महत्त्वपूर्ण छ, त्यो पनि भन्नुहोस्।'
      : 'आफ्नो उत्तरमा एउटा साँचो उदाहरण र सक्दो सङ्ख्या थप्नुहोस्।',
    flags: hasNumbers ? [] : ['no_specifics'],
    pee,
  };
}

export function evaluatorIsMocked(): boolean {
  return !process.env.GEMINI_API_KEY;
}
