import type { Institution } from '@/lib/types';
import { GENERATED_FACTS } from '@/lib/data/university-evidence.generated';

/**
 * WHAT WE ACTUALLY KNOW ABOUT EACH UNIVERSITY, AND WHERE IT CAME FROM.
 *
 * 7 September 2026. The first piece of customer feedback on the live product:
 * a student sat a mock for their university and said the questions were not
 * about that university. They were right. Every one of the 94 institutions
 * received the same bank with only the name and the city swapped in, and
 * nothing in the paper, the model answers or the marking knew one university
 * from another.
 *
 * The research (QUESTION-BANK-ARCHITECTURE.md, 17 Aug) found that the
 * QUESTIONS are largely the same everywhere and the CORRECT ANSWER is what
 * changes. So this file is the answer layer: the facts about a university that
 * a real interviewer expects the student to know, each with a source and a
 * date, and nothing without one.
 *
 * Two things live here:
 *
 *   1. The UKVI living-cost band. It is the single most-asked concrete number
 *      in the finance theme, and the correct answer depends on the campus.
 *      A student who quotes the London figure for Coventry has told the
 *      interviewer they did not research their own city.
 *
 *   2. Which universities PUBLISH their own interview guidance, and which
 *      questions in our bank they publish. Where a university tells its
 *      offer holders "here is what we ask", those questions are the most
 *      likely to appear in that student's real interview, so the paper
 *      prefers them. This is provenance, not a leaked list, and the copy on
 *      the universities page says exactly that.
 *
 * HONESTY RULE (same as institutions.ts): nothing in this file may claim a
 * university-specific fact without a URL and a date. If a fact cannot be
 * sourced, it is not here, and the product says nothing about it.
 */

// ---------------------------------------------------------------------------
// 1. UKVI maintenance, the number every finance answer is checked against.
//
// Source: GOV.UK, "Student visa: Money you need to support yourself", read
// 7 September 2026, and Immigration Rules Appendix Student ST 12.3, same
// date. In London £1,529 a month; outside London £1,171 a month; both for up
// to 9 months. "In London" means the City of London and the 32 London
// boroughs. These figures changed on 2 January 2025 from £1,334 / £1,023 and
// will change again; when they do, this is the ONE place to edit.
// ---------------------------------------------------------------------------

export const UKVI_MAINTENANCE = {
  checkedOn: '2026-09-07',
  sourceUrl: 'https://www.gov.uk/student-visa/money',
  months: 9,
  london: 1529,
  outsideLondon: 1171,
} as const;

export interface MaintenanceBand {
  band: 'London' | 'outside London';
  monthly: number;
  months: number;
  total: number;
}

/**
 * Which band a campus city is in. Every "London" city in the catalogue is a
 * London borough campus (UEL Stratford, UWL Ealing, Ravensbourne Greenwich,
 * Brunel Uxbridge in Hillingdon, Kingston, Middlesex Hendon, Greenwich,
 * Roehampton, Westminster, Goldsmiths, QMUL, City, London Met, LSBU). BPP
 * also teaches in Manchester, Birmingham and Leeds; a BPP student who names a
 * non-London centre should quote the outside-London figure, and the rubric
 * says so.
 */
export function maintenanceFor(inst: Pick<Institution, 'city'>): MaintenanceBand {
  const london = inst.city.trim().toLowerCase() === 'london';
  const monthly = london ? UKVI_MAINTENANCE.london : UKVI_MAINTENANCE.outsideLondon;
  return {
    band: london ? 'London' : 'outside London',
    monthly,
    months: UKVI_MAINTENANCE.months,
    total: monthly * UKVI_MAINTENANCE.months,
  };
}

/** £1,529 style, for text a student reads. */
export function pounds(n: number): string {
  return `£${n.toLocaleString('en-GB')}`;
}

