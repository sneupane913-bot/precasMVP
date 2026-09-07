import type { Institution, Question, QuestionCategory } from '@/lib/types';
import { PUBLISHED_GUIDANCE, UKVI_MAINTENANCE } from '@/lib/data/institution-facts';
import { GENERATED_EVIDENCE } from '@/lib/data/university-evidence.generated';

/**
 * HOW LIKELY IS THIS QUESTION AT THIS UNIVERSITY, AND HOW DO WE KNOW?
 *
 * 7 September 2026. The client's requirement after the first customer
 * feedback, in his words: "provide me a likeliness of each of the question
 * appearing in that specific university ... if we don't have any guarantee,
 * then we're not gonna ask it ... make sure that each of the question that is
 * asked is linked to the university, what the research proves."
 *
 * So every question a student hears carries a likelihood level, a one-line
 * reason, and the URL that reason rests on. Nothing here is a guess. The
 * evidence comes from two places:
 *
 *   1. institution-facts.ts: the hand-checked list of universities that
 *      publish their own interview guidance, with the bank questions each
 *      page asks, matched by meaning.
 *   2. docs/research/evidence/<institutionId>.json: the per-university
 *      research sweep of 7 September 2026 (official pages, student reports,
 *      consultancy posts naming the university), compiled into
 *      university-evidence.generated.ts by qa/build-evidence.mjs. Every source
 *      carries the URL it was read from and the verbatim questions.
 *
 * THE THREE LEVELS, in falling order of evidence:
 *
 *   very_likely  the university's OWN page lists this question
 *   likely       students who sat THIS university's interview report it
 *   possible     the university says its interview covers this theme, or,
 *                when the university publishes nothing at all, the question
 *                is in the guidance UK universities publish for the same
 *                interview (the general UK evidence)
 *
 *   general      nothing from this university or its students touches the
 *                question or its theme; the evidence is the guidance OTHER UK
 *                universities publish for the same interview, and the label
 *                says so
 *
 * A paper draws the three evidenced levels first and reaches for "general"
 * only when a student has already heard every evidenced question in a theme
 * (Q-14): a labelled general question beats a repeat, and both beat an
 * invented one. The result is never null: every question the student hears
 * has a level, a reason and a URL.
 */

export type EvidenceTier = 'official' | 'student_report' | 'consultancy';

export interface EvidenceSource {
  /** True for the shared CAS Shield theme list, so the reason can say so. */
  viaCasShield?: boolean;
  url: string;
  title: string;
  tier: EvidenceTier;
  checkedOn: string;
  /** Whether the page itself was read, or only a search-result snippet. */
  fetched: boolean;
  fromSnippet?: boolean;
  /** Topic areas the page lists, verbatim where possible. */
  topics: string[];
  /** Bank question ids the page asks, matched by meaning. */
  questionIds: string[];
  /** Verbatim questions found on the page. */
  quotes?: string[];
  /** Verbatim questions with no bank match yet. */
  unmapped?: string[];
  notes?: string;
}

export interface InstitutionEvidence {
  institutionId: string;
  checkedOn: string;
  usesCasShield: boolean | null;
  sources: EvidenceSource[];
}

export type Likelihood = 'very_likely' | 'likely' | 'possible' | 'general';

export const LIKELIHOOD_LABEL: Record<Likelihood, string> = {
  very_likely: 'Very likely',
  likely: 'Likely',
  possible: 'Possible',
  general: 'General UK evidence',
};

/** Higher is stronger. Used to order a paper's candidates. */
export const LIKELIHOOD_RANK: Record<Likelihood, number> = {
  very_likely: 3,
  likely: 2,
  possible: 1,
  general: 0,
};

export interface QuestionLikelihood {
  level: Likelihood;
  /** One plain sentence a student can read. */
  reason: string;
  sourceUrl: string;
  sourceTitle: string;
}

/**
 * THE CAS SHIELD THEMES. Enroly's CAS Shield runs the recorded pre-CAS
 * interview for a large share of UK universities, and Brunel publishes the
 * policy: 15 to 20 minutes, questions randomised from these themes, an ID
 * check on camera, assessed by the university's own compliance staff, with
 * pass / resit / reject outcomes. Any university we have evidence uses CAS
 * Shield inherits this theme list as an official source, worded as such.
 * Verbatim from the PDF, read 7 September 2026.
 */
