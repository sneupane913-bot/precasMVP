/**
 * WHERE THESE QUESTIONS COME FROM (N-29, Q-1, Q-2).
 *
 * Nothing in this bank was invented. Every category below maps to a topic area
 * that a UK university or UKVI itself publishes as part of the Pre-CAS /
 * credibility interview, and the wording is adapted from those published
 * examples rather than guessed at.
 *
 * This matters more than it looks. A bank somebody made up would still LOOK
 * like a product: students would practise, get scores, and feel prepared, and
 * we would only find out it was useless when they started failing real
 * interviews. So the sources are recorded here, with dates, and no page may
 * claim these are the questions universities ask unless this block is true.
 *
 * SOURCES, checked 13 August 2026:
 *
 *  [S1] Oxford Brookes University — "UKVI Credibility interviews", the
 *       university's own guidance to its offer holders, listing the five topic
 *       areas and example questions under each.
 *       https://www.brookes.ac.uk/students/isat/visas/student-visa/credibility-interviews
 *
 *  [S2] University of Lincoln — "Pre-CAS Interview | Information for Offer
 *       Holders", confirming the interview format and purpose.
 *       https://www.lincoln.ac.uk/studywithus/internationalstudents/informationforofferholders/pre-casinterview/
 *
 * THE FIVE TOPIC AREAS [S1], and the categories in this file that cover them:
 *
 *   1. Study in the UK          -> why_uk
 *   2. Why this university      -> why_university, accommodation
 *   3. Why this course          -> why_course, education, study_gap
 *   4. Financing your studies   -> finance
 *   5. Post-study plans         -> future_plans, progression
 *
 * Plus identity and conversational, which are how a real interview opens and
 * how an interviewer probes an answer that sounded recited.
 *
 * TWO THINGS [S1] SAYS THAT SHAPE THE WHOLE PRODUCT:
 *
 *   "If you just give general answers that anyone could give, then your visa
 *   application may be refused."  <- this is why N-30 forbids generic feedback.
 *   Coaching a student towards a general answer would be coaching them to fail.
 *
 *   "It is not enough to rely on university rankings."  <- so an answer that
 *   only cites a ranking must score badly on genuineIntent, not well.
 *
 * WHEN ADDING A QUESTION: cite which topic area it belongs to. A question that
 * fits none of them is not a Pre-CAS question, however sensible it sounds.
 */

import type { Institution, Question, PublicQuestion } from '@/lib/types';
import { type AnswerKind, answerSecondsFor, readSecondsFor } from '@/lib/data/timing';

// The question bank. {{university}} and {{city}} are resolved per session, so
// one bank serves every institution and adding institution 7 through 104 needs
// no new question writing.
//
// Model answers are STRUCTURES, written in the simple spoken English a Nepali
// student can actually produce. They are never presented as scripts.
// Rubric notes are private and never leave the server.

type Draft = Omit<
  Question,
  'id' | 'vertical' | 'institutionId' | 'timeLimitSeconds' | 'readSeconds'
> & { answerKind: AnswerKind };