// ---------------------------------------------------------------------------
// 2. Universities that publish their own interview guidance.
//
// Each entry is a page the university itself put up for its offer holders,
// fetched during the 17 August 2026 harvest (PreCAS-question-bank.xlsx, sheet
// SOURCES) or on 7 September 2026. `questionIds` lists the questions in OUR
// bank that the university's own page asks, matched by meaning: "How is your
// chosen course assessed?" on the Sheffield Hallam PDF is q-12 here. It is a
// human-checked mapping, not a string match.
//
// Keys are institution ids from institutions.ts. The six featured
// institutions have hand-set ids (inst-bpp, inst-uel, inst-uwl,
// inst-wolverhampton, inst-ravensbourne, inst-coventry); the wider list is
// `inst-` plus the slugified name.
//
// Question ids are positional (q-01 ...) and stored on every session, so the
// bank is APPEND ONLY. Never reorder RAW in questions.ts.
// ---------------------------------------------------------------------------

export interface PublishedGuidance {
  /** The page, as fetched. */
  url: string;
  title: string;
  checkedOn: string;
  /** What the page says it covers, in the university's own words where possible. */
  topics: string[];
  /** Ids of bank questions that this page asks, matched by meaning. */
  questionIds: string[];
}

const ABERDEEN = 'inst-university-of-aberdeen';
const READING = 'inst-university-of-reading';
const BROOKES = 'inst-oxford-brookes-university';
const HALLAM = 'inst-sheffield-hallam-university';
const BRADFORD = 'inst-university-of-bradford';
const WESTMINSTER = 'inst-university-of-westminster';
const BOURNEMOUTH = 'inst-bournemouth-university';
const MIDDLESEX = 'inst-middlesex-university';
const LINCOLN = 'inst-university-of-lincoln';
const PORTSMOUTH = 'inst-university-of-portsmouth';
const BCU = 'inst-birmingham-city-university';
const HERTS = 'inst-university-of-hertfordshire';
const ROEHAMPTON = 'inst-university-of-roehampton';
const NORTHUMBRIA = 'inst-northumbria-university';
const COVENTRY = 'inst-coventry';
const COVENTRY_LONDON = 'inst-coventry-university-london';
const KENT = 'inst-university-of-kent';
const PLYMOUTH = 'inst-university-of-plymouth';
const STAFFS = 'inst-staffordshire-university';
const UEL = 'inst-uel';
const UWL = 'inst-uwl';

/**
 * Staffordshire and Sheffield Hallam publish near-identical practice lists
 * (both descend from the same UKVI credibility guidance), so they share one
 * question set here.
 */
const STAFFS_HALLAM_SHARED = [
  'q-02', 'q-04', 'q-05', 'q-08', 'q-09', 'q-12', 'q-20', 'q-30', 'q-33', 'q-34',
  'q-35', 'q-36', 'q-40', 'q-53', 'q-63', 'q-68', 'q-98', 'q-111',
];