export const CAS_SHIELD_SOURCE: EvidenceSource = {
  viaCasShield: true,
  url: 'https://www.brunel.ac.uk/study/admissions/documents/pdf/CAS-Shield-Interview-Policy-2024-5.pdf',
  title: 'Brunel University London: CAS Shield Interview Policy 2024-5 (the themes every CAS Shield interview draws from)',
  tier: 'official',
  checkedOn: '2026-09-07',
  fetched: true,
  topics: [
    'The reason why the applicant has chosen to study in the UK, and at the university',
    'The reason why the applicant has chosen their particular course',
    "The applicant's post-study plans and how their course may support them in this",
    "The applicant's financial circumstances and how they expect to fund their studies in the UK",
    "The applicant's arrangements for UK accommodation",
    "The applicant's awareness of the Student visa regulations",
    "'Random' questions on unrelated topics may be included to prevent the use of scripted answers",
  ],
  questionIds: [],
  notes:
    'Recorded video interview in the CAS Shield software, approximately 15-20 minutes, questions randomised from the themes above, passport shown on camera for an ID check, assessed by the university\'s own compliance or admissions staff. Outcomes: pass, resit (borderline, in whole or for specific subject areas), or reject.',
};

const BRUNEL = 'inst-brunel-university-london';

/** Every source we hold for one university: hand-checked guidance first, then the sweep. */
export function evidenceFor(institutionId: string): EvidenceSource[] {
  const out: EvidenceSource[] = [];
  if (institutionId === BRUNEL || GENERATED_EVIDENCE[institutionId]?.usesCasShield === true) {
    out.push(CAS_SHIELD_SOURCE);
  }
  const g = PUBLISHED_GUIDANCE[institutionId];
  if (g) {
    out.push({
      url: g.url,
      title: g.title,
      tier: 'official',
      checkedOn: g.checkedOn,
      fetched: true,
      topics: g.topics,
      questionIds: g.questionIds,
    });
  }
  const gen = GENERATED_EVIDENCE[institutionId];
  if (gen) {
    for (const s of gen.sources) {
      // The hand-checked entry wins over the sweep's copy of the same page.
      if (g && s.url === g.url) continue;
      out.push(s);
    }
  }
  return out;
}

export function usesCasShield(institutionId: string): boolean | null {
  return GENERATED_EVIDENCE[institutionId]?.usesCasShield ?? null;
}

/** Institutions with at least one source that names them. */
export function hasOwnEvidence(institutionId: string): boolean {
  return evidenceFor(institutionId).length > 0;
}

/**
 * Which themes a free-text topic line covers. The universities describe their
 * interviews in their own words ("financing your studies", "why this course",
 * "post-study plans"), so the mapping is by keyword, and it is deliberately
 * generous: a topic line that mentions the course covers course knowledge,
 * study history and progression, because those are the questions that follow.
 */
const TOPIC_KEYWORDS: [RegExp, QuestionCategory[]][] = [
  [/financ|fund|money|fee|tuition|cost|sponsor|bank|maintenance|budget/i, ['finance']],
  [/accommod|live\b|living|housing|city|travel|campus location|where you will/i, ['accommodation']],
  [/course|module|assess|programme|subject|study plan|qualification|academic/i, ['why_course', 'education', 'progression']],
  [/universit|institution|campus|why .*(chose|choose)|facilit/i, ['why_university']],
  [/\buk\b|united kingdom|country|destination|abroad|overseas/i, ['why_uk']],
  [/visa|immigration|work|compliance|responsibilit|conditions|dependant|refus/i, ['immigration']],
  [/career|future|plan|after|graduat|ambition|goal|return|employ/i, ['future_plans']],
  [/gap|break|since you|history|background|previous|prior|past stud/i, ['study_gap', 'education']],
  [/genuine|intention|yourself|introduc|personal|english/i, ['identity', 'conversational']],
  [/random|unrelated|scripted/i, ['conversational', 'identity']],
];

function categoriesCoveredBy(topics: string[]): Set<QuestionCategory> {
  const set = new Set<QuestionCategory>();
  for (const t of topics) {
    for (const [re, cats] of TOPIC_KEYWORDS) {
      if (re.test(t)) for (const c of cats) set.add(c);
    }
  }
  return set;
}

/**
 * The general UK evidence for a question: which universities' own pages ask
 * it. Used as the reason when a student's university publishes nothing.
 */
export function generalSourcesFor(questionId: string): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const g of Object.values(PUBLISHED_GUIDANCE)) {
    if (g.questionIds.includes(questionId) && !seen.has(g.url)) {
      seen.add(g.url);
      out.push({ title: g.title, url: g.url });
    }
  }
  return out;
}

/**
 * The published statement of the five themes, for questions that every
 * interview contains but no page lists as a sentence (the opener, the
 * closing, the English-ability layer). Oxford Brookes is the page the bank
 * itself is built on (questions.ts, [S1]).
 */
const THEMES_SOURCE = {
  title: 'Oxford Brookes University: UKVI Credibility interviews (the five topic areas)',
  url: 'https://www.brookes.ac.uk/students/isat/visas/student-visa/credibility-interviews',
};