const RAW: Draft[] = [
  {
    category: 'identity',
    text: 'Please introduce yourself briefly.',
    answerKind: 'intro',
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
    answerKind: 'factual',
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
    answerKind: 'explanatory',
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
    answerKind: 'explanatory',
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
    answerKind: 'explanatory',
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
    answerKind: 'explanatory',
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
    answerKind: 'comparative',
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
    answerKind: 'comparative',
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
    answerKind: 'explanatory',
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
    answerKind: 'explanatory',
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
    answerKind: 'explanatory',
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
    answerKind: 'factual',
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
    answerKind: 'comparative',
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
    answerKind: 'explanatory',
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
    answerKind: 'explanatory',
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
    answerKind: 'factual',
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
    answerKind: 'explanatory',
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
    answerKind: 'factual',
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
    answerKind: 'explanatory',
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
    answerKind: 'explanatory',
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
    answerKind: 'explanatory',
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
    answerKind: 'closing',
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

  // ---------------------------------------------------------------------------
  // THE HARVESTED BANK, LOADED 21 AUGUST 2026.
  //
  // Every question below comes from the 17 August research run recorded in
  // PreCAS-question-bank.xlsx and QUESTION-BANK-ARCHITECTURE.md: 33 pages
  // fetched, 534 questions captured verbatim, 401 unique after de-duplication,
  // 226 backed by a university's own .ac.uk page. Nothing here was invented.
  // Wording is genericised ({{university}}, {{city}}) exactly as the header of
  // this file prescribes, and near-duplicates of questions already in the bank
  // above were left out rather than loaded twice.
  //
  // WHY THIS BATCH EXISTS: qa/promise-check.js withdrew the Serious pack
  // (NPR 799, 10 mocks) on 18 August because 22 root questions cannot honestly
  // fill ten sittings of 17. The rule is 3 sittings per bank-of-17, so ten
  // mocks need at least 68 roots. This load takes the bank to 73 roots, which
  // supports 12 sittings, and the pack returns to sale in plans.ts in the same
  // commit. Tips and model-answer structures follow the house rules at the top
  // of this file: simple spoken English, structures never scripts, and the
  // guardrails (never coach concealment, never invent a funding story) apply
  // to every rubric below.
  // ---------------------------------------------------------------------------
  {
    category: 'identity',
    text: 'What do you do at the moment — are you working or studying?',
    answerKind: 'explanatory',
    tips: [
      'Say what fills your weekdays right now: a job, a course, or preparing for this one.',
      'If you work, say the company and your role.',
      'Keep it current. This is about now, not your history.',
    ],
    modelAnswer:
      'At the moment I am working as a [role] at [company] in [city], where I have been for [time]. Alongside that I have been preparing for my studies — my IELTS, my documents, and researching my course at {{university}}.',
    rubricNotes:
      'Wants a concrete current activity with a named employer or institution. Vagueness about their own present life is a strong credibility flag. Cross-check later answers about salary and savings against this.',
  },
  {
    category: 'education',
    text: 'What grades did you get in your last qualification, and which subjects did you do best in?',
    answerKind: 'factual',
    tips: [
      'Say your percentage or GPA plainly. They have your transcript anyway.',
      'Name one or two subjects you were strongest in.',
      'Do not round up. An honest number matches your documents; an improved one does not.',
    ],
    modelAnswer:
      'I finished with [percentage / GPA]. My strongest subjects were [subject] and [subject]. [One sentence on why, for example: I enjoyed the practical work in those classes.]',
    rubricNotes:
      'Factual consistency check against the declared qualification. A student who does not know their own grades is a serious flag. Reward specificity; penalise hedging like "quite good marks".',
  },
  {
    category: 'education',
    text: 'Where did you complete your schooling and your last qualification, and under which board or university?',
    answerKind: 'factual',
    tips: [
      'Name the school or college, the city, and the board or university.',
      'Say the years you started and finished.',
      'Short and exact is the right shape for this answer.',
    ],
    modelAnswer:
      'I did my schooling at [school] in [city] under [board], finishing in [year]. Then I completed my [qualification] at [college], which is affiliated to [university], from [year] to [year].',
    rubricNotes:
      'Pure documents check. Names, places and years must come out fluently — hesitation over their own education history reads as a fabricated history. No credit for extra padding.',
  },
  {
    category: 'education',
    text: 'Have you studied outside your home country before?',
    answerKind: 'factual',
    tips: [
      'Answer yes or no first.',
      'If yes, say where, what, and when, and whether you completed it.',
      'Never hide a previous enrolment abroad. It is on record.',
    ],
    modelAnswer:
      '[No, all my education so far has been in Nepal.] / [Yes, I studied [course] in [country] in [year]. I [completed it / did not complete it because [honest reason]].]',
    rubricNotes:
      'Concealment is the failure mode. An abandoned previous study abroad demands an honest account and connects directly to progression and credibility. A plain "no" is a complete answer.',
  },
  {
    category: 'study_gap',
    text: 'What did you learn in your time away from study that will help you on this course?',
    answerKind: 'explanatory',
    tips: [
      'Pick one or two real skills from your work or your life in the gap.',
      'Link each one to studying: discipline, dealing with people, managing money.',
      'A small true example beats a big vague claim.',
    ],
    modelAnswer:
      'In my [time] working as a [role], I learned [skill, for example: how to manage my own deadlines without anyone chasing me]. I also [second real thing, for example: saved a part of my salary every month]. Both of those matter for living and studying alone in the UK.',
    rubricNotes:
      'Turns the gap from a liability into evidence of maturity, but only with concrete examples. Generic claims of "time management and communication skills" with no incident behind them score low.',
  },
  {
    category: 'study_gap',
    text: 'Why did you not continue your studies immediately after your last qualification?',
    answerKind: 'explanatory',
    tips: [
      'Give the real reason plainly: money, family, work, deciding what to study.',
      'Then say what changed to make now the right time.',
      'Do not apologise for the gap. Explain it.',
    ],
    modelAnswer:
      'When I finished in [year], [honest reason: my family needed me to work / I wanted to be sure before spending this much money / I needed to save first]. I spent that time [what you actually did]. Now [what changed], which is why this is the right moment.',
    rubricNotes:
      'The unexplained gap is a standard refusal ground. Wants a specific reason plus a trigger for returning now. An answer that treats the gap as shameful and rushes past it scores worse than one that owns it.',
  },
  {
    category: 'why_uk',
    text: 'What do you know about studying and living in the UK?',
    answerKind: 'explanatory',
    tips: [
      'Show you have researched real, practical things: teaching style, weather, costs, part-time rules.',
      'Two or three concrete facts are enough.',
      'Facts you can act on beat compliments about the country.',
    ],
    modelAnswer:
      'I know the teaching is more independent than in Nepal — fewer lecture hours and more of my own reading and coursework. I know living costs outside London are around [amount] a month, and that on a Student visa I can work up to [number] hours a week in term time. I have also looked at how students open a bank account and register with a doctor when they arrive.',
    rubricNotes:
      'Preparation check. Reward specific, checkable facts (costs, work-hour rules, teaching format). "The UK has a very good education system" alone scores zero — that is the exact generic answer [S1] warns about.',
  },
  {
    category: 'why_uk',
    text: 'Studying in the UK costs much more than studying at home. Why is it worth it for you?',
    answerKind: 'comparative',
    tips: [
      'Treat it as an investment question. Compare the cost with what the degree earns you.',
      'Give real numbers if you can: the fee, and the salary difference it makes.',
      'End with the one thing the UK course gives that the cheaper option does not.',
    ],
    modelAnswer:
      'The whole course will cost my family about [amount]. In Nepal the same subject would cost less, but [one concrete difference: it does not include a placement / it is not recognised by [professional body] / the specialisation does not exist]. With this degree I can work as a [job], where the salary is around [amount] — without it, around [amount]. So the extra cost pays back within [rough time], and that is why we decided it is worth it.',
    rubricNotes:
      'This is the return-on-investment question and the strongest single test of a genuine student. Wants arithmetic that roughly holds together. An answer with no numbers, or numbers that cannot repay the spend, is a serious flag. Never supply figures to the student; if theirs are missing, tell them to sit with their family and work it out.',
  },
  {
    category: 'why_uk',
    text: 'Why are you applying for this intake rather than an earlier or a later one?',
    answerKind: 'explanatory',
    tips: [
      'Give the practical reason: funds ready, results out, course start dates.',
      'If you missed an earlier intake, say why honestly.',
      'One clear reason is enough.',
    ],
    modelAnswer:
      'I chose the [month] [year] intake because [real reason: my results came in [month] / we needed time to arrange the funds / this course only starts in [month]]. Waiting for the next intake would mean [what it would cost you], so this one is the right timing for my plan.',
    rubricNotes:
      'Coherence check between their history and the application date. An intake choice that contradicts the gap story or the funding story is the contradiction to catch. Any plain practical reason is acceptable.',
  },
  {
    category: 'why_uk',
    text: 'What challenges do you expect as an international student, and how will you deal with them?',
    answerKind: 'explanatory',
    tips: [
      'Name two real challenges: money pressure, being alone, the weather, the teaching style.',
      'For each, say your plan in one sentence.',
      'Saying "no challenges" sounds unprepared, not confident.',
    ],
    modelAnswer:
      'The first challenge will be managing everything alone — cooking, budgeting, deadlines. I have already [what you have done: started cooking at home / made a monthly budget]. The second will be the different teaching style, with much more independent reading. My plan is to use the university’s [support service] in the first semester and not wait until I am struggling.',
    rubricNotes:
      'Maturity check. Wants honest anticipation plus a plan, ideally naming a real university support service. A student who claims there will be no difficulties has not thought about it, and the feedback should say so kindly.',
  },
  {
    category: 'why_university',
    text: 'How did you first find out about {{university}}?',
    answerKind: 'explanatory',
    tips: [
      'Tell the true story: a consultancy, a friend, your own research, a fair.',
      'If an agent suggested it, say so — then show the research YOU did afterwards.',
      'The research you did yourself is the part that earns marks.',
    ],
    modelAnswer:
      'I first heard about it from [honest source: my consultancy / a senior from my college who studies there / an education fair in [city]]. After that I researched it myself — I went through the course page, checked the modules, watched campus videos, and compared it with [other university] before deciding.',
    rubricNotes:
      'Honesty about an agent is fine and common; what matters is evidence of the student’s OWN research afterwards. "My consultancy chose it" with nothing personal added is the classic non-genuine signal.',
  },
  {
    category: 'why_university',
    text: 'Which other universities did you apply to, and what offers did you receive?',
    answerKind: 'explanatory',
    tips: [
      'Name the universities you actually applied to. Applying to several is normal.',
      'Say which gave you offers.',
      'Then one sentence: why this one won.',
    ],
    modelAnswer:
      'I applied to [university] and [university] as well as {{university}}. I received offers from [which ones]. I chose {{university}} because [one specific reason: the module on [module] / the placement year / the location and living costs in {{city}}].',
    rubricNotes:
      'Consistency check against the application record, which the university holds. "This was my only choice" is usually untrue and sounds coached. Wants named alternatives and one distinctive deciding reason.',
  },
  {
    category: 'why_university',
    text: 'Do you know anyone who has studied at {{university}} or who lives in the UK?',
    answerKind: 'factual',
    tips: [
      'Answer honestly. Having contacts there is normal and is not held against you.',
      'If yes, say who and what they told you.',
      'Hiding a relative in the UK is far worse than having one.',
    ],
    modelAnswer:
      '[Yes — a senior from my college is in the second year there. He told me [one real thing about the course or city].] / [I do not know anyone at {{university}}, but [relative/friend] lives in [UK city]. My accommodation and study plans do not depend on them.] / [No, I do not know anyone in the UK yet.]',
    rubricNotes:
      'ABSOLUTE GUARDRAIL: never coach concealment of UK contacts or relatives — UKVI can hold this information, and a discovered omission is fatal. A declared contact with a sensible boundary (not living with them, not depending on them) is a fine answer.',
  },
  {
    category: 'why_university',
    text: 'How big is {{university}}, and what kind of university is it?',
    answerKind: 'factual',
    tips: [
      'Roughly how many students, and what it is known for.',
      'Say when it became a university if you know.',
      'Two or three facts show you looked it up. That is the whole point.',
    ],
    modelAnswer:
      '{{university}} has around [number] students, including a large international community. It is known for [what it is actually known for: practical, career-focused courses / its [subject] school]. The main campus is in {{city}}.',
    rubricNotes:
      'Research-depth check. Any two checkable facts score. Beware invented facts — a wrong "founded in" date or an invented ranking is worse than saying less. Do not reward ranking-only answers.',
  },
  {
    category: 'why_university',
    text: 'What support does {{university}} offer international students?',
    answerKind: 'explanatory',
    tips: [
      'Name one or two real services: the international office, careers service, academic skills support.',
      'Say which one YOU expect to use and why.',
      'This is on the university website. Read it before your real interview.',
    ],
    modelAnswer:
      'They have an international student support team that helps with arrival, visas and settling in, and an academic skills service for essay writing and referencing. The one I expect to use most is [service], because [honest reason, for example: UK-style academic writing will be new for me].',
    rubricNotes:
      'Wants named services plus a personal connection to one of them. A list recited with no personal link scores lower than one service genuinely reasoned about.',
  },
  {
    category: 'why_university',
    text: 'Why {{university}}, when other universities offer the same course?',
    answerKind: 'comparative',
    tips: [
      'This is the sharpest version of "why here". Prepare it properly.',
      'Find the one thing about this course at THIS university that the others do not have.',
      'Cost and location are honest reasons. Use them with something academic.',
    ],
    modelAnswer:
      'I compared this course at {{university}} with the same course at [university]. The difference that decided it was [one concrete thing: this one includes [module or placement] / it has [accreditation] / the assessment is coursework-based, which suits how I work]. Living costs in {{city}} also fit my budget better than [other city], which matters because my funding plan has to last the whole course.',
    rubricNotes:
      'The claim must be DISTINCTIVE: a reason true of every university in the peer set ("good teaching", "diverse environment") scores zero. A checkable differentiator plus an honest practical reason is the strongest shape.',
  },
  {
    category: 'why_course',
    text: 'How is your course structured — what happens in each semester or term?',
    answerKind: 'factual',
    tips: [
      'Say how many semesters or terms, and roughly what each contains.',
      'Mention the dissertation or final project if there is one.',
      'This is on the course page. Reading it is the preparation.',
    ],
    modelAnswer:
      'The course runs over [number] semesters. In the first I study [modules or theme]; in the second [modules or theme]; and the final part is [dissertation / project / placement]. Assessment is mostly [coursework / exams / both].',
    rubricNotes:
      'Research-depth check, one level deeper than naming modules. Approximate structure fluently given scores high; total ignorance of the shape of their own year is a serious flag.',
  },
  {
    category: 'why_course',
    text: 'How long is your course, and what exact qualification will you hold when you finish?',
    answerKind: 'factual',
    tips: [
      'Say the length and the full award name, for example "MSc in ...".',
      'Say the level if you know it: RQF 7 for a master’s, 6 for a bachelor’s.',
      'Short, exact, done.',
    ],
    modelAnswer:
      'It is a [length] course. When I graduate I will hold a [full award name, for example: MSc in International Business] from {{university}}, which is an RQF level [number] qualification.',
    rubricNotes:
      'Factual. The award name should match the offer letter. Wrong level or wrong award name is a progression flag; a crisp correct answer is done in fifteen seconds and that is fine.',
  },
  {
    category: 'why_course',
    text: 'Does your course carry any professional recognition, accreditation or placement?',
    answerKind: 'factual',
    tips: [
      'Check the course page for named bodies: ACCA, CIMA, BCS, CMI and similar.',
      'If there is a placement, say whether it is guaranteed or competitive. Be exact.',
      'If there is none, say so honestly — do not invent one.',
    ],
    modelAnswer:
      '[Yes — the course is accredited by [body], which gives [what it actually gives, e.g. exemptions from [number] papers].] / [It offers an optional placement year, which is competitive rather than guaranteed, and I plan to apply for it.] / [It does not carry a professional accreditation; I chose it for [honest reason] instead.]',
    rubricNotes:
      'TRAP QUESTION per the research: "guaranteed placement" claims where the placement is optional and competitive are a documented false-specificity failure. An honest "no accreditation, and here is why I still chose it" scores better than an invented body.',
  },
  {
    category: 'why_course',
    text: 'Which other courses did you consider before choosing this one?',
    answerKind: 'comparative',
    tips: [
      'Name one or two real alternatives you looked at.',
      'Say what made you rule them out.',
      'Choosing between real options is what genuine research looks like.',
    ],
    modelAnswer:
      'I also considered [course] and [course]. I ruled out [course] because [reason: too theoretical for my goal / it did not cover [topic]]. This course won because [the one thing it has that serves your plan].',
    rubricNotes:
      'Wants evidence of a real decision, not a single option handed over by an agent. A named alternative plus one decision criterion is a full answer. "This was the only course I ever wanted" sounds scripted.',
  },
  {
    category: 'why_course',
    text: 'What were the entry requirements for your course, and how did you meet them?',
    answerKind: 'factual',
    tips: [
      'Say the academic requirement and the English requirement.',
      'Then your own numbers next to them.',
      'Knowing what you were measured against shows you read your own offer.',
    ],
    modelAnswer:
      'The course asks for [academic requirement] and an IELTS of [band] overall. I have [your qualification and grade] and I scored [your IELTS], so I meet both. My offer [was unconditional / had the condition of [condition], which I have now met].',
    rubricNotes:
      'Documents check. The numbers must match the offer letter and the CAS. Fluency here is cheap for a genuine student and hard for a coached one; hesitation over their own IELTS band is a flag.',
  },
  {
    category: 'why_course',
    text: 'What will you do if the course turns out to be harder than you expected?',
    answerKind: 'explanatory',
    tips: [
      'Name the real support: module tutors, academic skills service, classmates.',
      'Say the habit that stops small problems becoming big ones — asking early.',
      'Do not claim it will not be hard. It will be, sometimes, for everyone.',
    ],
    modelAnswer:
      'I expect parts of it to be hard — especially [honest area, e.g. academic writing]. If I am struggling, I will go to my module tutor early rather than waiting for the exam, and use the university’s [academic support service]. I did something similar in my bachelor’s when [small true example].',
    rubricNotes:
      'Resilience and realism check. Wants named support channels and an ask-early habit, ideally with one past example. Overconfidence ("I will not find it hard") is the weak answer here.',
  },
  {
    category: 'why_course',
    text: 'What do you already know about the subject you are about to study?',
    answerKind: 'explanatory',
    tips: [
      'Show the foundation you bring: subjects studied, work done, things read.',
      'Name one current topic or trend in the field.',
      'This proves the course is a step on a path, not a ticket.',
    ],
    modelAnswer:
      'From my bachelor’s I know [foundation topics]. At work I used [related real experience]. I also follow the field — for example, [one current trend or topic, e.g. how [industry] in Nepal is adopting [thing]] — and that is exactly the area the module on [module] covers.',
    rubricNotes:
      'Genuine-interest check. A current, checkable trend plus a personal foundation scores highest. A student who can say nothing about a subject they are spending this much money on is a major flag.',
  },
  {
    category: 'progression',
    text: 'How is this course a clear step up from what you have already studied?',
    answerKind: 'explanatory',
    tips: [
      'Compare levels: what your last qualification was, what this one is.',
      'Name the new things it adds: deeper specialisation, research, placement.',
      'One honest sentence on why you need the step.',
    ],
    modelAnswer:
      'My bachelor’s was a level [number] qualification, broad across [field]. This is a level [number] course, specialised in [area], and it adds [what is genuinely new: a dissertation with real research / the module on [module] / industry work]. I need that step because the roles I am aiming for ask for [the specific capability].',
    rubricNotes:
      'Progression logic is a formal UKVI consideration. Wants correct levels and named new content. A same-level or sideways move needs the career justification to carry it; check coherence with the future-plans answers.',
  },
  {
    category: 'finance',
    text: 'How much are your tuition fees, and how much have you already paid?',
    answerKind: 'factual',
    tips: [
      'Say the full fee, the deposit paid, and what remains.',
      'These numbers are on your offer and your CAS. Know them cold.',
      'Getting your own fee wrong is one of the worst possible answers.',
    ],
    modelAnswer:
      'My tuition fee is [amount] pounds for the course. I have paid a deposit of [amount], so [amount] remains, which [is due by [date] / we will pay before I travel].',
    rubricNotes:
      'The single most rehearsable factual answer, and still commonly failed. Numbers must reconcile with the funding story elsewhere in the sitting. Any vagueness about their own fee is a serious flag.',
  },
  {
    category: 'finance',
    text: 'Can you pay your tuition fees in full, and when is the rest of the money due?',
    answerKind: 'factual',
    tips: [
      'Say plainly whether the full fee is ready now or paid in instalments.',
      'If instalments, say the plan: how much, when, from where.',
      'A clear payment plan is a good answer. A vague "we will manage" is not.',
    ],
    modelAnswer:
      'Yes. [The full fee is ready in my [relation]’s account.] / [We have paid [amount] and the remaining [amount] is due in [month]; it will come from [source], which is already arranged.] The money has been in place since [rough time].',
    rubricNotes:
      'Wants a definite payment plan with dates and sources. "We will arrange it somehow" is one of the strongest refusal signals in the finance theme. Never help construct a plan that does not exist; direct the student to settle the real plan with their family.',
  },
  {
    category: 'finance',
    text: 'Besides your main sponsor, do you have any other funding — savings, scholarships, or family support?',
    answerKind: 'explanatory',
    tips: [
      'Map the full picture: sponsor, your own savings, any scholarship, any second supporter.',
      'Name amounts roughly. A picture with numbers is believable.',
      'If it is one sponsor only, say that plainly — that is also a complete answer.',
    ],
    modelAnswer:
      'My main sponsor is my [relation]. On top of that, [I have my own savings of about [amount] from my job / I received a [name] scholarship of [amount] from the university / my [relation] will support my living costs]. / [It is my [relation] alone, and their income and savings cover the whole plan.]',
    rubricNotes:
      'Completeness check on the funding map. A scholarship claim must be checkable (name and amount). Watch for a second "supporter" invented to plug an obvious gap — coherence with the sponsor answer is the test.',
  },
  {
    category: 'finance',
    text: 'Do you know how much money you must show for living costs, and is it ready?',
    answerKind: 'factual',
    tips: [
      'Know the UKVI maintenance figure for your city — London and outside London differ.',
      'Say how many months it must sit in the account before you apply.',
      'Then say where that money is right now.',
    ],
    modelAnswer:
      'Yes — for {{city}}, which is [inside / outside] London, I must show [amount] per month for nine months, so about [total]. The money is in [whose] account at [bank] and has been there for [time], which covers the 28-day requirement.',
    rubricNotes:
      'Hard factual check with a real trap: quoting the London figure for a non-London campus (or the reverse) is the documented band error. The 28-day seasoning rule should be known. Do not supply the figures — a student who lacks them must be sent to check UKVI guidance.',
  },
  {
    category: 'finance',
    text: 'Will you have access to this money for your whole time in the UK? Whose name is the account in?',
    answerKind: 'explanatory',
    tips: [
      'Say whose account holds the funds and your relationship to them.',
      'Explain how money will actually reach you each month.',
      'This tests whether the funds are genuinely available, not borrowed for show.',
    ],
    modelAnswer:
      'The funds are in my [relation]’s account. Yes — this is our family’s own money, so it stays available for my whole course. Each month my [relation] will send about [amount] through [channel]. Nothing was borrowed to show a balance.',
    rubricNotes:
      'The show-money question. Funds parked briefly to pass a check is the exact fraud pattern this probes. An answer describing a sustainable monthly flow scores; nervousness about whether the money will "stay" is the flag. GUARDRAIL: if the transcript suggests borrowed show money, the feedback must warn plainly that this is discovered and is fatal, never help disguise it.',
  },
  {
    category: 'finance',
    text: 'How will your family manage their own living costs while also paying for your studies?',
    answerKind: 'explanatory',
    tips: [
      'Say roughly what your family earns and spends in a month.',
      'Show there is room: income minus their costs still covers your plan.',
      'Naming other earners in the family strengthens the answer.',
    ],
    modelAnswer:
      'My [relation] earns about [amount] a month, and our household spends about [amount]. My [other family members’ income, if any] also comes in. The education fund is separate — [savings / income source] — so paying my fees does not touch what the family lives on.',
    rubricNotes:
      'Plausibility arithmetic: sponsor income minus dependants’ costs must leave room for the remittances claimed elsewhere. This catches funding stories that each sound fine alone but cannot coexist. Never propose numbers; test coherence of theirs.',
  },
  {
    category: 'finance',
    text: 'Have you checked the refund policy — what happens to your money if your visa is refused?',
    answerKind: 'factual',
    tips: [
      'Read the refund policy on the university website before the real interview.',
      'Know what happens to the deposit and any prepaid fees on a visa refusal.',
      'One sentence shows you and your family protected yourselves.',
    ],
    modelAnswer:
      'Yes. If the visa is refused, {{university}} refunds [what their policy actually says, e.g. the deposit minus an administration fee] once I show the refusal letter. We checked this before paying, because it is a large amount of my family’s money.',
    rubricNotes:
      'Diligence check. A family risking this much money without reading the refund terms suggests the money story is not real. Any accurate account of the policy scores; "I did not check" earns the direct feedback to go and check.',
  },
  {
    category: 'finance',
    text: 'Do you plan to work part-time in the UK, and does your budget depend on it?',
    answerKind: 'explanatory',
    tips: [
      'It is fine to plan part-time work within the visa rules.',
      'The critical sentence: your funding does NOT depend on it.',
      'Say the hours limit to show you know the rule.',
    ],
    modelAnswer:
      'I may work part-time — up to [number] hours a week in term time, which is what my visa allows — mainly for experience and some extra spending money. But my budget does not depend on it: my tuition and living costs are fully covered by [funding source] whether I work or not.',
    rubricNotes:
      'The trap is dependence: a budget that needs UK wages to close is a refusal ground. Wants the correct hours cap and an explicit statement of independence from part-time income. Work framed as the purpose of coming is a fail.',
  },
  {
    category: 'finance',
    text: 'Who decided the budget for your studies, and how was the decision made at home?',
    answerKind: 'explanatory',
    tips: [
      'Tell the true story of the family decision: who sat down, what was compared.',
      'Mention what you compared the cost against.',
      'A real family decision has details. Give one or two.',
    ],
    modelAnswer:
      'It was a family decision. My [relation] and I sat down [rough time] ago, listed the full cost — fees, living, travel — and compared it with [the alternative: studying at home / a different country]. We decided it was worth it because [the reason from your ROI thinking], and we planned where each part of the money comes from.',
    rubricNotes:
      'Genuineness check on the funding narrative. Real decisions come with texture (when, who, what was compared); a story with none is likely constructed. Cross-check the alternatives mentioned here against the why-UK answers.',
  },
  {
    category: 'accommodation',
    text: 'What research have you done on accommodation — what did you compare, and what will it cost?',
    answerKind: 'explanatory',
    tips: [
      'Name two options you actually compared, with weekly or monthly prices.',
      'Say which you chose and why.',
      'The comparison is the evidence. One price alone is a guess.',
    ],
    modelAnswer:
      'I compared university halls at about [amount] a week including bills with a shared private flat at about [amount] plus bills. For my first year I chose [option] because [reason: easier when arriving / cheaper over the year]. I found the prices on [where: the university accommodation page / a lettings site].',
    rubricNotes:
      'Wants two named options with figures and a stated source. This is a research question wearing a housing question’s clothes. Reconcile the chosen figure with the monthly living budget given elsewhere.',
  },
  {
    category: 'accommodation',
    text: 'Will you live on campus or off campus, and why?',
    answerKind: 'explanatory',
    tips: [
      'Either answer is fine. The "why" is what is being marked.',
      'Give one practical reason: cost, distance, settling in, safety.',
      'Say what happens after the first year if your plan changes.',
    ],
    modelAnswer:
      'For the first [period] I plan to live [on campus in halls / off campus in a shared flat], because [practical reason]. After I know the city, I [will look for a shared flat to cut costs / may stay if it works well]. It is about [time] from my classes.',
    rubricNotes:
      'Low stakes, tests planning. Any concrete, costed choice with a reason is a pass. "I have not thought about it yet" is the preparation flag.',
  },
  {
    category: 'accommodation',
    text: 'What do you know about the cost of living in {{city}} compared with other UK cities?',
    answerKind: 'comparative',
    tips: [
      'Know whether your city is cheaper or dearer than London, and roughly by how much.',
      'Give one or two of your own budgeted numbers.',
      'This shows your budget was built for YOUR city, not copied from a template.',
    ],
    modelAnswer:
      '{{city}} is [cheaper than London / one of the more expensive cities because it is London]. Rent for a student room is around [amount] a month against [amount] in [comparison city]. My budget of [amount] a month was built on {{city}} prices, which I checked on [source].',
    rubricNotes:
      'The maintenance-band trap in conversational form: a budget quoting the wrong city’s prices is the tell of a template answer. Reward city-specific figures with a named source.',
  },
  {
    category: 'accommodation',
    text: 'Who will you live with in the UK, and do you have relatives there?',
    answerKind: 'factual',
    tips: [
      'Answer both halves honestly: your living plan, and any relatives in the UK.',
      'If a relative is there, say plainly whether you will live with them or not.',
      'Never hide a relative. That record exists.',
    ],
    modelAnswer:
      '[I will live in halls / a shared flat with other students.] [I have no relatives in the UK.] / [My [relation] lives in [city]; I will not be living with them because my university is in {{city}}, but it is good to have family in the country.]',
    rubricNotes:
      'GUARDRAIL: never coach concealment of UK relatives. A declared relative with a clear independent living plan is fine. An accommodation plan that quietly depends on an undeclared relative is the pattern to warn about — honestly, not by helping to hide it.',
  },
  {
    category: 'accommodation',
    text: 'This will be your first time living alone. How will you manage daily life — cooking, laundry, budgeting?',
    answerKind: 'explanatory',
    tips: [
      'Give real evidence you have started preparing: cooking at home, handling money.',
      'One honest weakness plus a plan beats claiming you are ready for everything.',
      'This is a genuine question. Real interviews ask it to hear natural English.',
    ],
    modelAnswer:
      'I have been preparing — for the last [time] I have been [cooking some meals at home / managing my own salary and expenses]. Cooking dal bhat I can manage; my weak point is [honest one, e.g. cooking for busy weeks], so my plan is [simple plan]. For money I will keep a weekly budget of [amount] and track it.',
    rubricNotes:
      'Tests spontaneity and maturity more than facts. A specific, slightly imperfect, human answer scores best. This is also a strong fluency comparison point against the rehearsed finance answers.',
  },
  {
    category: 'immigration',
    text: 'What are the conditions of a UK Student visa — what are you allowed and not allowed to do?',
    answerKind: 'explanatory',
    tips: [
      'Know the big ones: work-hour limits, attendance, no public funds.',
      'Say what happens if conditions are broken — you know, and you take it seriously.',
      'Three correct conditions are enough.',
    ],
    modelAnswer:
      'On a Student visa I can work up to [number] hours a week in term time and full time in vacations, but I cannot [claim public funds / take a permanent full-time job]. I must attend my course — the university reports attendance to UKVI, and breaking the conditions can cancel the visa. My study is the purpose, so my plan is built around those rules.',
    rubricNotes:
      'Compliance knowledge is a direct genuine-student signal. Wants correct work hours for their level, awareness of attendance monitoring, and no public funds. Errors here are serious; the feedback should state the correct rule plainly.',
  },
  {
    category: 'immigration',
    text: 'Have you ever travelled abroad before — for study, work or a visit?',
    answerKind: 'factual',
    tips: [
      'List your real travel history briefly: country, year, purpose.',
      'Never having travelled is completely fine. Say so plainly.',
      'Your passport already tells this story. Match it.',
    ],
    modelAnswer:
      '[Yes — I visited [country] in [year] for [purpose], for [length of time], and returned on time.] / [No, this will be my first time travelling outside Nepal.]',
    rubricNotes:
      'Documents check against the passport. Overstays or mismatches are the risk; a clean "never travelled" is entirely neutral. Keep the answer short — length here signals nerves.',
  },
  {
    category: 'immigration',
    text: 'Do you know what happens to your visa if you stop attending or fail your course?',
    answerKind: 'explanatory',
    tips: [
      'Know that the university must report you, and the visa can be cut short.',
      'Say your plan is attendance first — this is what being a genuine student means.',
      'Serious, short, correct.',
    ],
    modelAnswer:
      'Yes. The university is my visa sponsor, so if I stop attending they must report it to UKVI and my visa can be cancelled, which would mean leaving the UK. If I fail a module there are resits, but attendance is non-negotiable. That is why my plan puts study first.',
    rubricNotes:
      'Tests understanding of sponsorship duties. A student who knows the university reports to UKVI has read seriously. Casualness about attendance is the flag; the correct facts delivered soberly is a full score.',
  },
  {
    category: 'immigration',
    text: 'Are you planning to transfer to a different university after you arrive in the UK?',
    answerKind: 'factual',
    tips: [
      'The honest answer for a genuine applicant is no — you chose this course deliberately.',
      'One sentence about why you would complete here.',
      'Do not over-explain. A long answer to this question sounds defensive.',
    ],
    modelAnswer:
      'No. I chose {{university}} deliberately for [your one reason], and my plan is to complete my course here. I have no intention of transferring.',
    rubricNotes:
      'Screens for the enrol-and-switch pattern. A crisp no with one grounded reason is a complete answer. Hedging ("if something better comes up...") is the flag this question exists to catch.',
  },
  {
    category: 'immigration',
    text: 'Did you use an education consultancy or agent, and what did they help you with?',
    answerKind: 'explanatory',
    tips: [
      'Be honest. Using a consultancy is normal for Nepali students.',
      'Draw the line: they handled process, YOU made the choices.',
      'Show one decision you made yourself, with your own reason.',
    ],
    modelAnswer:
      'Yes, I used [consultancy] in [city]. They helped with the application process and documents. But the decisions were mine — I chose [course] at {{university}} after comparing it with [alternative] myself, because [your reason]. I can explain every choice in my application.',
    rubricNotes:
      'Agent involvement is expected; agent DEPENDENCE is the flag. The test is whether the student owns the reasoning behind their own choices. An answer that outsources the decision ("they selected it for me") must be flagged honestly in feedback.',
  },
  {
    category: 'future_plans',
    text: 'Are you planning to stay in the UK after your course finishes?',
    answerKind: 'explanatory',
    tips: [
      'Be honest. The Graduate Route is legal and you may use it — say so plainly if you plan to.',
      'Then say what comes after that, and where your long-term plan is based.',
      'A hidden settlement plan is the thing this question hunts. Honesty is the strategy.',
    ],
    modelAnswer:
      'After graduating I [plan to apply for the Graduate Route and work in the UK for up to two years to gain experience / plan to return home directly]. That experience as a [role] would [what it adds]. My longer-term plan is [honest plan, e.g. returning to Nepal to [specific goal]], and this course is the foundation for it.',
    rubricNotes:
      'Post-study intention. Using the Graduate Route is lawful and must NOT be penalised; incoherence or concealment is what fails. GUARDRAIL: never coach a student to hide a settlement intention — coach them to build a plan they can state honestly.',
  },
  {
    category: 'future_plans',
    text: 'What will you do if your visa application is refused?',
    answerKind: 'explanatory',
    tips: [
      'Stay calm — this tests composure as much as planning.',
      'Say you would find out the reason, fix it, and reapply if possible.',
      'Show your life does not collapse: you have work and options at home.',
    ],
    modelAnswer:
      'First I would read the refusal letter carefully to understand the exact reason. If it is something fixable — a document, a gap in evidence — I would correct it and reapply for the next intake. Meanwhile I would continue [your current work/study]. It would be a setback, not the end of my plan.',
    rubricNotes:
      'Composure check. A measured, procedural answer scores; panic or "my whole future would be finished" suggests the stakes are settlement rather than study. Also quietly tests whether their home-country life is real.',
  },
  {
    category: 'future_plans',
    text: 'Where do you see yourself five years from now?',
    answerKind: 'explanatory',
    tips: [
      'Name a role, a place, and the step between graduation and there.',
      'Connect it back to this course — one module or skill.',
      'A specific modest plan beats an impressive vague one.',
    ],
    modelAnswer:
      'In five years I want to be working as a [specific role] in [place], ideally at [type of employer]. The path is: finish this course, [first step — e.g. one or two years’ experience], then [next step]. The [module/skill] from this course is exactly what that role needs.',
    rubricNotes:
      'Coherence test across the whole interview: the five-year plan must agree with the course, the finance logic and the post-study answer. Contradictions between this and earlier answers are the finding to report.',
  },
  {
    category: 'future_plans',
    text: 'Are you planning further study after this course, or is this the final qualification you need?',
    answerKind: 'factual',
    tips: [
      'Either answer is fine if it is coherent with your money and your plan.',
      'If yes, say what and why. If no, say what you move to instead.',
      'Keep it short.',
    ],
    modelAnswer:
      '[This is the qualification my career plan needs — after it I move into work as a [role].] / [Possibly — after some years of work I may consider [qualification], but that would be a separate decision later, funded by my own earnings.]',
    rubricNotes:
      'Screens for perpetual-student visa chains. An open-ended study ladder with no funding logic is the flag; a bounded plan, or further study framed as self-funded and later, is fine.',
  },
  {
    category: 'future_plans',
    text: 'What will you do if you cannot find a job in your field straight after graduating?',
    answerKind: 'explanatory',
    tips: [
      'Show a realistic plan B that still uses your degree.',
      'Name a second role or sector your skills transfer to.',
      'Determination plus flexibility is the tone. Desperation is not.',
    ],
    modelAnswer:
      'If the exact role takes time, I would widen the search to [adjacent role or sector], where the same skills apply, and keep building toward [target role]. In Nepal there is also demand for [related work], so I have more than one path. I would rather start one step lower in the right field than wait doing nothing.',
    rubricNotes:
      'Realism check on the career plan. A concrete adjacent path scores well. An answer that quietly relocates the plan to "any job anywhere in the UK" undercuts the study purpose and should be flagged in feedback.',
  },
  {
    category: 'conversational',
    text: 'Tell me about your home town and what you like about it.',
    answerKind: 'explanatory',
    tips: [
      'Relax — this one is about natural English, not credibility.',
      'Two or three real details: what the place is like, what you enjoy there.',
      'Speak the way you would to a new friend, not to an officer.',
    ],
    modelAnswer:
      'I am from [place], which is [what it is like — a busy city / a quiet town near [landmark]]. What I like most is [one real thing — the food, the festivals, my neighbourhood]. Growing up there taught me [one small true thing]. I will miss [honest detail] when I am in the UK.',
    rubricNotes:
      'English-ability and spontaneity sample. Unpredictable, so it cannot be memorised — compare fluency here against the finance answers to detect scripting. Content is nearly unmarkable; naturalness is the whole score.',
  },
  {
    category: 'conversational',
    text: 'What do you enjoy doing outside your studies and work?',
    answerKind: 'explanatory',
    tips: [
      'A real hobby with one detail beats an impressive-sounding list.',
      'It is fine if it is ordinary: football, cooking, time with friends.',
      'Mention whether you will continue it in the UK — societies exist for most things.',
    ],
    modelAnswer:
      'I enjoy [real hobby]. [One concrete detail — I play futsal with my friends every Saturday / I make videos about [topic]]. When I get to {{university}} I want to join the [related society or club], which I saw they have — it will also help me make friends outside my course.',
    rubricNotes:
      'Second spontaneity sample, and a light research check if a real society is named. Score on natural delivery and a concrete detail. An obviously invented prestige hobby reads worse than an ordinary true one.',
  },

  // ---------------------------------------------------------------------------
  // PROBES.
  //
  // A probe is the SECOND question -- the one an interviewer asks after your
  // first answer. "My family is funding me." -> "Where did the money in that
  // account come from?" That second turn is where credibility interviews are
  // actually decided, and a bank of first-level questions alone rehearses a
  // conversation that does not happen.
  //
  // Every probe below was captured verbatim from a published source; 86 of the
  // 112 harvested came from universities' own guidance pages. `probeTrigger`
  // records the kind of first answer that invites it, which is what lets the
  // planner place a probe where it makes sense and what the results page shows
  // the student afterwards.
  //
  // A probe is never asked on its own. See buildQuestionPlan.
  // ---------------------------------------------------------------------------
  {
    category: 'why_uk',
    text: 'Why not study this course in your home country?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a course that is also widely available at home.',
    tips: [
      'Name the thing the UK course has that the Nepali one does not.',
      'One specific difference beats three general ones.',
      'Do not criticise Nepal. Compare the courses, not the countries.',
    ],
    modelAnswer:
      'The same subject is taught in Nepal, but [one concrete difference: the UK course is one year, or it includes a placement, or it carries [accreditation]]. That matters to me because [reason tied to your plan].',
    rubricNotes:
      'Wants ONE concrete difference between the two options. "Better quality" and "more recognised" score zero. Naming an accreditation, a module, a placement or the one-year structure scores high.',
  },
  {
    category: 'why_uk',
    text: 'Which other countries did you consider, and what made you decide on the UK?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student gives a one-line answer about the UK having the best universities.',
    tips: [
      'Name at least one country you actually looked at.',
      'Then give the reason you ruled it out.',
      '"The UK was my only choice" sounds unresearched, not loyal.',
    ],
    modelAnswer:
      'I also looked at [country]. I chose the UK because [one reason: course length, cost, the Graduate Route, a specific university]. [Country] would have meant [the trade-off you rejected].',
    rubricNotes:
      'Wants a real comparison with a named alternative and one decision criterion. An answer with no alternative named is a flag: it suggests an agent chose for them.',
  },
  {
    category: 'why_university',
    text: 'Which other universities did you consider?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says this university was their first and only choice.',
    tips: [
      'Name one or two you genuinely applied to or looked at.',
      'Then say what made you pick this one over them.',
      'It is normal to apply to several. Saying so is not disloyal.',
    ],
    modelAnswer:
      'I also had an offer from [university]. I chose {{university}} because [one specific thing: a module, a facility, an accreditation, the campus location].',
    rubricNotes:
      'Wants a named alternative plus one differentiating reason. Check the reason is actually distinctive: a claim true of every university in the peer set is not a reason.',
  },
  {
    category: 'why_university',
    text: 'What facilities are you expecting at {{university}} for your subject?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says the university has great facilities.',
    tips: [
      'Name a real one. A lab, a studio, a library, a specific building.',
      'If you do not know one, look at the course page before the real interview.',
      'One named facility is worth ten adjectives.',
    ],
    modelAnswer:
      'For my subject there is [named facility]. I am expecting to use it for [the part of the course it serves].',
    rubricNotes:
      'A named, checkable facility scores high. "Modern facilities" and "good labs" score zero. An invented facility is worse than an admission of not knowing.',
  },
  {
    category: 'why_course',
    text: 'What will you actually learn in the modules you just named?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student lists module names without describing their content.',
    tips: [
      'Pick ONE module and say what it covers.',
      'Two sentences is enough.',
      'Naming modules you cannot describe is worse than naming none.',
    ],
    modelAnswer:
      'In [module] we cover [topic] and [topic]. I am most interested in [one of them] because [link to your plan].',
    rubricNotes:
      'Tests whether the module names were memorised or understood. Any content detail scores. Repeating the module title back scores zero.',
  },
  {
    category: 'why_course',
    text: 'Do you know what level your course is at?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names the course without stating its qualification level.',
    tips: [
      'Say the level: RQF 7 for a Master’s, RQF 6 for a Bachelor’s.',
      'Say it is higher than what you have already done, if it is.',
      'This is a short answer. Do not pad it.',
    ],
    modelAnswer:
      'It is a Master’s degree, RQF level 7. My bachelor’s was level 6, so this is a step up.',
    rubricNotes:
      'Factual. Correct level, and awareness that it is above their previous qualification. Getting the level wrong is a serious progression flag.',
  },
  {
    category: 'finance',
    text: 'Where did the money in that bank account come from?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student confirms the maintenance funds are already in the account.',
    tips: [
      'Say whose money it is and how it was earned or saved.',
      'If it was sold land or a loan, say so plainly.',
      'Money that appeared suddenly with no explanation is the single biggest refusal reason.',
    ],
    modelAnswer:
      'The funds are my [relation]’s savings from [source]. They have been in the account since [month].',
    rubricNotes:
      'Wants a traceable origin and a length of time. Vagueness here is the strongest single credibility flag in the whole interview. Honesty about a loan or a land sale scores better than a vague "family savings".',
  },
  {
    category: 'finance',
    text: 'What does your sponsor do, and how many people depend on that income?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a sponsor without describing them.',
    tips: [
      'Job, employer, and roughly what they earn.',
      'Then say how many people that income supports.',
      'Know the number before the interview. Guessing sounds like guessing.',
    ],
    modelAnswer:
      'My [relation] is a [job] at [employer] and earns about [amount] a year. That income supports [number] people including me.',
    rubricNotes:
      'Wants occupation, an income figure and a dependant count that make the funding plausible. An income that cannot cover the fees, with no other explanation, is a fail.',
  },
  {
    category: 'finance',
    text: 'Have you taken a loan? How will you pay it back?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student mentions a bank balance that appeared recently, or an education loan.',
    tips: [
      'If there is a loan, say the amount and the lender.',
      'Then say how you will repay it, with a real salary figure.',
      'Hiding a loan is far worse than having one.',
    ],
    modelAnswer:
      'Yes, [amount] from [bank], secured against [asset]. I plan to repay it from my salary as a [job], which is around [amount] a month in Nepal.',
    rubricNotes:
      'Wants disclosure plus a repayment plan grounded in a real salary. Denying a loan when the balance appeared recently is the classic contradiction interviewers look for.',
  },
  {
    category: 'accommodation',
    text: 'How far is that from campus, and how will you get to class?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student names a hall or an area they will live in.',
    tips: [
      'Say the distance or the journey time.',
      'Say bus, train or walk.',
      'If you do not know yet, say what you will do to find out.',
    ],
    modelAnswer:
      'It is about [number] minutes from campus. I will [walk / take the number [x] bus], which costs about [amount] a week.',
    rubricNotes:
      'Wants a journey time and a mode of travel. Shows the accommodation claim was researched rather than invented on the spot.',
  },
  {
    category: 'accommodation',
    text: 'How much will your accommodation cost each week?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they will stay in university halls.',
    tips: [
      'Give a weekly figure in pounds.',
      'Say whether bills are included.',
      'This number should match the living costs you gave earlier.',
    ],
    modelAnswer:
      'It is about £[amount] a week including bills. Over the year that is about £[amount], which is inside the budget I described.',
    rubricNotes:
      'Cross-check against their stated monthly living costs and their funding. Two figures that do not reconcile is a stronger flag than either figure being high.',
  },
  {
    category: 'study_gap',
    text: 'Why is there such a long gap between your last course and this one?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they were working after graduating.',
    tips: [
      'Give the reason plainly. Work, family, money, health.',
      'Then say what changed to make now the right time.',
      'A gap is normal. An unexplained gap is not.',
    ],
    modelAnswer:
      'I finished in [year] and worked as a [job] to [reason: save money / support my family]. I am returning now because [what changed].',
    rubricNotes:
      'Wants a specific reason and a trigger for returning now. Unexplained years are a standard refusal ground; a plain honest reason scores far better than an impressive vague one.',
  },
  {
    category: 'study_gap',
    text: 'What was your monthly salary in that job?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they worked during the gap.',
    tips: [
      'Give the figure in rupees.',
      'Do not inflate it. It may be checked against your funding story.',
      'Short answer.',
    ],
    modelAnswer:
      'I earned about NPR [amount] a month as a [job] at [employer].',
    rubricNotes:
      'Factual, and a consistency check against the funding claim. A salary that cannot explain the savings they described is a contradiction.',
  },
  {
    category: 'education',
    text: 'Have you studied in the UK before? Why are you studying here again?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student mentions previous international travel or a previous UK qualification.',
    tips: [
      'Answer yes or no first.',
      'If yes, say what and when, and why this is a step up.',
      'Never hide a previous UK visa. It is on record.',
    ],
    modelAnswer:
      '[Yes, I studied [course] at [institution] in [year]. I am returning because [how this course is higher or different].] / [No, this is my first time studying in the UK.]',
    rubricNotes:
      'Previous UK study demands a clear progression argument. Concealment discovered later is fatal; disclosure with a progression reason is fine.',
  },
  {
    category: 'future_plans',
    text: 'What jobs could you actually do after this course?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says the course will improve their career prospects.',
    tips: [
      'Name one or two real job titles.',
      'Name a type of employer, or a real company.',
      '"Good opportunities" is not an answer.',
    ],
    modelAnswer:
      'I am aiming to work as a [job title] at a [type of employer], for example [named company or sector] in [city].',
    rubricNotes:
      'Wants named roles and a named sector or employer. Generic ambition scores zero; a specific role that connects to a named module scores highest.',
  },
  {
    category: 'future_plans',
    text: 'What salary do you expect when you go home?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they will return home to work after graduating.',
    tips: [
      'Give a figure in rupees, monthly or yearly.',
      'Say why the UK degree raises it.',
      'If you took a loan, this number must be able to repay it.',
    ],
    modelAnswer:
      'A [job title] with a UK master’s earns about NPR [amount] a month in Nepal, compared with about [amount] without one.',
    rubricNotes:
      'Wants a plausible figure that justifies the spend and, where a loan exists, can repay it. The return-on-investment arithmetic is what this question is really testing.',
  },
  {
    category: 'immigration',
    text: 'Do you know how many hours you are allowed to work during term time?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says they intend to work part-time while studying.',
    tips: [
      'Know the number for your course level before the interview.',
      'Say that studying comes first.',
      'Do not say you are coming to the UK to work.',
    ],
    modelAnswer:
      'On a Student visa for my course I may work up to [number] hours a week in term time, and full time in the holidays. My study comes first.',
    rubricNotes:
      'Factual and non-negotiable. Getting this wrong, or framing work as the purpose of coming, is a direct hit on genuine-student credibility.',
  },
  {
    category: 'immigration',
    text: 'Have you made any previous visa applications? Were they successful?',
    answerKind: 'probe',
    isProbe: true,
    probeTrigger: 'The student says this is their first UK application, or mentions previous travel.',
    tips: [
      'Answer honestly. Refusals are on record.',
      'If you were refused, say which country, when, and why.',
      'A declared refusal is survivable. A hidden one is not.',
    ],
    modelAnswer:
      '[I have applied for a [country] visa in [year], which was [granted / refused because [reason]].] / [No, this is my first visa application.]',
    rubricNotes:
      'Concealment is the failure mode, not the refusal itself. An honest disclosure with the reason and what changed since scores acceptably; a discovered omission does not.',
  },
];

/**
 * TIMING IS DERIVED, NEVER TYPED IN.
 *
 * `Draft` deliberately has no `timeLimitSeconds`, so it is not possible to add
 * a question whose time contradicts the kind of answer it asks for. Every
 * number comes from lib/data/timing.ts, which carries the published sources.
 *
 * The bank previously held hand-set 45s and 60s limits that nobody had checked.
 * Both sit BELOW the floor of the only per-question specification any UK
 * university publishes (Oxford Brookes: one to two minutes), on a page that
 * also requires "at least two facts or examples" in the answer. You cannot give
 * two facts and a conclusion in 45 seconds, so the product was training
 * students to under-answer the real interview.
 */
export const QUESTIONS: Question[] = RAW.map((q, i) => ({
  ...q,
  id: `q-${String(i + 1).padStart(2, '0')}`,
  vertical: 'uk-precas',
  institutionId: null,
  timeLimitSeconds: answerSecondsFor(q.answerKind),
  readSeconds: readSecondsFor(q.answerKind),
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

/**
 * D-24. Questions the super admin adds, and questions a student asks for.
 *
 * `POST /api/super addQuestion` answered `{"id":"x-...","total":1}` and the
 * question was NEVER ASKED. `extraQuestions` in platform settings had two
 * writers, the admin screen and a student's own drill list, and **no reader
 * anywhere in the interview path** -- `eligiblePool()` and `buildQuestionPlan()`
 * returned only the hardcoded array below. So two separate promises were
 * silently broken, one of them to a student who had paid.
 *
 * Read through a primed cache rather than by making every call site async.
 * `getQuestion` is called from six places including a page render, and turning
 * all of them async to reach one setting would be a far larger change than the
 * bug deserves. Server routes call `primeExtraQuestions()` once at the top; the
 * sync functions then see the merged pool.
 */
let EXTRA: Question[] = [];

export async function primeExtraQuestions(): Promise<void> {
  try {
    const { platform } = await import('@/lib/platform');
    const s = await platform.getSettings();
    EXTRA = (s.extraQuestions ?? []).map((q) => ({
      id: q.id,
      vertical: 'uk-precas' as const,
      institutionId: null,
      category: (q.category as Question['category']) ?? 'conversational',
      text: q.text,
      timeLimitSeconds: 60,
      tips: [],
      modelAnswer: '',
      // The admin writes the intent; it is the private note the evaluator uses
      // and is never sent to the browser.
      rubricNotes: q.intent ?? '',
    }));
  } catch {
    // A settings read failure must never take the question bank down with it.
    EXTRA = [];
  }
}

/** The vetted bank plus anything added since, without a deploy. */
function pool(): Question[] {
  return EXTRA.length ? [...QUESTIONS, ...EXTRA] : QUESTIONS;
}

export function getQuestion(id: string): Question | undefined {
  return pool().find((q) => q.id === id);
}

/**
 * Build the question list for a session. Order is fixed at creation so that a
 * resumed session is deterministic. Trial sessions get the first `limit`
 * questions, which are chosen to span the full range of categories rather than
 * being the easy opening ones.
 */
/**
 * The paper for one sitting (N-26, N-27, Q-4).
 *
 * This used to be fully deterministic: every student on the platform received
 * the same ten questions in the same order. That is the worst possible property
 * for this product. Ten students in one consultancy lab compare notes, memorise
 * the set, and walk into a credibility interview with rehearsed answers — which
 * is the single thing the real interview is designed to catch. We would have
 * been coaching students into failing.
 *
 * So the plan is now **stratified random**, not random:
 *
 *   - it always opens with an introduction question, because a real interview
 *     does, and dropping a student into "how will you fund your studies" as the
 *     first thing they hear is not a rehearsal of anything;
 *   - it then takes one question from each category in turn, so the trial still
 *     spreads across the themes and still diagnoses a genuine weak spot. Pure
 *     shuffling would sometimes hand somebody six finance questions and tell
 *     them nothing about the rest;
 *   - WHICH question fills each slot is random.
 *
 * Randomness is drawn only from the vetted bank (N-27). A student who practises
 * three mocks and then meets nothing familiar has been cheated, and "it was
 * random" is not a defence.
 *
 * The result is stored on the session as `questionIds`, so the paper is fixed
 * at creation and a resume is deterministic (Q-4, N-45). Random once, never
 * random again.
 */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * N-27. Everything the plan can draw from, and nothing else.
 *
 * Randomness is bounded by this function. A question can only appear in a
 * student's paper if it is in the vetted bank — it is never generated, never
 * paraphrased, and never invented to fill a slot. A student who practises three
 * mocks and then meets nothing familiar has been cheated, and "it was random"
 * is not a defence.
 */
export function eligiblePool(): Question[] {
  return pool();
}

/**
 * Questions that can open a topic. Probes are excluded: a probe asked cold
 * ("Where did the money in that account come from?" as question one) is
 * nonsense, and it would also give away that the product does not understand
 * its own material.
 */
function rootPool(): Question[] {
  return pool().filter((q) => !q.isProbe);
}

/** Probes for one category, shuffled. */
function probesFor(category: string): Question[] {
  return shuffled(pool().filter((q) => q.isProbe && q.category === category));
}

export function buildQuestionPlan(limit: number): string[] {
  const QUESTIONS = rootPool();
  if (limit >= QUESTIONS.length) return withProbes(QUESTIONS.map((q) => q.id), limit);

  // Openers first. A real interview starts by asking who you are, so the
  // 'identity' category always fills slot one.
  const openers = QUESTIONS.filter((q) => q.category === 'identity');
  const picked: string[] = [];
  if (openers.length > 0) picked.push(shuffled(openers)[0]!.id);

  // One bucket per category, each internally shuffled.
  const buckets = new Map<string, string[]>();
  for (const q of shuffled(QUESTIONS)) {
    if (picked.includes(q.id)) continue;
    const list = buckets.get(q.category) ?? [];
    list.push(q.id);
    buckets.set(q.category, list);
  }

  // Round-robin across categories so coverage stays even however many we need.
  const order = shuffled([...buckets.keys()]);
  let progress = true;
  while (picked.length < limit && progress) {
    progress = false;
    for (const cat of order) {
      if (picked.length >= limit) break;
      const list = buckets.get(cat);
      if (list && list.length > 0) {
        picked.push(list.shift()!);
        progress = true;
      }
    }
  }
  return withProbes(picked, limit);
}

/**
 * Put probes where an interviewer would put them: straight after an answer on
 * the same topic, never anywhere else.
 *
 * This is deliberately NOT conditional on how the student answered. Branching
 * on a live evaluation would mean the interview could not be planned in
 * advance, and every guard in this product -- resume, entitlement, the stored
 * plan -- assumes a plan that exists before the first question is asked.
 * Placing the probe unconditionally gives the student the real experience of
 * being followed up on, without turning a working state machine into a
 * research project the week we ship.
 *
 * The count is bounded at about a third of the sitting. A mock that is half
 * probes stops being an interview and becomes an interrogation, and the
 * published banks are mostly first-level questions.
 */
function withProbes(rootIds: string[], limit: number): string[] {
  const maxProbes = Math.floor(limit / 3);
  if (maxProbes < 1) return rootIds.slice(0, limit);

  const used = new Set<string>();
  const out: string[] = [];

  for (const id of rootIds) {
    if (out.length >= limit) break;
    out.push(id);

    if (out.length >= limit) break;
    if (used.size >= maxProbes) continue;

    const root = getQuestion(id);
    // The closing question ends the interview. Nothing follows it.
    if (!root || root.answerKind === 'closing' || root.category === 'identity') continue;

    const probe = probesFor(root.category).find((x) => !used.has(x.id));
    if (probe) {
      used.add(probe.id);
      out.push(probe.id);
    }
  }
  return out.slice(0, limit);
}

/**
 * D18 practice mode: one question at a time.
 *
 * A full mock is the exam. Practice is the drill you do between exams, so it is
 * a single question, optionally from the category the student is weakest in.
 * The results page then tells them about that one answer, which is the fastest
 * useful loop in the product.
 */
export function buildPracticePlan(category?: string): string[] {
  // D-24. Practice draws from the merged pool too, or a question the admin
  // added is asked in a mock and never in a drill.
  const all = pool();
  // A probe only makes sense after an answer, so practice draws from roots.
  const roots = all.filter((q) => !q.isProbe);
  const bucket = category ? roots.filter((q) => q.category === category) : roots;
  const from = bucket.length > 0 ? bucket : all;
  const pick = from[Math.floor(Math.random() * from.length)]!;
  return [pick.id];
}

/** Categories that actually have questions, for the practice picker. */
export function practiceCategories(): string[] {
  return [...new Set(pool().map((q) => q.category))];
}