export const PUBLISHED_GUIDANCE: Record<string, PublishedGuidance> = {
  [ABERDEEN]: {
    url: 'https://www.abdn.ac.uk/study/international/credibility-interview-2559.php',
    title: 'University of Aberdeen: Credibility Interview',
    checkedOn: '2026-08-17',
    topics: ['course and university', 'finance and sponsor', 'accommodation and travel', 'study history', 'plans after study'],
    questionIds: [
      'q-03', 'q-05', 'q-07', 'q-09', 'q-12', 'q-14', 'q-15', 'q-17', 'q-19', 'q-28', 'q-34', 'q-35',
      'q-36', 'q-41', 'q-46', 'q-53', 'q-65', 'q-74', 'q-97', 'q-101', 'q-102', 'q-104', 'q-106',
      'q-107', 'q-110', 'q-113',
    ],
  },
  [READING]: {
    url: 'https://www.reading.ac.uk/essentials/International/Visa-and-immigration/credibility-interviews',
    title: 'University of Reading: UKVI interview information for prospective students',
    checkedOn: '2026-08-17',
    topics: ['finance', 'the course and its level', 'why Reading', 'accommodation', 'previous visas'],
    questionIds: [
      'q-08', 'q-09', 'q-14', 'q-15', 'q-16', 'q-18', 'q-30', 'q-36', 'q-38', 'q-41', 'q-50',
      'q-51', 'q-88', 'q-98', 'q-100', 'q-105', 'q-108', 'q-122',
    ],
  },
  [BROOKES]: {
    url: 'https://www.brookes.ac.uk/students/isat/visas/student-visa/credibility-interviews',
    title: 'Oxford Brookes University: UKVI Credibility interviews',
    checkedOn: '2026-08-13',
    topics: ['study in the UK', 'why this university', 'why this course', 'financing your studies', 'post-study plans'],
    questionIds: [
      'q-04', 'q-08', 'q-09', 'q-10', 'q-11', 'q-12', 'q-14', 'q-16', 'q-17', 'q-20', 'q-28',
      'q-29', 'q-30', 'q-37', 'q-38', 'q-53', 'q-60', 'q-65', 'q-76', 'q-77', 'q-105',
    ],
  },
  [HALLAM]: {
    url: 'https://www.shu.ac.uk/-/media/home/international/files/int-credibility-interview-practice-qs.pdf',
    title: 'Sheffield Hallam University: Credibility interview practice questions',
    checkedOn: '2026-08-17',
    topics: ['course', 'university', 'finance', 'accommodation', 'dependants and work', 'plans after study'],
    questionIds: [...STAFFS_HALLAM_SHARED, 'q-17', 'q-19', 'q-86', 'q-97', 'q-103', 'q-121', 'q-123'],
  },
  [STAFFS]: {
    url: 'https://www.staffs.ac.uk/international/pdf/guide-to-credibility-interviews.pdf',
    title: 'Staffordshire University: Guide to Credibility Interviews',
    checkedOn: '2026-08-17',
    topics: ['course and level', 'university', 'finance and evidence', 'accommodation', 'visa history and conditions', 'study gap'],
    questionIds: [
      ...STAFFS_HALLAM_SHARED, 'q-15', 'q-16', 'q-23', 'q-47', 'q-52', 'q-60', 'q-83', 'q-88',
      'q-100', 'q-102', 'q-105', 'q-106', 'q-108',
    ],
  },
  [BRADFORD]: {
    url: 'https://www.bradford.ac.uk/international/support/visa-support/student-visas/credibility-checks/',
    title: 'University of Bradford: Credibility checks, Student visas',
    checkedOn: '2026-08-17',
    topics: ['why Bradford', 'the city', 'accommodation research', 'funding for the full course', 'family and dependants', 'visa history'],
    questionIds: [
      'q-03', 'q-09', 'q-10', 'q-11', 'q-14', 'q-18', 'q-19', 'q-34', 'q-35', 'q-50', 'q-53',
      'q-55', 'q-61', 'q-86', 'q-90', 'q-98', 'q-101', 'q-103',
    ],
  },
  [WESTMINSTER]: {
    url: 'https://www.westminster.ac.uk/international/visas-and-advice/visas/student-visa/credibility-interviews',
    title: 'University of Westminster: Credibility interviews',
    checkedOn: '2026-08-17',
    topics: ['finance', 'where you will live in London and the campus', 'your course and modules', 'why the UK and why Westminster', 'plans after graduating'],
    questionIds: [
      'q-02', 'q-07', 'q-08', 'q-09', 'q-11', 'q-13', 'q-14', 'q-15', 'q-16', 'q-17', 'q-19',
      'q-30', 'q-34', 'q-50', 'q-51', 'q-76', 'q-92', 'q-98', 'q-104',
    ],
  },
  [BOURNEMOUTH]: {
    url: 'https://www.bournemouth.ac.uk/students/help-advice/international-students/immigration-visas/student-route-visa/visa-application-credibility-interviews',
    title: 'Bournemouth University: Credibility interviews, information for international applicants',
    checkedOn: '2026-08-17',
    topics: ['why the UK', 'why BU', 'your course and modules', 'finance', 'plans after study'],
    questionIds: ['q-04', 'q-07', 'q-09', 'q-11', 'q-14', 'q-19', 'q-20', 'q-34', 'q-37', 'q-38', 'q-39', 'q-41', 'q-65'],
  },
  [MIDDLESEX]: {
    url: 'https://www.mdx.ac.uk/international/student-visas/your-interview/',
    title: 'Middlesex University: Preparing for your credibility interview',
    checkedOn: '2026-08-17',
    topics: ['your course, modules and assessment', 'fees and funding', 'accommodation', 'why Middlesex', 'work and plans after'],
    questionIds: ['q-09', 'q-11', 'q-12', 'q-14', 'q-19', 'q-20', 'q-34', 'q-36', 'q-41', 'q-46', 'q-53', 'q-105'],
  },
  [LINCOLN]: {
    url: 'https://www.lincoln.ac.uk/studywithus/internationalstudents/informationforofferholders/pre-casinterview/',
    title: 'University of Lincoln: Pre-CAS Interview, information for offer holders',
    checkedOn: '2026-08-13',
    topics: ['modules and optional modules', 'accommodation and travel', 'funding and the UKVI maintenance requirement', 'previous visas and family immigration history', 'other countries considered'],
    questionIds: ['q-08', 'q-11', 'q-14', 'q-17', 'q-18', 'q-26', 'q-49', 'q-55', 'q-56', 'q-75', 'q-87', 'q-99', 'q-104'],
  },
  [PORTSMOUTH]: {
    url: 'https://myport.port.ac.uk/study/international-students/visa-advice/credibility-interviews',
    title: 'University of Portsmouth: Credibility interviews',
    checkedOn: '2026-08-17',
    topics: ['source of funds and family finances', 'sponsorship', 'plans after study', 'previous visas and breaches', 'other countries and universities considered'],
    questionIds: ['q-08', 'q-09', 'q-18', 'q-19', 'q-34', 'q-38', 'q-68', 'q-88', 'q-101', 'q-112'],
  },
  [BCU]: {
    url: 'https://www.bcu.ac.uk/international/preparing-for-the-uk/getting-your-visa/credibility-interviews',
    title: 'Birmingham City University: Credibility interviews',
    checkedOn: '2026-08-17',
    topics: ['why this course', 'why BCU', 'funding', 'career plans', 'study gap and previous UK study', 'where you will live', 'work'],
    questionIds: ['q-09', 'q-12', 'q-14', 'q-17', 'q-20', 'q-28', 'q-53', 'q-108'],
  },
  [HERTS]: {
    url: 'https://www.herts.ac.uk/international/apply/offer-holder-guidance/sponsorship-interview',
    title: 'University of Hertfordshire: Sponsorship interview',
    checkedOn: '2026-08-17',
    topics: ['why Hertfordshire', 'who pays', 'plans after graduating', 'previous visas', 'study abroad before'],
    questionIds: ['q-09', 'q-15', 'q-18', 'q-19', 'q-26', 'q-112'],
  },
  [ROEHAMPTON]: {
    url: 'https://www.roehampton.ac.uk/globalassets/documents/visas-and-immigration/credibility-interviews-0318.pdf/',
    title: 'University of Roehampton: Credibility Interview Guidance',
    checkedOn: '2026-08-17',
    topics: ['course', 'finance', 'work while studying', 'plans after study'],
    questionIds: ['q-53'],
  },
  [NORTHUMBRIA]: {
    url: 'https://www.northumbria.ac.uk/study-at-northumbria/immigration/credibility-interviews/',
    title: 'Northumbria University: Credibility interviews',
    checkedOn: '2026-08-17',
    topics: ['why your course', 'who is financing you', 'where you will live', 'career goals', 'why Northumbria'],
    questionIds: ['q-09', 'q-15', 'q-17', 'q-20'],
  },
  [COVENTRY]: {
    url: 'https://www.coventry.ac.uk/international-students-hub/coming-to-the-uk/your-visa/credibility-interviews/',
    title: 'Coventry University: Credibility interviews',
    checkedOn: '2026-09-07',
    topics: [
      'why you chose the UK rather than home or another destination',
      'why Coventry University is the right choice, the research you did and what stood out',
      'your understanding of the course and its modules',
      'how the course supports your future ambitions',
      'how you will fund tuition, living costs and accommodation',
    ],
    questionIds: ['q-05', 'q-07', 'q-11', 'q-12', 'q-14', 'q-20', 'q-29', 'q-34'],
  },
  [KENT]: {
    url: 'https://www.kent.ac.uk/international/credibility-interviews',
    title: 'University of Kent: Credibility Interviews',
    checkedOn: '2026-08-17',
    topics: ['where you will live', 'your course, its modules and assessment'],
    questionIds: ['q-11', 'q-12', 'q-17'],
  },
  [PLYMOUTH]: {
    url: 'https://www.plymouth.ac.uk/services/international-student-advice/ukvi-credibility-interviews',
    title: 'University of Plymouth: UKVI credibility interviews',
    checkedOn: '2026-08-17',
    topics: ['why the UK', 'how well you understand your course'],
    questionIds: ['q-07', 'q-44'],
  },
  [UEL]: {
    url: 'https://www.uel.ac.uk/study/undergraduate/offer-holders/welcome-international-students',
    title: 'University of East London: Welcome to international students (offer holders)',
    checkedOn: '2026-09-07',
    topics: [
      'your previous studies and your reasons for choosing UEL',
      'your reasons for choosing your course and for wanting to study in the UK',
      'your future and how your course will help you achieve your plans',
    ],
    questionIds: ['q-03', 'q-04', 'q-07', 'q-09', 'q-11', 'q-19', 'q-20'],
  },
  [UWL]: {
    url: 'https://www.uwl.ac.uk/international/after-you-apply',
    title: 'University of West London: After you apply',
    checkedOn: '2026-09-07',
    // UWL says it may run financial checks and a credibility interview before
    // a CAS is issued, and that an offer is withdrawn if credibility is not
    // met. It publishes no question list, so nothing is mapped.
    topics: ['financial checks', 'a credibility interview before the CAS'],
    questionIds: [],
  },
};

