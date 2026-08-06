import type { Institution, Question, PublicQuestion } from '@/lib/types';

// The question bank. {{university}} and {{city}} are resolved per session, so
// one bank serves every institution and adding institution 7 through 104 needs
// no new question writing.
//
// Model answers are STRUCTURES, written in the simple spoken English a Nepali
// student can actually produce. They are never presented as scripts.
// Rubric notes are private and never leave the server.

const RAW: Omit<Question, 'id' | 'vertical' | 'institutionId'>[] = [
  {
    category: 'identity',
    text: 'Please introduce yourself briefly.',
    timeLimitSeconds: 60,
    tips: [
      'Keep it short. Name, where you are from, what you studied, what you do now.',
      'Do not tell your whole life story. Thirty to forty seconds is enough.',
      'Speak slowly. This is the interviewer’s first impression of your English.',
    ],
    modelAnswer:
      'My name is [your name] and I am from [your city] in Nepal. I finished my bachelor’s degree in [subject] in [year] from [college]. Since then I have been working as a [job] at [company]. I have applied to study [course] at {{university}} because I want to build a career in [field].',
    rubricNotes:
      'Looking for: name, place, qualification, current activity, target course. Penalise rambling past 60s, life stories, or an answer under 15 seconds. Do not penalise accent.',
  },
  {
    category: 'identity',
    text: 'Can you confirm the course and the university you have applied to, and when it starts?',
    timeLimitSeconds: 45,
    tips: [
      'Say the full course name, not a short version.',
      'Say the intake month and year.',
      'If you are not sure of the exact course title, check your offer letter before the real interview.',
    ],
    modelAnswer:
      'I have applied for the [full course name] at {{university}}. It is a [one year / two year] course and my intake is [month] [year]. My campus is in {{city}}.',
    rubricNotes:
      'Consistency check. Any vagueness about their own course title is a serious credibility flag. Full name of course, level, intake, campus.',
  },
  {
    category: 'education',
    text: 'Tell me about your previous qualification and why you chose that subject.',
    timeLimitSeconds: 60,
    tips: [
      'Say what you studied, where, and when you finished.',
      'Then give one honest reason you picked it.',
      'It is fine if your reason was practical. Honest is better than impressive.',
    ],
    modelAnswer:
      'I completed my bachelor’s in [subject] from [college] in [year]. I chose it because [one real reason, for example: I was good at accounts in school, or my family runs a business and I wanted to understand it]. The part I enjoyed most was [one specific subject or project].',
    rubricNotes:
      'Wants a specific institution, year, and one genuine reason. Generic answers such as "it has good scope" score low. A named module or project scores high.',
  },
  {
    category: 'education',
    text: 'How does your previous study connect with the course you want to study now?',
    timeLimitSeconds: 60,
    tips: [
      'Name one subject from your old course that links to the new one.',
      'If the subjects are different, say honestly why you are changing.',
      'A career reason is a good reason. Say it plainly.',
    ],
    modelAnswer:
      'In my bachelor’s I studied [subject], and one part I really liked was [specific topic]. This new course goes deeper into that. For example it has a module on [module name]. My plan is to work in [field], and this course covers the part I am missing, which is [specific skill].',
    rubricNotes:
      'Progression logic. Named module or topic is a strong positive. A subject switch is fine if the reason is coherent. Penalise a claimed link with no specifics.',
  },
  {
    category: 'study_gap',
    text: 'What have you been doing since you finished your last qualification?',
    timeLimitSeconds: 60,
    tips: [
      'Be honest about the gap. Everyone has one.',
      'Say what you did, month to month if you can.',
      'If you worked, say the company and the role.',
    ],
    modelAnswer:
      'I finished in [year]. After that I worked at [company] as a [role] for [length of time]. I also prepared for my IELTS and took the test in [month]. I used that time to save money for my studies and to decide which course was right for me.',
    rubricNotes:
      'Gaps over 6 months need a concrete account. Vagueness here is one of the strongest refusal signals. Looking for named employer, role, dates, and an explanation of why now.',
  },
  {
    category: 'study_gap',
    text: 'How will your work experience help you in this course?',
    timeLimitSeconds: 60,
    tips: [
      'Give one real example of something you did at work.',
      'Then link it to one thing you will study.',
      'Do not invent a job. If you did not work, say what you did instead.',
    ],
    modelAnswer:
      'At [company] I was responsible for [one real task]. That taught me [one real skill, for example: how to handle customers when they are angry]. In this course there is a module on [module], and I think I will understand it better because I have already seen this in a real workplace.',
    rubricNotes:
      'Requires a concrete task, not a job title. Guardrail: if the student appears to be inventing experience, the feedback must steer them back to the truth, never help them elaborate the fiction.',
  },
  {
    category: 'why_uk',
    text: 'Why do you want to study in the UK rather than in Nepal?',
    timeLimitSeconds: 60,
    tips: [
      'Give a reason about the course or the career, not about the country being nice.',
      'Do not say the UK is the best. Say why it is best for you.',
      'One good specific reason beats three general ones.',
    ],
    modelAnswer:
      'The course I want is not available in Nepal in the same way. In Nepal the [subject] programmes focus mainly on theory, but this course has [placement / lab work / a live project]. A UK degree is also recognised by employers when I come back to work in [field]. And studying in English every day will make my English much stronger.',
    rubricNotes:
      'The single most commonly memorised question. Watch closely for scripted delivery. Penalise "UK education is world class" with no follow-through. Reward a comparison the student could only make about their own field.',
  },
  {
    category: 'why_uk',
    text: 'Did you consider Australia, Canada or the USA? Why did you choose the UK instead?',
    timeLimitSeconds: 60,
    tips: [
      'It is fine to say you looked at other countries. Most students did.',
      'Give a practical reason: course length, cost, or the type of course.',
      'Do not say anything negative about the other countries.',
    ],
    modelAnswer:
      'Yes, I did look at Australia. But the master’s there is usually two years and in the UK it is one year, so it costs me less overall and I can start working sooner. The UK also has [specific thing relevant to their field]. That is why I chose the UK.',
    rubricNotes:
      'Honesty is the marker here. A flat "no, only the UK" is often untrue and sounds coached. Reward a specific, checkable comparison such as course length or fee.',
  },
  {
    category: 'why_university',
    text: 'Why did you choose {{university}}?',
    timeLimitSeconds: 60,
    tips: [
      'Say one thing about this university that is not true of every university.',
      'Rankings alone are a weak answer.',
      'If you know a module, a facility or a lecturer, name it.',
    ],
    modelAnswer:
      'I looked at the course content at {{university}} and it covers [specific module], which is exactly the area I want to work in. The campus is in {{city}}, and living costs there are manageable for my budget. They also offer [specific support, placement or facility], which other universities I looked at did not.',
    rubricNotes:
      'Weak university knowledge is a major risk flag. Reward named modules, campus facts, city facts, support services. Penalise rankings-only and "good reputation".',
  },
  {
    category: 'why_university',
    text: 'What do you know about {{city}}, where you will be living?',
    timeLimitSeconds: 45,
    tips: [
      'Say roughly where it is in the UK.',
      'Say one thing about living costs or transport.',
      'You do not need to be an expert. You need to have looked it up.',
    ],
    modelAnswer:
      '{{city}} is in [region] of England. It is a student city, so accommodation is cheaper than central London. I have looked at accommodation near the campus and it costs around [amount] per month. I would travel to campus by [bus / walking], which takes about [time].',
    rubricNotes:
      'Tests whether real research happened. Any concrete number or travel detail is a strong positive. Complete ignorance of the city is a credibility flag.',
  },
  {
    category: 'why_course',
    text: 'Which modules will you study on this course, and which one interests you most?',
    timeLimitSeconds: 60,
    tips: [
      'Name at least two modules. Read them from the course page before your real interview.',
      'Pick one and say why it interests you.',
      'This is the question most students fail. Prepare it properly.',
    ],
    modelAnswer:
      'The course has modules including [module one], [module two] and [module three]. The one I am most interested in is [module], because at work I had to [related real situation] and I did not have the knowledge I needed. This module covers exactly that.',
    rubricNotes:
      'The highest-value diagnostic in the whole set. Zero named modules is a serious flag and the feedback must say so directly. Reward a genuine personal link to a named module.',
  },
  {
    category: 'why_course',
    text: 'How is this course assessed? Exams, coursework or both?',
    timeLimitSeconds: 45,
    tips: [
      'This is on the course page. Look it up.',
      'A short honest answer is fine.',
      'If you do not know, say you will check, do not guess.',
    ],
    modelAnswer:
      'From what I read on the course page, it is mostly coursework and group projects, with a dissertation at the end. There are some exams in the first semester. I prefer coursework because I can research properly rather than memorising for an exam.',
    rubricNotes:
      'Tests research depth. Guessing wrongly is worse than admitting uncertainty. Feedback should tell the student where to find the answer.',
  },
  {
    category: 'progression',
    text: 'This course is at the same level as your previous qualification. Why do you need it?',
    timeLimitSeconds: 60,
    tips: [
      'If this does not apply to you, say so honestly.',
      'If it does, give a career reason, not a visa reason.',
      'Say what the new course gives you that the old one did not.',
    ],
    modelAnswer:
      'My previous degree was in [subject], which is broad. This course is specialised in [area], which is where the jobs are in my field now. My employer told me that without [specific qualification or skill] I cannot move up. That is why I need this specific course, even though it is the same level.',
    rubricNotes:
      'Same-level or second-master’s is a documented refusal trigger. Requires a concrete career justification. A visa-oriented answer is a red flag and must be coached away from, honestly.',
  },
  {
    category: 'finance',
    text: 'How will you pay your tuition fees and your living costs?',
    timeLimitSeconds: 60,
    tips: [
      'Give real numbers. The interviewer expects numbers.',
      'Say who is paying and where the money came from.',
      'Never guess. Check with your family before the real interview.',
    ],
    modelAnswer:
      'My total tuition is [amount] pounds. I have already paid [amount] as a deposit, so [amount] is remaining. My father is sponsoring me. The money comes from [his business income / land sale / savings over X years], and we have bank statements showing it. For living costs I have budgeted about [amount] per month.',
    rubricNotes:
      'Numbers are mandatory. Any answer without a figure is weak. Guardrail: never help a student construct a funding story. If the funding is unclear, tell them to speak to their family and get the real facts.',
  },
  {
    category: 'finance',
    text: 'Who is your sponsor, what do they do, and roughly what do they earn?',
    timeLimitSeconds: 60,
    tips: [
      'Say their relationship to you, their job, and an approximate income.',
      'If you do not know their income, find out before the real interview.',
      'Approximate is fine. "I do not know" is not.',
    ],
    modelAnswer:
      'My sponsor is my father. He runs [type of business] in [place] and has done for [number] years. His income is around [amount] per year. He has been saving for my education since I was in school, and the savings are in [bank].',
    rubricNotes:
      'Not knowing a sponsor’s occupation or approximate income is one of the most damaging answers possible. Feedback must be direct about this. Never suggest a figure to the student.',
  },
  {
    category: 'finance',
    text: 'What do you think your monthly living costs in the UK will be?',
    timeLimitSeconds: 45,
    tips: [
      'Break it down: rent, food, transport, phone.',
      'Any realistic number is better than a vague answer.',
      'London costs much more than other cities. Know which you are in.',
    ],
    modelAnswer:
      'I have budgeted around [amount] pounds per month. Rent is about [amount], food around [amount], transport [amount], and the rest for phone and other things. I know {{city}} is [more / less] expensive than London, and I checked this on the university accommodation page.',
    rubricNotes:
      'Reward a breakdown over a single total. Reward awareness of the London differential. A figure far below reality suggests no research.',
  },
  {
    category: 'accommodation',
    text: 'Where do you plan to live, and how will you travel to campus?',
    timeLimitSeconds: 45,
    tips: [
      'Say whether it is university halls or private renting.',
      'Say roughly how far from campus.',
      'Having actually looked this up is what they are testing.',
    ],
    modelAnswer:
      'For the first few months I plan to stay in university accommodation, because it is easier when I first arrive and I do not know the city. After that I will look for a shared flat with other students, which is cheaper. The halls are about [time] walk from the campus.',
    rubricNotes:
      'Low stakes but tests preparation. Any concrete plan is acceptable. "I have not thought about it" is a preparation flag.',
  },
  {
    category: 'immigration',
    text: 'Have you applied for a visa to any country before? Have you ever been refused?',
    timeLimitSeconds: 45,
    tips: [
      'Answer completely honestly. They already have your record.',
      'If you were refused, say so, and say what you learned.',
      'Hiding a refusal is far worse than having one.',
    ],
    modelAnswer:
      'Yes. I applied for a [country] visa in [year] and it was refused because [real reason]. I understood afterwards that [what was missing]. Since then I have [what changed]. I have not had any other refusals.',
    rubricNotes:
      'ABSOLUTE GUARDRAIL. Never, under any circumstances, coach a student to conceal or reframe a refusal. If the transcript suggests concealment, the feedback must tell them plainly that UKVI already holds this record and that hiding it is the single worst thing they can do.',
  },
  {
    category: 'future_plans',
    text: 'What do you plan to do after you complete this course?',
    timeLimitSeconds: 60,
    tips: [
      'Name a job role, not just a field.',
      'Say where: Nepal, or somewhere else. Be honest.',
      'Link it back to what you will have studied.',
    ],
    modelAnswer:
      'After the course I want to work as a [specific job title]. In Nepal there is growing demand for this in [sector], and companies like [example] hire for these roles. The skills from [named module] are exactly what those jobs ask for. My longer term plan is [next step].',
    rubricNotes:
      'Wants a named role and a named sector or employer. "I will get a good job" is a weak answer. Do not penalise a student for intending to work in the UK first under the Graduate route, that is lawful. Penalise incoherence between the course and the plan.',
  },
  {
    category: 'future_plans',
    text: 'How will this qualification help you specifically, back in Nepal?',
    timeLimitSeconds: 60,
    tips: [
      'Name the industry in Nepal you are aiming at.',
      'Say what you will be able to do that you cannot do now.',
      'One concrete example is enough.',
    ],
    modelAnswer:
      'In Nepal the [sector] is growing, but there are very few people with [specific skill]. Right now I can do [current ability], but not [target ability]. After this course I will be able to [specific thing], and that is what companies like [example] are looking for. That is the gap I want to fill.',
    rubricNotes:
      'Tests whether the course-to-career logic holds. Reward naming a real Nepali sector or employer. Penalise generic statements about opportunity.',
  },
  {
    category: 'conversational',
    text: 'Tell me about a challenge you faced recently and how you handled it.',
    timeLimitSeconds: 60,
    tips: [
      'A small real story works better than a big invented one.',
      'Say what happened, what you did, and what changed.',
      'This question tests natural English, so relax a little here.',
    ],
    modelAnswer:
      'Last year at work we had [real situation]. It was difficult because [reason]. What I did was [action you actually took]. In the end [what happened]. What I learned was [one honest lesson].',
    rubricNotes:
      'Tests spontaneity and natural English rather than credibility. This is the best question for detecting memorisation, because it cannot be predicted. Compare fluency here against the scripted questions.',
  },
  {
    category: 'conversational',
    text: 'Is there anything else you would like to add before we finish?',
    timeLimitSeconds: 45,
    tips: [
      'Do not say "no". Use it.',
      'Add one thing you did not get to say.',
      'Thank them and keep it short.',
    ],
    modelAnswer:
      'Yes, one thing. I would just like to say that I have prepared for this for [time], and [one genuine point you did not get to make]. Thank you for your time.',
    rubricNotes:
      'The standard closing question. A flat "no" wastes the opportunity but is not a credibility failure. Reward one genuine additional point delivered briefly.',
  },
];