const ALWAYS: Partial<Record<QuestionCategory, string>> = {
  identity:
    'Every published interview guide opens by confirming who you are and what you have applied for.',
  conversational:
    'The published guides say interviewers reword questions and ask about everyday topics to test spoken English and spot memorised answers.',
};

function shortName(inst: Institution): string {
  return inst.shortName || inst.name;
}

/**
 * The likelihood of one question for one university, with its reason and URL.
 * Never null; "general" is the honest floor.
 */
export function likelihoodFor(q: Question, inst: Institution): QuestionLikelihood {
  const sources = evidenceFor(inst.id);
  const name = shortName(inst);

  // 1. The university's own page lists it.
  const official = sources.find((s) => s.tier === 'official' && s.questionIds.includes(q.id));
  if (official) {
    return {
      level: 'very_likely',
      reason: `Listed in ${name}'s own interview guidance.`,
      sourceUrl: official.url,
      sourceTitle: official.title,
    };
  }

  // 2. Students who sat this university's interview report it.
  const reported = sources.find((s) => s.tier !== 'official' && s.questionIds.includes(q.id));
  if (reported) {
    return {
      level: 'likely',
      reason: `Reported by students who sat ${name}'s interview.`,
      sourceUrl: reported.url,
      sourceTitle: reported.title,
    };
  }

  // 3. The university says its interview covers this theme.
  for (const s of sources) {
    if (categoriesCoveredBy(s.topics).has(q.category)) {
      return {
        level: 'possible',
        reason: s.viaCasShield
          ? `${name} runs its interview through CAS Shield, whose published themes cover this.`
          : s.tier === 'official'
            ? `${name} says its interview covers this theme.`
            : `Students who sat ${name}'s interview report this theme.`,
        sourceUrl: s.url,
        sourceTitle: s.title,
      };
    }
  }

  // 3b. Themes every interview contains, whatever the page lists.
  const always = ALWAYS[q.category];
  if (always && sources.length > 0) {
    return { level: 'possible', reason: always, sourceUrl: THEMES_SOURCE.url, sourceTitle: THEMES_SOURCE.title };
  }

  // 4. The general UK evidence, stated as such. Two wordings: the university
  //    publishes nothing we could find, or it does and this theme is not in it.
  const general = generalSourcesFor(q.id);
  const lead =
    sources.length === 0
      ? `${name} publishes no interview guidance we could find.`
      : `Not in ${name}'s own guidance or its students' reports.`;
  if (general.length > 0) {
    const n = general.length;
    return {
      level: 'general',
      reason: `${lead} This question is on ${n === 1 ? "one UK university's own" : `${n} UK universities' own`} guidance page${n === 1 ? '' : 's'} for the same interview.`,
      sourceUrl: general[0]!.url,
      sourceTitle: general[0]!.title,
    };
  }
  return {
    level: 'general',
    reason: `${lead} This question comes from the credibility themes UK universities publish for the same interview.`,
    sourceUrl: THEMES_SOURCE.url,
    sourceTitle: THEMES_SOURCE.title,
  };
}

/** A one-line summary of the evidence base for a university card. */
export function evidenceSummary(inst: Institution): {
  official: number;
  reports: number;
  veryLikely: number;
  likely: number;
  line: string;
} {
  const sources = evidenceFor(inst.id);
  const official = sources.filter((s) => s.tier === 'official').length;
  const reports = sources.length - official;
  const ids = new Set<string>();
  const reportIds = new Set<string>();
  for (const s of sources) {
    for (const id of s.questionIds) (s.tier === 'official' ? ids : reportIds).add(id);
  }
  for (const id of ids) reportIds.delete(id);
  const name = shortName(inst);
  let line: string;
  if (official > 0 && ids.size > 0) {
    line = `${ids.size} questions from ${name}'s own interview guidance${reports > 0 ? `, plus ${reportIds.size} reported by its students` : ''}.`;
  } else if (sources.some((s) => s.viaCasShield) && official === 1) {
    line = `${name} runs its interview through CAS Shield, whose themes are published${reports > 0 ? `; ${reportIds.size} questions reported by its students` : ''}.`;
  } else if (official > 0) {
    line = `${name} publishes the themes of its interview${reports > 0 ? `; ${reportIds.size} questions reported by its students` : ''}.`;
  } else if (reports > 0) {
    line = `${reportIds.size} questions reported by students who sat ${name}'s interview.`;
  } else {
    line = `No guidance from ${name} found. This paper uses the questions UK universities publish for the same interview.`;
  }
  return { official, reports, veryLikely: ids.size, likely: reportIds.size, line };
}

export { UKVI_MAINTENANCE };