// Coventry University London is the same university's London campus and
// follows the same published guidance.
PUBLISHED_GUIDANCE[COVENTRY_LONDON] = PUBLISHED_GUIDANCE[COVENTRY]!;

/** Question id -> institution ids whose own guidance asks it. Built once. */
const PUBLISHED_BY: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const [instId, g] of Object.entries(PUBLISHED_GUIDANCE)) {
    for (const qid of g.questionIds) {
      const list = m.get(qid) ?? [];
      if (!list.includes(instId)) list.push(instId);
      m.set(qid, list);
    }
  }
  return m;
})();

export function publishedBy(questionId: string): string[] {
  return PUBLISHED_BY.get(questionId) ?? [];
}

export function guidanceFor(institutionId: string): PublishedGuidance | undefined {
  return PUBLISHED_GUIDANCE[institutionId];
}

/** How many questions in the bank this university's own page asks. 0 when it publishes none. */
export function publishedQuestionCount(institutionId: string): number {
  return PUBLISHED_GUIDANCE[institutionId]?.questionIds.length ?? 0;
}

// ---------------------------------------------------------------------------
// 2b. What we can say about a university, with a source for each sentence.
//
// The client's point, 7 September 2026: the selling point is the question and
// the ANSWER, and a model answer that says "[specific module]" for every
// university is generic. So where we hold sourced facts, the model answers
// and the marker use them; where we do not, the answer keeps the honest
// bracket and says so. Ravensbourne first, because that is the university in
// the complaint. Add the others ONE AT A TIME, each fact with a URL and date.
// ---------------------------------------------------------------------------