export const QUESTIONS: Question[] = RAW.map((q, i) => ({
  ...q,
  id: `q-${String(i + 1).padStart(2, '0')}`,
  vertical: 'uk-precas',
  institutionId: null,
}));

function fill(text: string, inst: Institution): string {
  return text
    .replaceAll('{{university}}', inst.name)
    .replaceAll('{{city}}', inst.city);
}

/** Resolve placeholders for one institution and strip the private rubric. */
export function publicQuestion(q: Question, inst: Institution): PublicQuestion {
  const { rubricNotes: _omit, ...rest } = q;
  return {
    ...rest,
    text: fill(q.text, inst),
    modelAnswer: fill(q.modelAnswer, inst),
    tips: q.tips.map((t) => fill(t, inst)),
  };
}

/** Server-side only. Keeps the rubric attached. */
export function resolvedQuestion(q: Question, inst: Institution): Question {
  return {
    ...q,
    text: fill(q.text, inst),
    modelAnswer: fill(q.modelAnswer, inst),
    tips: q.tips.map((t) => fill(t, inst)),
  };
}

export function getQuestion(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/**
 * Build the question list for a session. Order is fixed at creation so that a
 * resumed session is deterministic. Trial sessions get the first `limit`
 * questions, which are chosen to span the full range of categories rather than
 * being the easy opening ones.
 */
export function buildQuestionPlan(limit: number): string[] {
  if (limit >= QUESTIONS.length) return QUESTIONS.map((q) => q.id);

  // Always open with the introduction, then spread across categories so a
  // trial still shows the student their real weak spots.
  const first = QUESTIONS[0]!.id;
  const rest = QUESTIONS.slice(1);
  const step = rest.length / (limit - 1);
  const picked: string[] = [first];
  for (let i = 0; i < limit - 1; i++) {
    const q = rest[Math.floor(i * step)];
    if (q && !picked.includes(q.id)) picked.push(q.id);
  }
  // Guard against duplicates from rounding.
  let cursor = 0;
  while (picked.length < limit && cursor < rest.length) {
    const q = rest[cursor++]!;
    if (!picked.includes(q.id)) picked.push(q.id);
  }
  return picked;
}