export interface InstitutionFact {
  text: string;
  sourceUrl: string;
  sourceTitle: string;
  checkedOn: string;
}

export const PROFILES: Record<string, InstitutionFact[]> = {
  'inst-ravensbourne': [
    {
      text: 'its campus is at 6 Penrose Way on the Greenwich Peninsula in south-east London (SE10 0EW), next to the O2 and North Greenwich station',
      sourceUrl: 'https://www.ravensbourne.ac.uk/',
      sourceTitle: 'Ravensbourne University London (home page, address in the footer)',
      checkedOn: '2026-09-07',
    },
    {
      text: 'it describes itself as the place "where business, creativity and technology intersect", a specialist university for design, media, fashion, architecture, computing and business',
      sourceUrl: 'https://www.ravensbourne.ac.uk/',
      sourceTitle: 'Ravensbourne University London (home page)',
      checkedOn: '2026-09-07',
    },
    {
      text: 'its courses are linked to professional bodies including BCS, ACCA, CIM, CMI, RIBA and Ukie, and it teaches with industry partners such as Avid and Blackmagic',
      sourceUrl: 'https://www.ravensbourne.ac.uk/',
      sourceTitle: 'Ravensbourne University London (home page, partners and accreditations)',
      checkedOn: '2026-09-07',
    },
    {
      text: 'it calls its approach "learning with industry" and reported its strongest National Student Survey results to date in 2026',
      sourceUrl: 'https://www.ravensbourne.ac.uk/',
      sourceTitle: 'Ravensbourne University London (home page)',
      checkedOn: '2026-09-07',
    },
    {
      text: 'international applicants complete their CAS step through CAS Shield, which guides them through documents and questions before the university requests the CAS',
      sourceUrl: 'https://www.ravensbourne.ac.uk/international-students/international-how-apply',
      sourceTitle: 'International how to apply | Ravensbourne University London',
      checkedOn: '2026-09-07',
    },
  ],
};

export function profileFor(institutionId: string): InstitutionFact[] {
  const hand = PROFILES[institutionId] ?? [];
  const swept = GENERATED_FACTS[institutionId] ?? [];
  const seen = new Set(hand.map((f) => f.text.toLowerCase()));
  return [...hand, ...swept.filter((f) => !seen.has(f.text.toLowerCase()))];
}

/**
 * The sentence a model answer uses for "why this university". Two sourced
 * facts joined, or null when we hold none (the answer then keeps its honest
 * bracket prompt). Never a ranking on its own.
 */
export function aboutSentence(institutionId: string): string | null {
  const facts = profileFor(institutionId);
  if (facts.length === 0) return null;
  return facts.slice(0, 2).map((f) => f.text).join(', and ');
}

// ---------------------------------------------------------------------------
// 3. The fact block the evaluator reads.
//
// Short, verified, and never shown to the student. It lets the marker check a
// claim ("I need £1,500 a month") against the real figure for THIS campus,
// and know what the university itself says it will ask about.
// ---------------------------------------------------------------------------

export function institutionFactBlock(inst: Institution): string {
  const m = maintenanceFor(inst);
  const lines = [
    `Name: ${inst.name}. Campus city: ${inst.city}, United Kingdom.`,
    `UKVI living-cost band: ${m.band}. The student must show ${pounds(m.monthly)} a month for ${m.months} months (${pounds(m.total)}), on top of first-year fees. Source GOV.UK, checked ${UKVI_MAINTENANCE.checkedOn}.`,
  ];
  if (inst.id === 'inst-bpp') {
    lines.push(
      'BPP also teaches in Manchester, Birmingham and Leeds. If the student names a centre outside London, the outside-London figure (£1,171 a month) is the correct one.'
    );
  }
  const g = PUBLISHED_GUIDANCE[inst.id];
  if (g) {
    lines.push(`The university publishes its own interview guidance (${g.title}). It says it covers: ${g.topics.join('; ')}.`);
  }
  const facts = profileFor(inst.id);
  if (facts.length > 0) {
    lines.push('Verified facts about the university (a student who names these has done real research; a claim that contradicts them is a fix to name):');
    for (const f of facts) lines.push(`- ${f.text}`);
  } else {
    lines.push('We hold no verified facts about this university beyond its city and band; do not mark a specific claim as false unless it contradicts the facts above.');
  }
  return lines.join('\n');
}
